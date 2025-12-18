"use server";
import { ApiResponse } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface FetchOverpricedParams {
  page?: number;
  limit?: number;
  threshold?: number;
}

export async function fetchOverpricedProducts(
  params: FetchOverpricedParams = {}
): Promise<ApiResponse> {
  const { page = 1, limit = 10, threshold = 1.1 } = params;

  const searchParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    threshold: threshold.toString(),
  });

  const url = `${API_BASE_URL}/api/analysis/overpriced?${searchParams.toString()}`;

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch overpriced products: ${response.statusText}`);
  }

  return response.json();
}

