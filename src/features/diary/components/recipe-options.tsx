import { PillBadge } from "@/components/ui";
import { formatKcal } from "@/features/foods/lib/format";
import { recipeNutrition } from "@/features/recipes/lib/recipe-nutrition";
import type { Recipe } from "@/features/recipes/lib/types";
import { recipesStrings } from "@/features/recipes/strings";
import { diaryStrings } from "../strings";

const t = diaryStrings;

type RecipeOptionsProps = {
  recipes: Recipe[];
  onSelect: (recipe: Recipe) => void;
};

/** The caller's recipes in the add-food flow, marked as recipes, with kcal per serving. */
export function RecipeOptions({ recipes, onSelect }: RecipeOptionsProps) {
  return (
    <section aria-labelledby="recipe-options-heading" className="flex flex-col gap-8">
      <h3 id="recipe-options-heading" className="text-body font-semibold text-ink">
        {t.add.recipesHeading}
      </h3>
      <ul className="rounded-cards border border-border bg-surface">
        {recipes.map((recipe) => {
          const nutrition = recipeNutrition(recipe);
          return (
            <li key={recipe.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => onSelect(recipe)}
                className="flex min-h-48 w-full items-center gap-12 px-12 py-8 text-left transition-colors duration-150 hover:bg-surface-alt"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-4">
                  <span className="truncate text-body-lg text-ink">{recipe.name}</span>
                  <PillBadge className="self-start">{t.add.recipeBadge}</PillBadge>
                </span>
                <span className="tabular shrink-0 text-right text-body text-ink-muted">
                  {nutrition.ok ? (
                    <>
                      {formatKcal(nutrition.value.perServing.kcal)} {t.nutrients.kcal}
                      <span className="block text-caption">{t.add.perServing}</span>
                    </>
                  ) : (
                    <span className="text-caption">
                      {nutrition.error === "empty" ? recipesStrings.problems.empty : recipesStrings.problems.missingFood}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
