import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  competitorProducts,
  normalizedPrices,
  productMatches,
  products,
} from "../db/schema";
import { db } from "../db/client";
import {
  normalizeUnitPrice,
  parseNumericValue,
} from "../utils/units";

type PaginationParams = {
  page: number;
  limit: number;
};

const resolveUnitPrice = (input: {
  normalized?: string | number | null;
  rawPrice?: string | number | null;
  unitType?: string | null;
  unitValue?: string | number | null;
  unitUnit?: string | null;
}) => {
  const normalized = parseNumericValue(input.normalized);
  if (normalized !== null) return normalized;

  const numericPrice = parseNumericValue(input.rawPrice);
  const numericValue = parseNumericValue(input.unitValue);
  return normalizeUnitPrice(
    numericPrice,
    input.unitType ?? null,
    numericValue,
    input.unitUnit ?? null,
  );
};

const computeConfidence = (
  matchingScore: number | null,
  exactMatch: boolean,
): "high" | "medium" | "low" => {
  const score = matchingScore ?? 0;
  if (exactMatch && score >= 0.8) return "high";
  if (score >= 0.6) return "medium";
  return "low";
};

export type OverpricedRow = {
  productId: string;
  competitorProductId: string;
  productTitle: string;
  competitorTitle: string | null;
  ourUnitPrice: number | null;
  competitorUnitPrice: number | null;
  priceIndex: number | null;
  isOverpriced: boolean | null;
  confidence: "high" | "medium" | "low";
  matchingScore: number | null;
  exactMatch: boolean;
};
type GroupedOverpricedProduct = {
  productId: string;
  productTitle: string;
  productPrice: string;
  vendor: string | null;
  competitors: {
    competitorProductId: string;
    competitorTitle: string | null;
    competitorPrice: string;
    ourUnitPrice: number | null;
    competitorUnitPrice: number | null;
    priceIndex: number | null;
    isOverpriced: boolean | null;
    confidence: "high" | "medium" | "low";
    matchingScore: number | null;
    exactMatch: boolean | null;
    competitorVendor: string | null;
  }[];
};
export async function getOverpricedMatchesV2(params: PaginationParams & {
  threshold: number;
  vendor?: string;
  competitorVendor?: string;
}) {
  const offset = (params.page - 1) * params.limit;

  // Step 1: Build where conditions for filtering
  const whereConditions = [];
  if (params.vendor) {
    whereConditions.push(eq(products.vendor, params.vendor));
  }
  if (params.competitorVendor) {
    whereConditions.push(
      eq(competitorProducts.competitorVendor, params.competitorVendor),
    );
  }

  // Step 2: Get paginated unique product IDs
  // Use a subquery to get distinct product IDs ordered by most recent match
  const productIdSubquery = db
    .select({
      productId: productMatches.productId,
      maxCreatedAt: sql<string>`MAX(${productMatches.createdAt})`.as("max_created_at"),
    })
    .from(productMatches)
    .innerJoin(products, eq(productMatches.productId, products.id))
    .innerJoin(
      competitorProducts,
      eq(productMatches.competitorProductId, competitorProducts.id),
    )
    .groupBy(productMatches.productId);

  const productIdSubqueryWithWhere =
    whereConditions.length > 0
      ? productIdSubquery.where(and(...whereConditions))
      : productIdSubquery;

  // Get the subquery results and then fetch distinct product IDs ordered by max created_at
  const productIdResults = await productIdSubqueryWithWhere;
  
  // Sort by maxCreatedAt descending and paginate
  const sortedProductIds = productIdResults
    .sort((a, b) => new Date(b.maxCreatedAt).getTime() - new Date(a.maxCreatedAt).getTime())
    .map((row) => row.productId);
  
  const totalProductIds = sortedProductIds.length;
  const paginatedProductIds = sortedProductIds.slice(offset, offset + params.limit + 1);
  const hasNextPage = paginatedProductIds.length > params.limit;
  const finalProductIds = hasNextPage
    ? paginatedProductIds.slice(0, params.limit)
    : paginatedProductIds;

  // If no products match, return empty result
  if (finalProductIds.length === 0) {
    return {
      data: [],
      pagination: {
        page: params.page,
        limit: params.limit,
        total: totalProductIds,
        hasNextPage: false,
      },
      meta: {
        threshold: params.threshold,
      },
    };
  }

  // Step 3: Fetch all matches for the paginated product IDs
  const matchesWhereConditions = [
    inArray(productMatches.productId, finalProductIds),
  ];
  if (params.vendor) {
    matchesWhereConditions.push(eq(products.vendor, params.vendor));
  }
  if (params.competitorVendor) {
    matchesWhereConditions.push(
      eq(competitorProducts.competitorVendor, params.competitorVendor),
    );
  }

  const matchesQuery = db
    .select({
      matchId: productMatches.id,
      productId: productMatches.productId,
      competitorProductId: productMatches.competitorProductId,
      productTitle: products.title,
      competitorTitle: competitorProducts.title,
      productVendor: products.vendor,
      competitorVendor: competitorProducts.competitorVendor,
      matchingScore: productMatches.matchingScore,
      exactMatch: productMatches.exactMatch,
      brandMatch: productMatches.brandMatch,
      productUnitType: products.unitType,
      productUnitValue: products.unitValue,
      productUnitUnit: products.unitUnit,
      competitorUnitType: competitorProducts.unitType,
      competitorUnitValue: competitorProducts.unitValue,
      competitorUnitUnit: competitorProducts.unitUnit,
      productBasePrice: products.basePrice,
      competitorPrice: competitorProducts.price,
      normalizedOurPrice: normalizedPrices.ourUnitPrice,
      normalizedCompetitorPrice: normalizedPrices.competitorUnitPrice,
    })
    .from(productMatches)
    .innerJoin(products, eq(productMatches.productId, products.id))
    .innerJoin(
      competitorProducts,
      eq(productMatches.competitorProductId, competitorProducts.id),
    )
    .leftJoin(
      normalizedPrices,
      eq(normalizedPrices.productMatchId, productMatches.id),
    )
    .where(and(...matchesWhereConditions))
    .orderBy(desc(productMatches.createdAt));

  const rows = await matchesQuery;

  // Step 4: Use the total from the product ID query (already computed above)
  const total = totalProductIds;

  // Step 5: Enrich rows with pricing calculations
  const enriched = rows.map((row) => {
    const ourUnitPrice = resolveUnitPrice({
      normalized: row.normalizedOurPrice,
      rawPrice: row.productBasePrice,
      unitType: row.productUnitType,
      unitValue: row.productUnitValue,
      unitUnit: row.productUnitUnit,
    });
    const competitorUnitPrice = resolveUnitPrice({
      normalized: row.normalizedCompetitorPrice,
      rawPrice: row.competitorPrice,
      unitType: row.competitorUnitType,
      unitValue: row.competitorUnitValue,
      unitUnit: row.competitorUnitUnit,
    });

    const priceIndex =
      ourUnitPrice !== null &&
      competitorUnitPrice !== null &&
      competitorUnitPrice !== 0
        ? ourUnitPrice / competitorUnitPrice
        : null;

    const isOverpriced =
      priceIndex !== null ? priceIndex > params.threshold : null;

    const matchingScore = parseNumericValue(row.matchingScore);

    return {
      productId: row.productId,
      competitorProductId: row.competitorProductId,
      productTitle: row.productTitle,
      competitorTitle: row.competitorTitle,
      productPrice: row.productBasePrice,
      competitorPrice: row.competitorPrice,
      ourUnitPrice,
      competitorUnitPrice,
      priceIndex,
      isOverpriced,
      vendor: row.productVendor,
      competitorVendor: row.competitorVendor,
      confidence: computeConfidence(matchingScore, row.exactMatch ?? false),
      matchingScore,
      exactMatch: row.exactMatch,
    };
  });

  // Step 6: Group by product ID
  const grouped = new Map<string, GroupedOverpricedProduct>();

  enriched.forEach((row) => {
    const existing = grouped.get(row.productId);

    const competitorEntry = {
      competitorProductId: row.competitorProductId,
      competitorTitle: row.competitorTitle,
      competitorPrice: row.competitorPrice,
      ourUnitPrice: row.ourUnitPrice,
      competitorUnitPrice: row.competitorUnitPrice,
      priceIndex: row.priceIndex,
      isOverpriced: row.isOverpriced,
      confidence: row.confidence,
      matchingScore: row.matchingScore,
      exactMatch: row.exactMatch,
      competitorVendor: row.competitorVendor,
    };

    if (!existing) {
      grouped.set(row.productId, {
        productId: row.productId,
        productTitle: row.productTitle,
        productPrice: row.productPrice,
        vendor: row.vendor,
        competitors: [competitorEntry],
      });
    } else {
      existing.competitors.push(competitorEntry);
    }
  });

  // Step 7: Ensure products are returned in the same order as finalProductIds
  const orderedProducts = finalProductIds
    .map((productId: string) => grouped.get(productId))
    .filter((product): product is GroupedOverpricedProduct => product !== undefined);

  return {
    data: orderedProducts,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      hasNextPage,
    },
    meta: {
      threshold: params.threshold,
    },
  };
}

