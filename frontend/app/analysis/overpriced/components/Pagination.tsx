"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PaginationMeta } from "../types";

interface PaginationProps {
  pagination: PaginationMeta;
  threshold: number;
  limit: number;
}

export function Pagination({ pagination, threshold, limit }: PaginationProps) {
  const { page, hasNextPage } = pagination;
  const isFirstPage = page === 1;

  const getSearchParams = (newPage: number) => {
    const params = new URLSearchParams();
    params.set("page", newPage.toString());
    params.set("limit", limit.toString());
    params.set("threshold", threshold.toString());
    return params.toString();
  };

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="text-sm text-muted-foreground">
        Page {page} of {Math.ceil(pagination.total / pagination.limit) || 1}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={isFirstPage}
          asChild
        >
          <Link
            href={`/analysis/overpriced?${getSearchParams(page - 1)}`}
            aria-disabled={isFirstPage}
            tabIndex={isFirstPage ? -1 : undefined}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNextPage}
          asChild
        >
          <Link
            href={`/analysis/overpriced?${getSearchParams(page + 1)}`}
            aria-disabled={!hasNextPage}
            tabIndex={!hasNextPage ? -1 : undefined}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

