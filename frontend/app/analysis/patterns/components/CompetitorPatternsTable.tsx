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
import { Badge } from "@/components/ui/badge";
import { CompetitorPattern } from "../types";
import { formatPercentage, formatPriceIndex } from "../utils";

interface CompetitorPatternsTableProps {
  competitors: CompetitorPattern[];
}

export function CompetitorPatternsTable({
  competitors,
}: CompetitorPatternsTableProps) {
  if (competitors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Competitor Pricing Patterns</CardTitle>
          <CardDescription>
            Pricing behavior analysis by competitor vendor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground py-4 text-center">
            No competitor data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Competitor Pricing Patterns</CardTitle>
        <CardDescription>
          Pricing behavior analysis by competitor vendor
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competitor</TableHead>
              <TableHead>Cheaper Rate</TableHead>
              <TableHead>Avg Price Index</TableHead>
              <TableHead>Median Price Index</TableHead>
              <TableHead>Acceptable</TableHead>
              <TableHead>Overpriced</TableHead>
              <TableHead>Severely Overpriced</TableHead>
              <TableHead>Total Comparisons</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {competitors.map((competitor) => (
              <TableRow key={competitor.competitorVendor}>
                <TableCell className="font-medium">
                  {competitor.competitorVendor}
                </TableCell>
                <TableCell>{formatPercentage(competitor.cheaperRate)}</TableCell>
                <TableCell>{formatPriceIndex(competitor.avgPriceIndex)}</TableCell>
                <TableCell>{formatPriceIndex(competitor.medianPriceIndex)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{competitor.severity.acceptable}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{competitor.severity.overpriced}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="destructive">
                    {competitor.severity.severelyOverpriced}
                  </Badge>
                </TableCell>
                <TableCell>{competitor.totalComparisons}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