export async function getOverpricedMatches(params: PaginationParams & {
  threshold: number;
  vendor?: string;
  competitorVendor?: string;
}) {
  const offset = (params.page - 1) * params.limit;

  const whereConditions = [];
  if (params.vendor) {
    whereConditions.push(eq(products.vendor, params.vendor));
  }
  if (params.competitorVendor) {
    whereConditions.push(
      eq(competitorProducts.competitorVendor, params.competitorVendor),
    );
  }

  const query = db
    .select({
      matchId: productMatches.id,
      productId: productMatches.productId,
      competitorProductId: productMatches.competitorProductId,
      productTitle: products.title,
      competitorTitle: competitorProducts.title,
      productVendor: products.vendor,
      competitorVendor: competitorProducts.competitorVendor,
      matchingScore: productMatches.matchingScore,
      exactMatch: productMatches.exactMatch,
      brandMatch: productMatches.brandMatch,
      productUnitType: products.unitType,
      productUnitValue: products.unitValue,
      productUnitUnit: products.unitUnit,
      competitorUnitType: competitorProducts.unitType,
      competitorUnitValue: competitorProducts.unitValue,
      competitorUnitUnit: competitorProducts.unitUnit,
      productBasePrice: products.basePrice,
      competitorPrice: competitorProducts.price,
      normalizedOurPrice: normalizedPrices.ourUnitPrice,
      normalizedCompetitorPrice: normalizedPrices.competitorUnitPrice,
    })
    .from(productMatches)
    .innerJoin(products, eq(productMatches.productId, products.id))
    .innerJoin(
      competitorProducts,
      eq(productMatches.competitorProductId, competitorProducts.id),
    )
    .leftJoin(
      normalizedPrices,
      eq(normalizedPrices.productMatchId, productMatches.id),
    );

  const rows = await (whereConditions.length > 0
    ? query.where(and(...whereConditions))
    : query)
    .orderBy(desc(productMatches.createdAt))
    .limit(params.limit + 1)
    .offset(offset);

  const countQueryBuilder = db
    .select({ total: sql<number>`count(${productMatches.id})` })
    .from(productMatches)
    .innerJoin(products, eq(productMatches.productId, products.id))
    .innerJoin(
      competitorProducts,
      eq(productMatches.competitorProductId, competitorProducts.id),
    );

  const countQuery =
    whereConditions.length > 0
      ? countQueryBuilder.where(and(...whereConditions))
      : countQueryBuilder;

  const countResult = await countQuery;
  const total = Number(countResult[0]?.total ?? 0);
  const hasNextPage = rows.length > params.limit;
  const data = hasNextPage ? rows.slice(0, params.limit) : rows;

  const enriched = data.map((row) => {
    const ourUnitPrice = resolveUnitPrice({
      normalized: row.normalizedOurPrice,
      rawPrice: row.productBasePrice,
      unitType: row.productUnitType,
      unitValue: row.productUnitValue,
      unitUnit: row.productUnitUnit,
    });
    const competitorUnitPrice = resolveUnitPrice({
      normalized: row.normalizedCompetitorPrice,
      rawPrice: row.competitorPrice,
      unitType: row.competitorUnitType,
      unitValue: row.competitorUnitValue,
      unitUnit: row.competitorUnitUnit,
    });

    const priceIndex =
      ourUnitPrice !== null &&
      competitorUnitPrice !== null &&
      competitorUnitPrice !== 0
        ? ourUnitPrice / competitorUnitPrice
        : null;

    const isOverpriced =
      priceIndex !== null ? priceIndex > params.threshold : null;

    const matchingScore = parseNumericValue(row.matchingScore);

    return {
      productId: row.productId,
      competitorProductId: row.competitorProductId,
      productTitle: row.productTitle,
      competitorTitle: row.competitorTitle,
      productPrice: row.productBasePrice,
      competitorPrice: row.competitorPrice,
      ourUnitPrice,
      competitorUnitPrice,
      priceIndex,
      isOverpriced,
      confidence: computeConfidence(matchingScore, row.exactMatch ?? false),
      matchingScore,
      exactMatch: row.exactMatch,
    };
  });

  return {
    data: enriched,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      hasNextPage,
    },
    meta: {
      threshold: params.threshold,
    },
  };
}

