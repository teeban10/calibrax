import { Confidence } from "./types";
import { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPrice(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "N/A";
  }
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    return "N/A";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
}

export function formatPriceIndex(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return value.toFixed(2);
}

export function getConfidenceBadgeVariant(
  confidence: Confidence
): VariantProps<typeof badgeVariants>["variant"] {
  switch (confidence) {
    case "high":
      return "default"; // Green (primary)
    case "medium":
      return "secondary"; // Yellow/gray
    case "low":
      return "outline"; // Gray
    default:
      return "outline";
  }
}

export function getConfidenceColorClass(confidence: Confidence): string {
  switch (confidence) {
    case "high":
      return "text-green-600 dark:text-green-400";
    case "medium":
      return "text-yellow-600 dark:text-yellow-400";
    case "low":
      return "text-gray-600 dark:text-gray-400";
    default:
      return "";
  }
}

