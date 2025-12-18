# Pricing Intelligence Calculations & Strategy

This document describes the **pricing calculations, pattern detection logic, and actionable classification strategy** used in the Retail Pricing Intelligence Platform MVP.

The goal is to provide **clear, explainable, and adjustable pricing intelligence** for merchandisers, without relying on opaque models or premature automation.

---

## 1. Overpriced Product Calculation

### Objective
Identify products where internal pricing is meaningfully higher than competitor pricing.

---

### Core Metric: Price Index

```
price_index = our_price / competitor_price
```

Where:
- `our_price` is the normalized internal unit price
- `competitor_price` is the normalized competitor unit price

---

### Overpricing Rule (MVP)

A product is considered **overpriced** if:

```
price_index > 1.10
```

This represents a pricing premium greater than 10% relative to competitors.

---

### Notes
- The threshold is configurable and intentionally not hard-coded into stored data.
- Overpricing is a **derived signal**, not a persisted field.
- All overpricing decisions are recomputed at query time to allow business rule adjustments.

---

## 2. Pricing Patterns to Identify

Pricing patterns describe **systemic behavior**, not individual product issues.  
They are derived using aggregations and consistency metrics.

---

### 2.1 Competitor Pricing Behavior

**Question Answered:**
> Is a specific competitor generally cheaper than our pricing?

**Calculation:**
For each competitor:
```
cheaper_rate = count(competitor_price < our_price) / total_comparisons
```

**Classification:**
- `> 70%` → Consistently Cheaper
- `40–70%` → Mixed Pricing
- `< 40%` → Generally More Expensive

---

### 2.2 Category-Level Overpricing

**Question Answered:**
> Are certain categories systematically overpriced?

**Calculation:**
```
overpriced_rate = overpriced_products / total_products
```

**Interpretation:**
- `> 50%` → Category-level pricing issue
- `< 20%` → Pricing likely acceptable

---

### 2.3 Brand-Level Signals (Optional)

Uses the same aggregation logic as category-level analysis, grouped by brand instead of category.

Purpose:
- Identify brands consistently losing on price
- Support vendor negotiation or pricing strategy

---

## 3. Actionable Item Classification

Not all overpriced products require immediate action.  
Actionability depends on **confidence and impact**, not price difference alone.

---

### 3.1 Repricing Candidates (Primary Action)

**Conditions:**
```
price_index > 1.10
AND exact_match = true
AND matching_score >= 0.8
AND competitor_price is the lowest among matches
```

**Label:**
- "Reprice Recommended"

---

### 3.2 Monitor Items

Products that are approaching overpricing thresholds but do not yet warrant action.

**Conditions:**
```
price_index between 1.05 and 1.10
OR medium match confidence
```

**Label:**
- "Monitor"

---

### 3.3 Informational / Low Confidence Items

Products where price differences exist but match confidence is insufficient.

**Conditions:**
```
price_index > 1.10
AND matching_score < threshold
```

**Label:**
- "Low Confidence – Informational"

---

### Notes
- Actionable flags are **derived**, not stored.
- Classification rules are intentionally transparent and adjustable.
- This approach builds trust with merchandisers and reduces false positives.

---

## 4. Pricing Patterns Across Categories & Vendors

Pricing patterns provide **strategic context** rather than SKU-level actions.

---

### 4.1 Vendor-Level Pricing Patterns

Metrics:
- Average price index per vendor
- Percentage of SKUs where vendor is cheaper

Use cases:
- Identify high-risk competitors
- Understand competitive pressure

---

### 4.2 Category-Level Pricing Patterns

Metrics:
- Average price index by category
- Distribution of overpriced SKUs

Use cases:
- Detect systemic category pricing issues
- Guide category-wide pricing reviews

---

### 4.3 Strategic vs Tactical Insights

| Type | Purpose |
|----|----|
| Tactical (Actionable Items) | Immediate repricing decisions |
| Strategic (Patterns) | Longer-term pricing strategy |

---

## 5. Storage & Computation Strategy

| Element | Stored | Computed |
|------|------|------|
| Raw prices | Yes | No |
| Match confidence | Yes | No |
| Price index | No | Yes |
| Overpriced flag | No | Yes |
| Actionable classification | No | Yes |
| Pricing patterns | No | Yes |

**Rationale:**
- Business rules change over time
- Derived metrics must remain flexible
- Avoids re-ingestion when logic evolves

---

## 6. Summary

The pricing intelligence system relies on:
- Simple, explainable calculations
- Rule-based classification
- Aggregation-driven pattern detection

This strategy prioritizes **trust, clarity, and adaptability**, ensuring that merchandisers can confidently act on the insights provided.
