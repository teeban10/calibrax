# Database Schema Design – Retail Pricing Intelligence Platform

This document describes the **database schema** for the Retail Pricing Intelligence Platform and explains how the provided CSV data maps into the database.

The schema is designed to:
- Store **facts**, not business opinions
- Handle messy real-world data
- Support flexible, explainable pricing calculations
- Scale to multiple competitors per product

---

## 1. Important Clarification About the CSV Structure

### Question:
> In a single CSV row, does it contain the product and the competitors?

### Answer:
**Yes.**

Each row in `pricing_data.csv` represents:
- **One internal (DIY) product**
- **Matched against one competitor listing**

This means:
- The same internal product can appear in **multiple rows**
- Each row corresponds to a **different competitor match**

The CSV is therefore a **flattened comparison table**, not a normalized dataset.

---

## 2. Why We Cannot Store the CSV “As-Is”

Storing each CSV row as a single database row would:
- Duplicate product data many times
- Mix facts with derived logic
- Make aggregations and explanations difficult
- Lock us into unknown assumptions made upstream

Instead, we normalize the data into multiple tables.

---

## 3. Core Tables

### 3.1 products (Internal Products)

Represents products sold internally (DIY).

products

id (uuid, pk)
title
description
vendor
base_price
currency
unit_type -- weight | volume | count | null
unit_value
unit_unit -- g, kg, ml, l, pcs
source_link
image_url
created_at

One row = one internal product.

---

### 3.2 competitor_products (Competitor Listings)

Represents individual competitor listings.

competitor_products

id (uuid, pk)
competitor_vendor
title
price
currency
unit_type
unit_value
unit_unit
product_url
created_at


One row = one competitor listing.

---

### 3.3 product_matches (Match & Confidence)

Links internal products to competitor listings with match quality.

product_matches

id (uuid, pk)
product_id (fk -> products.id)
competitor_product_id (fk -> competitor_products.id)
matching_score -- 0.0 to 1.0
exact_match
brand_match
image_similarity
match_source -- csv / manual / future
created_at


This table explains **why** two products are compared.

---

### 3.4 normalized_prices (Optional, Derived but Stable)

Stores normalized unit prices for easier querying.

normalized_prices

id (uuid, pk)
product_match_id (fk -> product_matches.id)
our_unit_price
competitor_unit_price
unit_type
created_at


This table stores deterministic math, not business logic.

---

## 4. What We Intentionally Do NOT Store

The following are **derived at query time** and are not persisted:

- price_index
- is_overpriced
- is_actionable
- pricing patterns
- repricing recommendations

Reason:
- These are business interpretations
- Rules and thresholds change over time
- Avoids re-ingesting data when logic evolves

---

## 5. How a Single CSV Row Maps to the Database

For each row in `pricing_data.csv`:

1. Upsert internal product → `products`
2. Insert competitor listing → `competitor_products`
3. Create match record → `product_matches`
4. Optionally compute and store normalized unit prices

This transforms a **flattened comparison row** into a **clean relational model**.

---

## 6. Why This Schema Works Well

- Prevents data duplication
- Supports multiple competitors per product
- Makes pricing logic explainable
- Enables flexible pattern analysis
- Matches real-world merchandising workflows

---

## 7. Summary

- **Yes**, each CSV row contains one product and one competitor match
- The CSV is a comparison view, not a database schema
- We normalize it into products, competitors, and match tables
- All pricing intelligence is derived dynamically

This schema provides a clean, scalable foundation for pricing analysis and decision support.
