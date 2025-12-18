import { fetchPricingPatterns } from "./action";
import { SummaryCards } from "./components/SummaryCards";
import { CompetitorPatternsTable } from "./components/CompetitorPatternsTable";
import { VendorPatternsTable } from "./components/VendorPatternsTable";
import { Separator } from "@/components/ui/separator";

interface PageProps {
  searchParams: Promise<{
    vendor?: string;
    competitorVendor?: string;
    threshold?: string;
    confidenceScope?: string;
  }>;
}

function parseQueryParams(searchParams: {
  vendor?: string;
  competitorVendor?: string;
  threshold?: string;
  confidenceScope?: string;
}) {
  const threshold = parseFloat(searchParams.threshold || "1.1") || 1.1;
  const vendor = searchParams.vendor?.trim() || undefined;
  const competitorVendor = searchParams.competitorVendor?.trim() || undefined;
  const confidenceScope =
    searchParams.confidenceScope === "high" ? ("high" as const) : undefined;

  return { threshold, vendor, competitorVendor, confidenceScope };
}

export default async function PatternsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { threshold, vendor, competitorVendor, confidenceScope } =
    parseQueryParams(params);

  try {
    const data = await fetchPricingPatterns({
      threshold,
      vendor,
      competitorVendor,
      confidenceScope,
    });

    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Pricing Patterns Analysis</h1>
            <p className="text-muted-foreground">
              Comprehensive pricing intelligence across competitors and vendors
            </p>
          </div>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">Summary</h2>
            <SummaryCards data={data} />
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">
              Competitor Pricing Patterns
            </h2>
            <CompetitorPatternsTable competitors={data.competitors} />
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-4">
              Vendor Overpricing Patterns
            </h2>
            <VendorPatternsTable vendors={data.vendors} />
          </section>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching pricing patterns:", error);
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Pricing Patterns Analysis</h1>
          <div className="text-center py-12 border rounded-lg bg-destructive/10 border-destructive/20">
            <p className="text-destructive text-lg font-semibold mb-2">
              Error loading data
            </p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "Failed to fetch pricing patterns. Please try again later."}
            </p>
          </div>
        </div>
      </div>
    );
  }
}
