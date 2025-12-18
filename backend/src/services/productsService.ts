import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { competitorProducts, products } from "../db/schema";

type PaginationParams = {
  page: number;
  limit: number;
};

export type ProductListItem = typeof products.$inferSelect;
export type CompetitorProductListItem = typeof competitorProducts.$inferSelect;

export async function listProducts(options: PaginationParams & {
  vendor?: string;
  search?: string;
}) {
  const offset = (options.page - 1) * options.limit;

  const whereConditions = [];
  if (options.vendor) {
    whereConditions.push(eq(products.vendor, options.vendor));
  }
  if (options.search) {
    whereConditions.push(sql`${products.title} ilike ${`%${options.search}%`}`);
  }

  const query = db.select().from(products);
  const rows = await (whereConditions.length > 0
    ? query.where(and(...whereConditions))
    : query)
    .orderBy(desc(products.createdAt))
    .limit(options.limit + 1)
    .offset(offset);

  const countQueryBuilder = db
    .select({ total: sql<number>`count(${products.id})` })
    .from(products);
  const countQuery =
    whereConditions.length > 0
      ? countQueryBuilder.where(and(...whereConditions))
      : countQueryBuilder;

  const countResult = await countQuery;
  const total = Number(countResult[0]?.total ?? 0);
  const hasNextPage = rows.length > options.limit;
  const data = hasNextPage ? rows.slice(0, options.limit) : rows;

  return {
    data,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      hasNextPage,
    },
  };
}

export async function listCompetitorProducts(options: PaginationParams & {
  competitorVendor?: string;
}) {
  const offset = (options.page - 1) * options.limit;

  const query = db.select().from(competitorProducts);
  const rows = await (options.competitorVendor
    ? query.where(
        eq(competitorProducts.competitorVendor, options.competitorVendor),
      )
    : query)
    .orderBy(desc(competitorProducts.createdAt))
    .limit(options.limit + 1)
    .offset(offset);

  const countQueryBuilder = db
    .select({ total: sql<number>`count(${competitorProducts.id})` })
    .from(competitorProducts);
  const countQuery = options.competitorVendor
    ? countQueryBuilder.where(
        eq(competitorProducts.competitorVendor, options.competitorVendor),
      )
    : countQueryBuilder;

  const countResult = await countQuery;
  const total = Number(countResult[0]?.total ?? 0);
  const hasNextPage = rows.length > options.limit;
  const data = hasNextPage ? rows.slice(0, options.limit) : rows;

  return {
    data,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      hasNextPage,
    },
  };
}

