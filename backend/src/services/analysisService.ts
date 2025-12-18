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
};

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

  const queryBuilder = db
    .select({
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

  const vendorStats = new Map<
    string,
    { overpriced: number; total: number }
  >();
  const competitorStats = new Map<
    string,
    { cheaper: number; total: number }
  >();

  rows.forEach((row) => {
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

    if (ourUnitPrice === null || competitorUnitPrice === null) return;

    const priceIndex =
      competitorUnitPrice !== 0 ? ourUnitPrice / competitorUnitPrice : null;

    const vendor = row.productVendor ?? "unknown";
    const vendorEntry = vendorStats.get(vendor) ?? { overpriced: 0, total: 0 };
    vendorEntry.total += 1;
    if (priceIndex !== null && priceIndex > params.threshold) {
      vendorEntry.overpriced += 1;
    }
    vendorStats.set(vendor, vendorEntry);

    const competitor = row.competitorVendor ?? "unknown";
    const competitorEntry =
      competitorStats.get(competitor) ?? { cheaper: 0, total: 0 };
    competitorEntry.total += 1;
    if (competitorUnitPrice < ourUnitPrice) {
      competitorEntry.cheaper += 1;
    }
    competitorStats.set(competitor, competitorEntry);
  });

  const vendors = Array.from(vendorStats.entries()).map(([vendor, stats]) => ({
    vendor,
    overpricedRate: stats.total ? stats.overpriced / stats.total : 0,
    totalProducts: stats.total,
  }));

  const competitors = Array.from(competitorStats.entries()).map(
    ([competitorVendor, stats]) => ({
      competitorVendor,
      cheaperRate: stats.total ? stats.cheaper / stats.total : 0,
      totalComparisons: stats.total,
    }),
  );

  return {
    competitors,
    vendors,
    meta: {
      threshold: params.threshold,
    },
  };
}

