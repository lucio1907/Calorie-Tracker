import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/features/auth/data/current-user";
import { errorJson, privateJson } from "@/features/foods/data/api-response";
import { getFoodDetail } from "@/features/foods/data/foods";
import { foodIdSchema } from "@/features/foods/lib/food-schema";

/** GET /api/foods/:id — one visible food (own or shared) with portions. */
export async function GET(_request: NextRequest, context: RouteContext<"/api/foods/[id]">) {
  const user = await getCurrentUser();
  if (!user) return errorJson(401, "unauthorized");

  const id = foodIdSchema.safeParse((await context.params).id);
  if (!id.success) return errorJson(400, "invalid id");

  try {
    const food = await getFoodDetail(id.data, user.id);
    return food ? privateJson({ food }) : errorJson(404, "not found");
  } catch (error) {
    console.error("[foods] detail failed", error);
    return errorJson(500, "detail failed");
  }
}
