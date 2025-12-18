import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Internal (DIY) products
 * One row = one internal SKU
 */
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),

  title: text("title").notNull(),
  description: text("description"),
  vendor: text("vendor").notNull(),

  basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("MYR"),

  unitType: text("unit_type"), // weight | volume | count | null
  unitValue: numeric("unit_value"),
  unitUnit: text("unit_unit"), // g, kg, ml, l, pcs

  sourceLink: text("source_link"),
  imageUrl: text("image_url"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Competitor listings
 * One row = one competitor product listing
 */
export const competitorProducts = pgTable("competitor_products", {
  id: uuid("id").defaultRandom().primaryKey(),

  competitorVendor: text("competitor_vendor").notNull(),
  title: text("title"),

  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("MYR"),

  unitType: text("unit_type"), // weight | volume | count | null
  unitValue: numeric("unit_value"),
  unitUnit: text("unit_unit"),

  productUrl: text("product_url"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Product match & confidence
 * Explains WHY two products are compared
 */
export const productMatches = pgTable("product_matches", {
  id: uuid("id").defaultRandom().primaryKey(),

  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),

  competitorProductId: uuid("competitor_product_id")
    .notNull()
    .references(() => competitorProducts.id, { onDelete: "cascade" }),

  matchingScore: numeric("matching_score", { precision: 3, scale: 2 }), // 0.00–1.00
  exactMatch: boolean("exact_match").default(false),
  brandMatch: boolean("brand_match").default(false),
  imageSimilarity: numeric("image_similarity", { precision: 3, scale: 2 }),

  matchSource: text("match_source").default("csv"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * OPTIONAL: normalized unit prices
 * Deterministic math, safe to persist
 */
export const normalizedPrices = pgTable("normalized_prices", {
  id: uuid("id").defaultRandom().primaryKey(),

  productMatchId: uuid("product_match_id")
    .notNull()
    .references(() => productMatches.id, { onDelete: "cascade" }),

  ourUnitPrice: numeric("our_unit_price", { precision: 12, scale: 4 }),
  competitorUnitPrice: numeric("competitor_unit_price", {
    precision: 12,
    scale: 4,
  }),

  unitType: text("unit_type"), // normalized unit

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
