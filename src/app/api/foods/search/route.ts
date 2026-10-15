import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/features/auth/data/current-user";
import { errorJson, privateJson } from "@/features/foods/data/api-response";
import { searchFoods } from "@/features/foods/data/foods";
import { searchQuerySchema } from "@/features/foods/lib/food-schema";

/**
 * GET /api/foods/search?q=<text>&favorites=1
 * Read-only search used by search-as-you-type. A Route Handler (not a Server
 * Action) so requests can run in parallel and be aborted by the client:
 * https://nextjs.org/docs/app/guides/server-actions#sequential-dispatch-on-the-client
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return errorJson(401, "unauthorized");

  const params = request.nextUrl.searchParams;
  const query = searchQuerySchema.safeParse(params.get("q") ?? "");
  if (!query.success) return errorJson(400, "invalid query");

  try {
    const foods = await searchFoods({ query: query.data, favoritesOnly: params.get("favorites") === "1" });
    return privateJson({ foods });
  } catch (error) {
    console.error("[foods] search failed", error);
    return errorJson(500, "search failed");
  }
}
