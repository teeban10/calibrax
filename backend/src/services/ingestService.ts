import fs from "fs";
import { parse } from "csv-parse";
import { and, eq } from "drizzle-orm";
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
  UnitType,
} from "../utils/units";
import { parseBoolean } from '../utils';

type CsvRow = Record<string, string | undefined>;

const toNumber = (value?: string) => parseNumericValue(value ?? null);

const determineCompetitorUnit = (row: CsvRow): {
  type: UnitType | null;
  value: number | null;
  unit: string | null;
} => {
  if (parseBoolean(row["s_has_weight_competitor"])) {
    return {
      type: "weight",
      value: toNumber(row["s_weight_value_competitor"]),
      unit: row["s_weight_unit_competitor"] || null,
    };
  }

  if (parseBoolean(row["s_has_volume_competitor"])) {
    return {
      type: "volume",
      value: toNumber(row["s_volume_value_competitor"]),
      unit: row["s_volume_unit_competitor"] || null,
    };
  }

  if (parseBoolean(row["s_has_count_competitor"])) {
    return {
      type: "count",
      value: toNumber(row["s_count_value_competitor"]),
      unit: row["s_count_unit_competitor"] || null,
    };
  }

  return {
    type: null,
    value: null,
    unit: null,
  };
};

export async function ingestCsv(filePath: string) {
  const parser = fs
    .createReadStream(filePath)
    .pipe(parse({ columns: true, trim: true }));

  let ingestedRows = 0;
  let skippedRows = 0;

  await db.transaction(async (tx) => {
    for await (const row of parser) {
      const diyTitle = row["s_title_diy"];
      const diyVendor = row["s_vendor_diy"];
      const diyDescription = row["s_description_diy"] || null;
      const diyProductUrl = row["s_link_diy"] || null;
      const price =
        toNumber(row["s_price_diy"]) ?? toNumber(row["s_original_price_diy"]);

      if (!diyTitle || !diyVendor || price === null) {
        skippedRows += 1;
        continue;
      }

      const unitType = (row["s_metric_type_diy"] || null) as UnitType | null;
      const unitValue = toNumber(row["s_metric_value_diy"]);
      const unitUnit = row["s_metric_type_unit_diy"] || null;
      const normalizedOurUnitPrice = normalizeUnitPrice(
        price,
        unitType ?? 'item',
        unitValue,
        unitUnit,
      );

      const existingProduct = await tx
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.sourceLink, diyProductUrl), eq(products.vendor, diyVendor)))
        .limit(1);

      let productId = existingProduct[0]?.id;

      if (!productId) {
        const [created] = await tx
          .insert(products)
          .values({
            title: diyTitle,
            description: diyDescription,
            vendor: diyVendor,
            basePrice: price.toString(),
            unitType,
            unitValue: unitValue !== null ? unitValue.toString() : null,
            unitUnit,
            sourceLink: row["s_link_diy"] || null,
            imageUrl: row["s_primary_image_diy"] || null,
          })
          .returning({ id: products.id });

        productId = created.id;
      }

      const competitorPrice = toNumber(row["s_price_competitor"]);
      if (competitorPrice === null) {
        skippedRows += 1;
        continue;
      }

      const competitorUnit = determineCompetitorUnit(row);
      const normalizedCompetitorPrice = normalizeUnitPrice(
        competitorPrice,
        competitorUnit.type ?? 'item',
        competitorUnit.value,
        competitorUnit.unit,
      );

      const [competitor] = await tx
        .insert(competitorProducts)
        .values({
          competitorVendor: row["s_vendor_competitor"] || "unknown",
          title: row["s_title_competitor"] || null,
          price: competitorPrice.toString(),
          unitType: competitorUnit.type,
          unitValue:
            competitorUnit.value !== null
              ? competitorUnit.value.toString()
              : null,
          unitUnit: competitorUnit.unit,
          productUrl: row["s_link_competitor"] || null,
        })
        .returning({ id: competitorProducts.id });

      const matchingScore = toNumber(row["matching_score"]);
      const imageSimilarity = toNumber(row["image_similarity"]);

      const [matchRecord] = await tx
        .insert(productMatches)
        .values({
          productId,
          competitorProductId: competitor.id,
          matchingScore:
            matchingScore !== null ? matchingScore.toString() : null,
          exactMatch: parseBoolean(row["exact_match"]),
          brandMatch: parseBoolean(row["brand_match"]),
          imageSimilarity:
            imageSimilarity !== null ? imageSimilarity.toString() : null,
          matchSource: "csv",
        })
        .returning({ id: productMatches.id });
      if (
        normalizedOurUnitPrice !== null &&
        normalizedCompetitorPrice !== null &&
        matchRecord?.id
      ) {
        await tx.insert(normalizedPrices).values({
          productMatchId: matchRecord.id,
          ourUnitPrice: normalizedOurUnitPrice.toString(),
          competitorUnitPrice: normalizedCompetitorPrice.toString(),
          unitType,
        });
      }

      ingestedRows += 1;
    }
  });

  return { ingestedRows, skippedRows };
}

