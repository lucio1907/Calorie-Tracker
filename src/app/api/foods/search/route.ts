import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/features/auth/data/current-user";
import { errorJson, privateJson } from "@/features/foods/data/api-response";
import { searchFoods, searchFoodsPage } from "@/features/foods/data/foods";
import { foodsPageSchema, searchQuerySchema } from "@/features/foods/lib/food-schema";

/**
 * GET /api/foods/search?q=<text>&favorites=1[&page=<n>]
 * Read-only search used by search-as-you-type. A Route Handler (not a Server
 * Action) so requests can run in parallel and be aborted by the client:
 * https://nextjs.org/docs/app/guides/server-actions#sequential-dispatch-on-the-client
 * Without `page` it answers { foods } (first 30); with a 1-based `page` it
 * answers { foods, hasNextPage } for that page of FOODS_PAGE_SIZE.
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

  const options = { query: query.data, favoritesOnly: params.get("favorites") === "1" };
  try {
    if (page) return privateJson(await searchFoodsPage({ ...options, page: page.data }));
    return privateJson({ foods: await searchFoods(options) });
  } catch (error) {
    console.error("[foods] search failed", error);
    return errorJson(500, "search failed");
  }
}
