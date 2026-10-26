import { ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { formatAmount, formatKcal } from "@/features/foods/lib/format";
import { foodsStrings } from "@/features/foods/strings";
import { recipeNutrition } from "../lib/recipe-nutrition";
import type { Recipe } from "../lib/types";
import { recipesStrings } from "../strings";

const t = recipesStrings;
const n = foodsStrings.nutrients;

type RecipeListProps = {
  recipes: Recipe[];
  onOpen: (recipe: Recipe) => void;
};

function RecipeRow({ recipe, onOpen }: { recipe: Recipe; onOpen: (recipe: Recipe) => void }) {
  const nutrition = recipeNutrition(recipe);
  const servings = t.list.servings(formatAmount(recipe.servings));
  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => onOpen(recipe)}
        className="flex min-h-56 w-full items-center gap-12 px-12 py-12 text-left transition-colors duration-150 hover:bg-surface-alt"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-4">
          <span className="line-clamp-2 text-body-lg text-ink">{recipe.name}</span>
          <span className="tabular text-caption text-ink-muted">
            {nutrition.ok ? `${servings} · ${t.list.totalGrams(formatAmount(nutrition.value.totalGrams))}` : servings}
          </span>
        </span>
        {nutrition.ok ? (
          <span className="flex shrink-0 flex-col items-end">
            <span className="tabular text-body-lg text-ink">
              {formatKcal(nutrition.value.perServing.kcal)}
              <span className="ml-4 font-sans text-caption text-ink-muted">{n.kcalUnit}</span>
            </span>
            <span className="tabular text-caption text-ink-muted">
              {n.short.protein} {formatAmount(nutrition.value.perServing.protein)} · {n.short.carbs}{" "}
              {formatAmount(nutrition.value.perServing.carbs)} · {n.short.fat} {formatAmount(nutrition.value.perServing.fat)}
            </span>
            <span className="text-caption text-ink-subtle">{t.list.perServing}</span>
          </span>
        ) : (
          <span className="shrink-0 text-caption text-danger-ink">
            {nutrition.error === "empty" ? t.problems.empty : t.problems.missingFood}
          </span>
        )}
        <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-ink-subtle" />
      </button>
    </li>
  );
}

/** The caller's recipes with values per serving, computed from their ingredients. */
export function RecipeList({ recipes, onOpen }: RecipeListProps) {
  if (recipes.length === 0) return <EmptyState message={t.list.empty} />;
  return (
    <section aria-labelledby="recipe-list-heading" className="flex flex-col gap-8">
      <h2 id="recipe-list-heading" className="text-body font-semibold text-ink">
        {t.list.heading}
      </h2>
      <ul className="rounded-cards border border-border bg-surface">
        {recipes.map((recipe) => (
          <RecipeRow key={recipe.id} recipe={recipe} onOpen={onOpen} />
        ))}
      </ul>
    </section>
  );
}
