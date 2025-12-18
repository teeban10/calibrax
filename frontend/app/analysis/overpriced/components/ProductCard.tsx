"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Product } from "../types";
import { CompetitorTable } from "./CompetitorTable";
import { formatPrice } from "../utils";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const competitorCount = product.competitors.length;

  return (
    <Card>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={product.productId} className="border-none">
          <CardHeader>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-start justify-between w-full pr-4">
                <div className="flex-1 text-left">
                  <CardTitle className="mb-2">{product.productTitle}</CardTitle>
                  <CardDescription className="flex items-center gap-4">
                    <span>Base Price: {formatPrice(product.productPrice)}</span>
                    {product.vendor && (
                      <span className="text-xs">Vendor: {product.vendor}</span>
                    )}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="ml-4 shrink-0">
                  {competitorCount} {competitorCount === 1 ? "competitor" : "competitors"}
                </Badge>
              </div>
            </AccordionTrigger>
          </CardHeader>
          <AccordionContent>
            <CardContent>
              <CompetitorTable competitors={product.competitors} />
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}

