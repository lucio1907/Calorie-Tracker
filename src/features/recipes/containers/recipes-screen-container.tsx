"use client";

import { ArrowLeft, Plus } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { Button, ButtonLink, PageHeader, Sheet } from "@/components/ui";
import type { FoodSummary } from "@/features/foods/lib/types";
import { deleteRecipe } from "../actions/recipe-actions";
import { RecipeList } from "../components/recipe-list";
import type { Recipe } from "../lib/types";
import { recipesStrings as t } from "../strings";
import { RecipeFormContainer } from "./recipe-form-container";

type Panel = { kind: "create" } | { kind: "edit"; recipe: Recipe };

function DeleteRecipeControl({ recipe, onDeleted }: { recipe: Recipe; onDeleted: () => void }) {
  const [phase, setPhase] = useState<"idle" | "confirming">("idle");
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  function confirm() {
    setError(null);
    startDelete(async () => {
      const result = await deleteRecipe(recipe.id);
      if (result.ok) onDeleted();
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-8 border-t border-border pt-16">
      {phase === "idle" ? (
        <div>
          <Button variant="danger" onClick={() => setPhase("confirming")}>
            {t.delete.action}
          </Button>
        </div>
      ) : (
        <div role="group" aria-labelledby="delete-recipe-question" className="flex flex-col gap-8">
          <p id="delete-recipe-question" className="text-body text-ink">
            {t.delete.confirm(recipe.name)}
          </p>
          <div className="flex flex-wrap gap-8">
            <Button variant="danger" onClick={confirm} disabled={deleting}>
              {deleting ? t.delete.deleting : t.delete.confirmAction}
            </Button>
            <Button onClick={() => setPhase("idle")} disabled={deleting}>
              {t.delete.cancel}
            </Button>
          </div>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-body text-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type RecipesScreenContainerProps = {
  recipes: Recipe[];
  /** Server-rendered food results for the ingredient search's empty query. */
  initialFoods: FoodSummary[];
};

/**
 * Recipes screen: the list (values per serving) and the sheet to create,
 * edit or delete a recipe. Mutations refresh the server-rendered list.
 */
export function RecipesScreenContainer({ recipes, initialFoods }: RecipesScreenContainerProps) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const close = useCallback(() => setPanel(null), []);

  function renderPanel(current: Panel) {
    if (current.kind === "create") {
      return <RecipeFormContainer initialFoods={initialFoods} onSaved={close} onCancel={close} />;
    }
    return (
      <div className="flex flex-col gap-24">
        <RecipeFormContainer key={current.recipe.id} recipe={current.recipe} initialFoods={initialFoods} onSaved={close} onCancel={close} />
        <DeleteRecipeControl recipe={current.recipe} onDeleted={close} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-24">
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <>
            <ButtonLink href="/foods" variant="ghost">
              <ArrowLeft aria-hidden="true" size={18} />
              <span>{t.backToFoods}</span>
            </ButtonLink>
            <Button variant="primary" onClick={() => setPanel({ kind: "create" })}>
              <Plus aria-hidden="true" size={18} />
              <span>{t.newRecipe}</span>
            </Button>
          </>
        }
      />

      <RecipeList recipes={recipes} onOpen={(recipe) => setPanel({ kind: "edit", recipe })} />

      <Sheet
        open={panel !== null}
        onClose={close}
        title={panel?.kind === "edit" ? t.form.editHeading : t.form.createHeading}
        closeLabel={t.close}
      >
        {panel ? renderPanel(panel) : null}
      </Sheet>
    </div>
  );
}
