import { requireUser } from "@/features/auth/data/current-user";
import { FoodsScreenContainer } from "../containers/foods-screen-container";
import { searchFoods } from "../data/foods";

/**
 * Foods route content. Renders the first page of results on the server (the
 * caller's favorites and own foods first) so the list is there on first paint;
 * the client container takes over for search-as-you-type.
 * Must render inside a <Suspense> boundary: it reads the session cookie.
 */
export async function FoodsPage() {
  // Client navigations do not re-run the layout's AuthGate: verify here too.
  await requireUser();
  const initialFoods = await searchFoods({ query: "", favoritesOnly: false });
  return <FoodsScreenContainer initialFoods={initialFoods} />;
}
