import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VendorPattern } from "../types";
import { formatPercentage } from "../utils";
import { cn } from "@/lib/utils";

interface VendorPatternsTableProps {
  vendors: VendorPattern[];
}

export function VendorPatternsTable({ vendors }: VendorPatternsTableProps) {
  if (vendors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vendor Overpricing Patterns</CardTitle>
          <CardDescription>
            Overpricing analysis by internal vendor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground py-4 text-center">
            No vendor data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendor Overpricing Patterns</CardTitle>
        <CardDescription>
          Overpricing analysis by internal vendor
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Overpriced Rate (Comparison-weighted)</TableHead>
              <TableHead>Product Overpriced Rate (SKU-level)</TableHead>
              <TableHead>Total Products Analyzed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => {
              const isHighOverpricing =
                vendor.overpricedRate > 0.5 || vendor.productOverpricedRate > 0.5;

              return (
                <TableRow
                  key={vendor.vendor}
                  className={cn(
                    isHighOverpricing && "bg-destructive/5 hover:bg-destructive/10"
                  )}
                >
                  <TableCell className="font-medium">{vendor.vendor}</TableCell>
                  <TableCell
                    className={cn(
                      isHighOverpricing && "font-semibold text-destructive"
                    )}
                  >
                    {formatPercentage(vendor.overpricedRate)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      isHighOverpricing && "font-semibold text-destructive"
                    )}
                  >
                    {formatPercentage(vendor.productOverpricedRate)}
                  </TableCell>
                  <TableCell>{vendor.totalProducts}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
