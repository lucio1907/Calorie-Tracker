"use client";

import { useEffect, useState, useTransition } from "react";
import { deleteFood, setFavorite } from "../actions/food-actions";
import { FoodDetail } from "../components/food-detail";
import { PortionList } from "../components/portion-list";
import { useFoodDetail } from "../hooks/use-food-detail";
import type { FoodDetail as FoodDetailData } from "../lib/types";
import { foodsStrings } from "../strings";
import { PortionEditorContainer } from "./portion-editor-container";

const t = foodsStrings.detail;

type FoodDetailContainerProps = {
  foodId: number;
  onLoaded: (food: FoodDetailData) => void;
  onEdit: (food: FoodDetailData) => void;
  onDeleted: () => void;
  /** Something the results list shows changed (favorite flag, values). */
  onChanged: () => void;
};

/** Loads a food and wires favorite, delete and portion editing. */
export function FoodDetailContainer({ foodId, onLoaded, onEdit, onDeleted, onChanged }: FoodDetailContainerProps) {
  const { food, status, reload, patch } = useFoodDetail(foodId);
  const [deleteState, setDeleteState] = useState<"idle" | "confirming" | "deleting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [favoritePending, startFavorite] = useTransition();
  const [, startDelete] = useTransition();

  useEffect(() => {
    if (food) onLoaded(food);
  }, [food, onLoaded]);

  if (status === "loading") {
    return (
      <div role="status" className="flex flex-col gap-12">
        <span className="sr-only">{t.loading}</span>
        <div aria-hidden="true" className="h-32 w-160 animate-pulse rounded-buttons bg-surface-alt" />
        <div aria-hidden="true" className="h-240 animate-pulse rounded-cards bg-surface-alt" />
      </div>
    );
  }
  if (!food) {
    return (
      <p role="alert" className="text-body text-danger-ink">
        {status === "not_found" ? t.notFound : t.error}
      </p>
    );
  }

  const current = food;

  function toggleFavorite() {
    setError(null);
    startFavorite(async () => {
      const result = await setFavorite(current.id, !current.isFavorite);
      if (result.ok) {
        patch({ isFavorite: result.data.isFavorite });
        onChanged();
      } else {
        setError(result.error);
      }
    });
  }

  function confirmDelete() {
    setDeleteState("deleting");
    setError(null);
    startDelete(async () => {
      const result = await deleteFood(current.id);
      if (result.ok) {
        onDeleted();
      } else {
        setDeleteState("idle");
        setError(result.error);
      }
    });
  }

  return (
    <FoodDetail
      food={current}
      favoritePending={favoritePending}
      onToggleFavorite={toggleFavorite}
      onEdit={() => onEdit(current)}
      deleteState={deleteState}
      onDeleteRequest={() => setDeleteState("confirming")}
      onDeleteConfirm={confirmDelete}
      onDeleteCancel={() => setDeleteState("idle")}
      error={error}
      portions={
        current.isOwn ? (
          <PortionEditorContainer foodId={current.id} portions={current.portions} onChanged={reload} />
        ) : (
          <div className="flex flex-col gap-8">
            <PortionList portions={current.portions} editable={false} />
            <p className="text-caption text-ink-muted">{t.readOnlyPortions}</p>
          </div>
        )
      }
    />
  );
}
