"use server";

import { PatternsResponse } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface FetchPatternsParams {
  threshold?: number;
  vendor?: string;
  competitorVendor?: string;
  confidenceScope?: "all" | "high";
}

export async function fetchPricingPatterns(
  params: FetchPatternsParams = {}
): Promise<PatternsResponse> {
  const { threshold = 1.1, vendor, competitorVendor, confidenceScope } = params;

  const searchParams = new URLSearchParams({
    threshold: threshold.toString(),
  });

  if (vendor) {
    searchParams.set("vendor", vendor);
  }
  if (competitorVendor) {
    searchParams.set("competitorVendor", competitorVendor);
  }
  if (confidenceScope) {
    searchParams.set("confidenceScope", confidenceScope);
  }

  const url = `${API_BASE_URL}/api/analysis/patterns?${searchParams.toString()}`;

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch pricing patterns: ${response.statusText}`);
  }

  return response.json();
}
