import { requireUser } from "@/features/auth/data/current-user";
import { searchFoods } from "@/features/foods/data/foods";
import { RecipesScreenContainer } from "../containers/recipes-screen-container";
import { getRecipes } from "../data/recipes";

/**
 * Recipes route content: the caller's recipes plus the first page of foods
 * for the ingredient search. Must render inside a <Suspense> boundary: it
 * reads the session cookie.
 */
export async function RecipesPage() {
  // Client navigations do not re-run the layout's AuthGate: verify here too.
  const user = await requireUser();
  const [recipes, initialFoods] = await Promise.all([
    getRecipes(user.id),
    searchFoods({ query: "", favoritesOnly: false }),
  ]);
  return <RecipesScreenContainer recipes={recipes} initialFoods={initialFoods} />;
}
