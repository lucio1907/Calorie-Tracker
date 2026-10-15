import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/features/auth/data/current-user";
import { errorJson, privateJson } from "@/features/foods/data/api-response";
import { OffUnavailableError, searchOffProducts } from "@/features/foods/data/open-food-facts";
import { offQuerySchema } from "@/features/foods/lib/food-schema";

/**
 * GET /api/off/search?q=<name>
 * Proxies an Open Food Facts name search (products sold in Argentina). Results
 * are not stored; a product is saved only when the user picks it.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return errorJson(401, "unauthorized");

  const query = offQuerySchema.safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!query.success) return errorJson(400, "invalid query");

  try {
    return privateJson({ results: await searchOffProducts(query.data) });
  } catch (error) {
    if (error instanceof OffUnavailableError) return errorJson(503, "open food facts unavailable");
    console.error("[foods] OFF search failed", error);
    return errorJson(500, "search failed");
  }
}