type PatternsParams = {
  vendor?: string;
  competitorVendor?: string;
  threshold: number;
  confidenceScope?: "all" | "high";
};

/**
 * Helper function to check if a comparison is high confidence
 * High confidence: exactMatch === true AND matchingScore >= 0.8
 */
function isHighConfidence(
  exactMatch: boolean | null,
  matchingScore: string | number | null,
): boolean {
  if (!exactMatch) return false;
  const score = parseNumericValue(matchingScore) ?? 0;
  return score >= 0.8;
}

/**
 * Helper function to calculate median from an array of numbers
 * Returns null if array is empty
 */
function calculateMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Helper function to categorize price index into severity buckets
 */
function categorizeSeverity(priceIndex: number, threshold: number): {
  acceptable: boolean;
  overpriced: boolean;
  severelyOverpriced: boolean;
} {
  if (priceIndex <= threshold) {
    return { acceptable: true, overpriced: false, severelyOverpriced: false };
  }
  if (priceIndex <= 1.3) {
    return { acceptable: false, overpriced: true, severelyOverpriced: false };
  }
  return { acceptable: false, overpriced: false, severelyOverpriced: true };
}

export async function getPricingPatterns(params: PatternsParams) {
  const whereConditions = [];
  if (params.vendor) {
    whereConditions.push(eq(products.vendor, params.vendor));
  }
  if (params.competitorVendor) {
    whereConditions.push(
      eq(competitorProducts.competitorVendor, params.competitorVendor),
    );
  }

  const confidenceScope = params.confidenceScope ?? "all";

  // Query includes matchingScore and exactMatch for confidence filtering
  const queryBuilder = db
    .select({
      productId: products.id,
      productVendor: products.vendor,
      competitorVendor: competitorProducts.competitorVendor,
      productUnitType: products.unitType,
      productUnitValue: products.unitValue,
      productUnitUnit: products.unitUnit,
      competitorUnitType: competitorProducts.unitType,
      competitorUnitValue: competitorProducts.unitValue,
      competitorUnitUnit: competitorProducts.unitUnit,
      productBasePrice: products.basePrice,
      competitorPrice: competitorProducts.price,
      normalizedOurPrice: normalizedPrices.ourUnitPrice,
      normalizedCompetitorPrice: normalizedPrices.competitorUnitPrice,
      exactMatch: productMatches.exactMatch,
      matchingScore: productMatches.matchingScore,
    })
    .from(productMatches)
    .innerJoin(products, eq(productMatches.productId, products.id))
    .innerJoin(
      competitorProducts,
      eq(productMatches.competitorProductId, competitorProducts.id),
    )
    .leftJoin(
      normalizedPrices,
      eq(normalizedPrices.productMatchId, productMatches.id),
    );

  const query =
    whereConditions.length > 0
      ? queryBuilder.where(and(...whereConditions))
      : queryBuilder;

  const rows = await query;

  // Vendor stats: comparison-weighted overpricing rate
  const vendorStats = new Map<
    string,
    { overpriced: number; total: number }
  >();

  // Vendor product-level stats: unique products that are overpriced at least once
  const vendorProductStats = new Map<
    string,
    { overpricedProductIds: Set<string>; totalProductIds: Set<string> }
  >();

  // Competitor stats: comparison-weighted cheaper rate
  const competitorStats = new Map<
    string,
    { cheaper: number; total: number }
  >();

  // Competitor price index stats: for average and median calculation
  const competitorPriceIndices = new Map<string, number[]>();

  // Competitor severity buckets: counts per severity category
  const competitorSeverityStats = new Map<
    string,
    { acceptable: number; overpriced: number; severelyOverpriced: number }
  >();

  rows.forEach((row) => {
    // Apply high-confidence filter if requested
    // Parse matchingScore from database (numeric type returns as string)
    const matchingScore = parseNumericValue(row.matchingScore);
    if (
      confidenceScope === "high" &&
      !isHighConfidence(row.exactMatch, matchingScore)
    ) {
      return;
    }

    const ourUnitPrice = resolveUnitPrice({
      normalized: row.normalizedOurPrice,
      rawPrice: row.productBasePrice,
      unitType: row.productUnitType,
      unitValue: row.productUnitValue,
      unitUnit: row.productUnitUnit,
    });

    const competitorUnitPrice = resolveUnitPrice({
      normalized: row.normalizedCompetitorPrice,
      rawPrice: row.competitorPrice,
      unitType: row.competitorUnitType,
      unitValue: row.competitorUnitValue,
      unitUnit: row.competitorUnitUnit,
    });

    // Only process rows with valid normalized unit prices
    if (ourUnitPrice === null || competitorUnitPrice === null) return;

    const priceIndex =
      competitorUnitPrice !== 0 ? ourUnitPrice / competitorUnitPrice : null;

    // Vendor-level stats (comparison-weighted)
    const vendor = row.productVendor ?? "unknown";
    const vendorEntry = vendorStats.get(vendor) ?? { overpriced: 0, total: 0 };
    vendorEntry.total += 1;
    if (priceIndex !== null && priceIndex > params.threshold) {
      vendorEntry.overpriced += 1;
    }
    vendorStats.set(vendor, vendorEntry);

    // Vendor product-level stats (deduplicated by product ID)
    const vendorProductEntry = vendorProductStats.get(vendor) ?? {
      overpricedProductIds: new Set<string>(),
      totalProductIds: new Set<string>(),
    };
    vendorProductEntry.totalProductIds.add(row.productId);
    if (priceIndex !== null && priceIndex > params.threshold) {
      vendorProductEntry.overpricedProductIds.add(row.productId);
    }
    vendorProductStats.set(vendor, vendorProductEntry);

    // Competitor stats (comparison-weighted)
    const competitor = row.competitorVendor ?? "unknown";
    const competitorEntry =
      competitorStats.get(competitor) ?? { cheaper: 0, total: 0 };
    competitorEntry.total += 1;
    if (competitorUnitPrice < ourUnitPrice) {
      competitorEntry.cheaper += 1;
    }
    competitorStats.set(competitor, competitorEntry);

    // Track price indices for average/median calculation
    // Only include valid price indices where competitorUnitPrice > 0
    if (priceIndex !== null && competitorUnitPrice > 0) {
      const indices = competitorPriceIndices.get(competitor) ?? [];
      indices.push(priceIndex);
      competitorPriceIndices.set(competitor, indices);
    }

    // Track severity buckets for competitor
    if (priceIndex !== null) {
      const severity = categorizeSeverity(priceIndex, params.threshold);
      const severityEntry = competitorSeverityStats.get(competitor) ?? {
        acceptable: 0,
        overpriced: 0,
        severelyOverpriced: 0,
      };
      if (severity.acceptable) severityEntry.acceptable += 1;
      if (severity.overpriced) severityEntry.overpriced += 1;
      if (severity.severelyOverpriced) severityEntry.severelyOverpriced += 1;
      competitorSeverityStats.set(competitor, severityEntry);
    }
  });

  // Build vendors array with both comparison-weighted and product-level rates
  const vendors = Array.from(vendorStats.entries()).map(([vendor, stats]) => {
    const productStats = vendorProductStats.get(vendor) ?? {
      overpricedProductIds: new Set<string>(),
      totalProductIds: new Set<string>(),
    };
    const totalProducts = productStats.totalProductIds.size;
    const overpricedProducts = productStats.overpricedProductIds.size;
    const productOverpricedRate =
      totalProducts > 0 ? overpricedProducts / totalProducts : 0;

    return {
      vendor,
      overpricedRate: stats.total ? stats.overpriced / stats.total : 0,
      productOverpricedRate,
      totalProducts,
    };
  });

  // Build competitors array with enhanced statistics
  const competitors = Array.from(competitorStats.entries()).map(
    ([competitorVendor, stats]) => {
      const priceIndices = competitorPriceIndices.get(competitorVendor) ?? [];
      const avgPriceIndex =
        priceIndices.length > 0
          ? priceIndices.reduce((sum, idx) => sum + idx, 0) / priceIndices.length
          : null;
      const medianPriceIndex = calculateMedian(priceIndices);
      const severity = competitorSeverityStats.get(competitorVendor) ?? {
        acceptable: 0,
        overpriced: 0,
        severelyOverpriced: 0,
      };

      return {
        competitorVendor,
        cheaperRate: stats.total ? stats.cheaper / stats.total : 0,
        avgPriceIndex,
        medianPriceIndex,
        severity,
        totalComparisons: stats.total,
      };
    },
  );

  return {
    competitors,
    vendors,
    meta: {
      threshold: params.threshold,
      confidenceScope,
    },
  };
}

