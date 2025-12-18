import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatternsResponse } from "../types";

interface SummaryCardsProps {
  data: PatternsResponse;
}

export function SummaryCards({ data }: SummaryCardsProps) {
  const { meta, competitors, vendors } = data;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Threshold
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{meta.threshold.toFixed(2)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Confidence Scope
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold capitalize">{meta.confidenceScope}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Competitors Analyzed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{competitors.length}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Vendors Analyzed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{vendors.length}</div>
        </CardContent>
      </Card>
    </div>
  );
}
