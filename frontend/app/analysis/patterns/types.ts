export interface CompetitorPattern {
  competitorVendor: string;
  cheaperRate: number;
  avgPriceIndex: number | null;
  medianPriceIndex: number | null;
  severity: {
    acceptable: number;
    overpriced: number;
    severelyOverpriced: number;
  };
  totalComparisons: number;
}

export interface VendorPattern {
  vendor: string;
  overpricedRate: number;
  productOverpricedRate: number;
  totalProducts: number;
}

export interface PatternsResponse {
  competitors: CompetitorPattern[];
  vendors: VendorPattern[];
  meta: {
    threshold: number;
    confidenceScope: "all" | "high";
  };
}
