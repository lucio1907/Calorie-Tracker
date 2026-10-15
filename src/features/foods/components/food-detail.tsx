import { ExternalLink, Pencil, Star, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button, cn } from "@/components/ui";
import type { FoodDetail as FoodDetailData } from "../lib/types";
import { foodsStrings } from "../strings";
import { NutrientTable } from "./nutrient-table";
import { SourceBadge } from "./source-badge";

const t = foodsStrings.detail;

const SOURCE_LINKS = {
  argenfoods: () => "https://www.argenfood.unlu.edu.ar/",
  off: (barcode: string | null) => (barcode ? `https://world.openfoodfacts.org/product/${barcode}` : "https://world.openfoodfacts.org/"),
} as const;

type FoodDetailProps = {
  food: FoodDetailData;
  favoritePending?: boolean;
  onToggleFavorite: () => void;
  onEdit: () => void;
  deleteState: "idle" | "confirming" | "deleting";
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  error?: string | null;
  /** Portion list (read-only) or portion editor (own foods). */
  portions: ReactNode;
};

/** Food detail: source, nutrients per 100 g, portions and, for own foods, edit/delete. */
export function FoodDetail({
  food,
  favoritePending = false,
  onToggleFavorite,
  onEdit,
  deleteState,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  error,
  portions,
}: FoodDetailProps) {
  const meta = [
    food.brand ? { label: foodsStrings.form.brand, value: food.brand } : null,
    food.group ? { label: t.group, value: food.group } : null,
    food.barcode ? { label: t.barcode, value: food.barcode, mono: true } : null,
    food.externalCode ? { label: t.code, value: food.externalCode, mono: true } : null,
  ].filter((item) => item !== null);

  return (
    <div className="flex flex-col gap-24">
      <div className="flex flex-wrap items-center justify-between gap-12">
        <SourceBadge source={food.source} />
        <Button
          aria-pressed={food.isFavorite}
          onClick={onToggleFavorite}
          disabled={favoritePending}
        >
          <Star aria-hidden="true" size={16} className={food.isFavorite ? "fill-brand text-brand" : undefined} />
          <span>{food.isFavorite ? t.unfavorite : t.favorite}</span>
        </Button>
      </div>

      {error ? (
        <p role="alert" className="rounded-inputs bg-danger-wash px-12 py-8 text-body text-danger-ink">
          {error}
        </p>
      ) : null}

      <section aria-labelledby="food-nutrients" className="flex flex-col gap-8">
        <h3 id="food-nutrients" className="text-body font-semibold text-ink">
          {t.nutrientsHeading}
        </h3>
        <NutrientTable food={food} />
      </section>

      <section aria-labelledby="food-portions" className="flex flex-col gap-8">
        <h3 id="food-portions" className="text-body font-semibold text-ink">
          {t.portionsHeading}
        </h3>
        {portions}
      </section>

      {meta.length > 0 ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-16 gap-y-4 text-body">
          {meta.map((item) => (
            <div key={item.label} className="contents">
              <dt className="text-ink-muted">{item.label}</dt>
              <dd className={cn("min-w-0 break-words text-ink", item.mono && "tabular")}>{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {food.source !== "custom" ? (
        <p className="flex flex-wrap items-center gap-x-8 gap-y-4 text-caption text-ink-muted">
          <span>{food.source === "argenfoods" ? t.argenfoodsAttribution : t.offAttribution}</span>
          <a
            href={SOURCE_LINKS[food.source](food.barcode)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-4 font-medium text-brand underline-offset-2 hover:underline"
          >
            {t.viewSource}
            <ExternalLink aria-hidden="true" size={12} />
          </a>
        </p>
      ) : null}

      {food.isOwn ? (
        <div className="flex flex-wrap gap-8 border-t border-border pt-16">
          {deleteState === "idle" ? (
            <>
              <Button onClick={onEdit}>
                <Pencil aria-hidden="true" size={16} />
                <span>{t.edit}</span>
              </Button>
              <Button variant="ghost" onClick={onDeleteRequest}>
                <Trash2 aria-hidden="true" size={16} />
                <span>{t.delete}</span>
              </Button>
            </>
          ) : (
            <div role="group" aria-label={t.delete} className="flex w-full flex-col gap-8">
              <p className="text-body text-ink">{t.confirmDelete(food.name)}</p>
              <div className="flex flex-wrap gap-8">
                <Button variant="danger" onClick={onDeleteConfirm} disabled={deleteState === "deleting"}>
                  <Trash2 aria-hidden="true" size={16} />
                  <span>{t.delete}</span>
                </Button>
                <Button variant="ghost" onClick={onDeleteCancel} disabled={deleteState === "deleting"}>
                  {foodsStrings.form.cancel}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
