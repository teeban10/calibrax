import fs from "fs";
import { parse } from "csv-parse";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import 'dotenv/config';

import {
  products,
  competitorProducts,
  productMatches,
} from "../backend/src/db/schema";

// -----------------------------
// DB SETUP
// -----------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

// -----------------------------
// UNIT NORMALIZATION HELPERS
// -----------------------------
function normalizeWeight(value: number, unit: string): number | null {
  switch (unit.toLowerCase()) {
    case "g":
      return value;
    case "kg":
      return value * 1000;
    default:
      return null;
  }
}

function normalizeVolume(value: number, unit: string): number | null {
  switch (unit.toLowerCase()) {
    case "ml":
      return value;
    case "l":
      return value * 1000;
    default:
      return null;
  }
}

function normalizeUnitPrice(
  price: number,
  unitType: string | null,
  unitValue: number | null,
  unitUnit: string | null
) {
  if (!unitType || !unitValue || !unitUnit) return null;

  let normalizedValue: number | null = null;

  if (unitType === "weight") {
    normalizedValue = normalizeWeight(unitValue, unitUnit);
  } else if (unitType === "volume") {
    normalizedValue = normalizeVolume(unitValue, unitUnit);
  } else if (unitType === "count") {
    normalizedValue = unitValue > 0 ? unitValue : null;
  }

  if (!normalizedValue || normalizedValue <= 0) return null;

  return price / normalizedValue;
}

// -----------------------------
// INGESTION
// -----------------------------
async function ingestCSV(filePath: string) {
  const parser = fs
    .createReadStream(filePath)
    .pipe(parse({ columns: true, trim: true }));
    await db.transaction(async (tx) => {
      for await (const row of parser) {
        try {
          // -----------------------------
          // DIY PRODUCT
          // -----------------------------
          const diyTitle = row["s_title_diy"];
          const diyVendor = row["s_vendor_diy"];
          const diyPrice =
            Number(row["s_price_diy"]) ||
            Number(row["s_original_price_diy"]);
    
          if (!diyTitle || !diyVendor || !diyPrice) {
            console.warn("Skipping row: missing DIY product data");
            continue;
          }
          
          const [product] = await tx
            .insert(products)
            .values({
              title: diyTitle,
              vendor: diyVendor,
              basePrice: diyPrice.toString(), // numeric column expects string
              unitType: row["s_metric_type_diy"] || null,
              unitValue: row["s_metric_value_diy"]
                ? String(Number(row["s_metric_value_diy"]))
                : null,
              unitUnit: row["s_metric_type_unit_diy"] || null,
              sourceLink: row["s_link_diy"] || null,
              imageUrl: row["s_primary_image_diy"] || null,
            })
            .onConflictDoNothing()
            .returning();
    
          const productId = product?.id;
    
          if (!productId) continue;
    
          // -----------------------------
          // COMPETITOR PRODUCT
          // -----------------------------
          const competitorPrice = Number(row["s_price_competitor"]);
          if (!competitorPrice) continue;
    
          const [competitor] = await tx
            .insert(competitorProducts)
            .values({
              competitorVendor: row["s_vendor_competitor"] || "unknown",
              title: row["s_title_competitor"] || null,
              price: competitorPrice.toString(), // numeric -> string
              unitType:
                row["s_has_weight_competitor"] === "true"
                  ? "weight"
                  : row["s_has_volume_competitor"] === "true"
                  ? "volume"
                  : row["s_has_count_competitor"] === "true"
                  ? "count"
                  : null,
              unitValue:
                row["s_weight_value_competitor"] ||
                row["s_volume_value_competitor"] ||
                row["s_count_value_competitor"]
                  ? String(
                      Number(
                        row["s_weight_value_competitor"] ||
                          row["s_volume_value_competitor"] ||
                          row["s_count_value_competitor"],
                      ),
                    )
                  : null,
              unitUnit:
                row["s_weight_unit_competitor"] ||
                row["s_volume_unit_competitor"] ||
                row["s_count_unit_competitor"] ||
                null,
              productUrl: row["s_link_competitor"] || null,
            })
            .returning();
    
          if (!competitor) continue;
    
          // -----------------------------
          // MATCH RECORD
          // -----------------------------
          await tx.insert(productMatches).values({
            productId,
            competitorProductId: competitor.id,
            matchingScore: row["matching_score"]
              ? String(Number(row["matching_score"]))
              : null,
            exactMatch: row["exact_match"] === "true",
            brandMatch: row["brand_match"] === "true",
            imageSimilarity: row["image_similarity"]
              ? String(Number(row["image_similarity"]))
              : null,
            matchSource: "csv",
          });
        } catch (err) {
          console.error("Failed to process row:", err);
        }
      }
    })

  console.log("CSV ingestion completed");
  await pool.end();
}

// -----------------------------
// RUN
// -----------------------------
ingestCSV("./pricing_data.csv").catch(console.error);
