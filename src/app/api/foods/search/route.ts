import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/features/auth/data/current-user";
import { errorJson, privateJson } from "@/features/foods/data/api-response";
import { searchFoods, searchFoodsPage } from "@/features/foods/data/foods";
import { foodsPageSchema, searchQuerySchema } from "@/features/foods/lib/food-schema";
import { isFoodFilter, type FoodFilter } from "@/features/foods/lib/types";

/**
 * GET /api/foods/search?q=<text>[&filter=<all|custom|favorites|argenfoods|off>][&page=<n>]
 * Read-only search used by search-as-you-type. A Route Handler (not a Server
 * Action) so requests can run in parallel and be aborted by the client:
 * https://nextjs.org/docs/app/guides/server-actions#sequential-dispatch-on-the-client
 * Without `page` it answers { foods } (first 30); with a 1-based `page` it
 * answers { foods, hasNextPage } for that page of FOODS_PAGE_SIZE.
 * favorites=1 is the older spelling of filter=favorites.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return errorJson(401, "unauthorized");

  const params = request.nextUrl.searchParams;
  const query = searchQuerySchema.safeParse(params.get("q") ?? "");
  if (!query.success) return errorJson(400, "invalid query");

  const pageParam = params.get("page");
  const page = pageParam === null ? null : foodsPageSchema.safeParse(pageParam);
  if (page && !page.success) return errorJson(400, "invalid page");

  const filterParam = params.get("filter");
  if (filterParam !== null && !isFoodFilter(filterParam)) return errorJson(400, "invalid filter");
  const filter: FoodFilter = filterParam ?? (params.get("favorites") === "1" ? "favorites" : "all");

  const options = { query: query.data, filter };
  try {
    if (page) return privateJson(await searchFoodsPage({ ...options, page: page.data }));
    return privateJson({ foods: await searchFoods(options) });
  } catch (error) {
    console.error("[foods] search failed", error);
    return errorJson(500, "search failed");
  }
}
