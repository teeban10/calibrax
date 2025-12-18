"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Competitor } from "../types";
import {
  formatCurrency,
  formatPrice,
  formatPriceIndex,
  getConfidenceBadgeVariant,
} from "../utils";

interface CompetitorTableProps {
  competitors: Competitor[];
}

export function CompetitorTable({ competitors }: CompetitorTableProps) {
  if (competitors.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        No competitors found
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Competitor Name</TableHead>
          <TableHead>Competitor Vendor</TableHead>
          <TableHead>Competitor Price</TableHead>
          <TableHead>Our Unit Price</TableHead>
          <TableHead>Competitor Unit Price</TableHead>
          <TableHead>Price Index</TableHead>
          <TableHead>Confidence</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {competitors.map((competitor) => (
          <TableRow
            key={competitor.competitorProductId}
            className={
              competitor.isOverpriced === true
                ? "bg-destructive/10 hover:bg-destructive/20"
                : ""
            }
          >
            <TableCell className="font-medium">
              {competitor.competitorTitle || "N/A"}
            </TableCell>
            <TableCell>{formatPrice(competitor.competitorPrice)}</TableCell>
            <TableCell>{competitor.competitorVendor}</TableCell>
            <TableCell>
              {formatCurrency(competitor.ourUnitPrice)}
            </TableCell>
            <TableCell>
              {formatCurrency(competitor.competitorUnitPrice)}
            </TableCell>
            <TableCell>{formatPriceIndex(competitor.priceIndex)}</TableCell>
            <TableCell>
              <Badge
                variant={getConfidenceBadgeVariant(competitor.confidence)}
                className={
                  competitor.confidence === "high"
                    ? "bg-green-500 hover:bg-green-600 text-white border-transparent"
                    : competitor.confidence === "medium"
                    ? "bg-yellow-500 hover:bg-yellow-600 text-white border-transparent"
                    : "bg-gray-500 hover:bg-gray-600 text-white border-transparent"
                }
              >
                {competitor.confidence.charAt(0).toUpperCase() +
                  competitor.confidence.slice(1)}
              </Badge>
            </TableCell>
            <TableCell>
              {competitor.isOverpriced === true ? (
                <Badge variant="destructive">Overpriced</Badge>
              ) : competitor.isOverpriced === false ? (
                <Badge variant="secondary">Not Overpriced</Badge>
              ) : (
                <span className="text-muted-foreground">N/A</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

