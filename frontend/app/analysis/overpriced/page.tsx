import { fetchOverpricedProducts } from "./action";
import { ProductCard } from "./components/ProductCard";
import { Pagination } from "./components/Pagination";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    threshold?: string;
  }>;
}

function parseQueryParams(searchParams: {
  page?: string;
  limit?: string;
  threshold?: string;
}) {
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.limit || "10", 10) || 10));
  const threshold = parseFloat(searchParams.threshold || "1.1") || 1.1;

  return { page, limit, threshold };
}

export default async function OverpricedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { page, limit, threshold } = parseQueryParams(params);

  try {
    const response = await fetchOverpricedProducts({ page, limit, threshold });

    if (response.data.length === 0) {
      return (
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Overpriced Products Analysis</h1>
            <div className="text-center py-12 border rounded-lg bg-muted/50">
              <p className="text-muted-foreground text-lg">
                No overpriced products found.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting the threshold or check back later.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Overpriced Products Analysis</h1>
            <p className="text-muted-foreground">
              Threshold: {threshold.toFixed(2)} | Showing {response.data.length} of{" "}
              {response.pagination.total} products
            </p>
          </div>

          <div className="space-y-4 mb-8">
            {response.data.map((product) => (
              <ProductCard key={product.productId} product={product} />
            ))}
          </div>

          <Pagination
            pagination={response.pagination}
            threshold={threshold}
            limit={limit}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching overpriced products:", error);
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Overpriced Products Analysis</h1>
          <div className="text-center py-12 border rounded-lg bg-destructive/10 border-destructive/20">
            <p className="text-destructive text-lg font-semibold mb-2">
              Error loading data
            </p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "Failed to fetch overpriced products. Please try again later."}
            </p>
          </div>
        </div>
      </div>
    );
  }
}


