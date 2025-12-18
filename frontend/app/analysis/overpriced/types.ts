export type Confidence = "high" | "medium" | "low";

export interface Competitor {
  competitorProductId: string;
  competitorTitle: string | null;
  competitorPrice: string;
  ourUnitPrice: number | null;
  competitorUnitPrice: number | null;
  priceIndex: number | null;
  isOverpriced: boolean | null;
  confidence: Confidence;
  matchingScore: number | null;
  exactMatch: boolean | null;
  competitorVendor: string | null;
}

export interface Product {
  productId: string;
  productTitle: string;
  productPrice: string;
  vendor: string | null;
  competitors: Competitor[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
}

export interface ApiResponse {
  data: Product[];
  pagination: PaginationMeta;
  meta: {
    threshold: number;
  };
}

