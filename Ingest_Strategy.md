# Ingestion Strategy – Retail Pricing Intelligence Platform

This document describes how the system ingests and parses the provided
`pricing_data.csv` file, including:
- What each CSV row represents
- Which columns are kept vs ignored
- How data is normalized and stored
- Why certain fields are intentionally not persisted

The goal is to transform a **flattened comparison dataset** into a clean,
normalized relational model that supports flexible pricing intelligence.

---

## 1. Understanding the CSV Structure

### Key Clarification

Each row in `pricing_data.csv` represents:

- **One internal (DIY) product**
- **Matched against one competitor listing**
- Along with match confidence and precomputed comparison data

This means:
- The same internal product appears in multiple rows
- Each row corresponds to a different competitor match
- The CSV is a **comparison view**, not a database schema

---

## 2. Ingestion Principles

The ingestion pipeline follows these principles:

1. **Store facts, not opinions**
2. **Ignore precomputed business logic**
3. **Normalize duplicated data**
4. **Preserve match confidence**
5. **Defer pricing intelligence to query-time**

The ingestion layer is intentionally “dumb but correct”.

---

## 3. Column Classification Overview

The CSV contains ~77 columns which fall into the following groups:

1. Metadata / CSV artifacts
2. Internal (DIY) product data
3. DIY unit & measurement data
4. Competitor product data
5. Competitor unit & measurement data
6. Match confidence data
7. Precomputed / derived metrics (ignored)

---

## 4. Metadata & Junk Columns (Ignored)

These columns are not ingested:

| Column | Reason |
|------|------|
| `Column 1` | Row index only |
| `Unnamed:*` | CSV artifact |
| `s_currency_diy` | Always null |
| Any fully-null columns | No signal |

---

## 5. Internal (DIY) Product Columns

These columns are mapped into the `products` table.

### Columns to Keep

| CSV Column | DB Field | Notes |
|----------|--------|------|
| `s_title_diy` | products.title | Trim & normalize |
| `s_description_diy` | products.description | Nullable |
| `s_vendor_diy` | products.vendor | Internal brand |
| `s_link_diy` | products.source_link | URL |
| `s_primary_image_diy` | products.image_url | Optional |
| `s_price_diy` | products.base_price | Preferred price |
| `s_original_price_diy` | fallback price | Used if base missing |

### Parsing Rules
- Prefer `s_price_diy` over original price
- Products are **upserted**, not blindly inserted
- Stable identity can be derived from title + vendor (MVP)

---

## 6. DIY Unit & Measurement Columns

These columns describe how the internal product is measured.

### Columns to Keep

| CSV Column | Meaning |
|----------|--------|
| `s_metric_type_diy` | weight / volume / count |
| `s_metric_value_diy` | numeric value |
| `s_metric_type_unit_diy` | g / kg / ml / pcs |

### Parsing Rules
- If any component is missing → unit is set to NULL
- No assumptions are made about correctness
- Missing or inconsistent units reduce match confidence later

---

## 7. Competitor Product Columns

Mapped into the `competitor_products` table.

### Columns to Keep

| CSV Column | DB Field |
|----------|---------|
| `s_price_competitor` | competitor_products.price |
| `s_vendor_competitor` | competitor_vendor |
| `s_link_competitor` | product_url |
| `s_title_competitor` | title |

Each row represents a **single competitor listing**.

---

## 8. Competitor Unit & Measurement Columns

These describe how the competitor product is measured.

### Columns to Keep

| CSV Column |
|----------|
| `s_has_weight_competitor` |
| `s_weight_value_competitor` |
| `s_weight_unit_competitor` |
| `s_has_volume_competitor` |
| `s_volume_value_competitor` |
| `s_volume_unit_competitor` |
| `s_has_count_competitor` |
| `s_count_value_competitor` |
| `s_count_unit_competitor` |

### Parsing Rules
- Only **one unit type** is selected per competitor product
- Multiple units → mark as ambiguous
- Ambiguous or missing units are allowed but treated as low confidence

---

## 9. Match & Confidence Columns

These columns are critical and mapped into `product_matches`.

### Columns to Keep

| CSV Column | DB Field |
|----------|---------|
| `matching_score` | matching_score |
| `exact_match` | exact_match |
| `brand_match` | brand_match |
| `image_similarity` | image_similarity |

These fields explain **why** two products are compared.

---

## 10. Precomputed / Derived Columns (Ignored)

The following columns are intentionally **not stored**:

- `price_index`
- `normalised_price_index`
- `s_price_per_unit_*`
- `s_price_per_unit_combined_*`
- `s_price_per_unit_*_upper`
- `s_price_per_unit_*_lower`
- `selected_competitor_products`
- `consistent_unit_metric`
- `final_unit`

### Reason
- Derived using unknown assumptions
- Represent business logic, not facts
- Pricing intelligence is recomputed dynamically

---

## 11. Ingestion Flow (Step-by-Step)

For each CSV row:

1. Extract and upsert internal product → `products`
2. Insert competitor listing → `competitor_products`
3. Create match record → `product_matches`
4. (Optional) Compute normalized unit prices → `normalized_prices`

No pricing decisions are made at ingestion time.

---

## 12. What the Ingestion Layer Does NOT Do

The ingestion script explicitly does NOT:
- Determine overpriced products
- Classify actionability
- Identify pricing patterns
- Trust precomputed CSV metrics

All intelligence is derived later at query time.

---

## 13. Summary

- Each CSV row is a **product–competitor comparison**
- The CSV is decomposed into normalized tables
- Only factual data is persisted
- Business logic remains flexible and explainable

This ingestion strategy ensures correctness, adaptability, and trust in downstream pricing intelligence.
