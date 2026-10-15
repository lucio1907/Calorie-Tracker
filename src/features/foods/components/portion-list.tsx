import { Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { formatAmount } from "../lib/format";
import type { FoodPortion } from "../lib/types";
import { foodsStrings } from "../strings";

const t = foodsStrings.portions;

type PortionListProps = {
  portions: FoodPortion[];
  editable: boolean;
  editingId?: number | null;
  busyId?: number | null;
  onEdit?: (portion: FoodPortion) => void;
  onRemove?: (portion: FoodPortion) => void;
  /** Rendered in place of the row being edited. */
  renderEditor?: (portion: FoodPortion) => ReactNode;
};

const iconButton =
  "inline-flex size-44 items-center justify-center rounded-buttons text-ink-muted hover:bg-surface-alt hover:text-ink disabled:opacity-60";

/** Named serving sizes (label + grams) of a food. */
export function PortionList({ portions, editable, editingId, busyId, onEdit, onRemove, renderEditor }: PortionListProps) {
  if (portions.length === 0) {
    return <p className="text-body text-ink-muted">{foodsStrings.detail.noPortions}</p>;
  }

  return (
    <ul className="rounded-cards border border-border">
      {portions.map((portion) => (
        <li key={portion.id} className="border-b border-border last:border-b-0">
          {editingId === portion.id && renderEditor ? (
            <div className="p-12">{renderEditor(portion)}</div>
          ) : (
            <div className="flex min-h-44 items-center gap-8 py-4 pr-4 pl-12">
              <span className="min-w-0 flex-1 truncate text-body text-ink">{portion.label}</span>
              <span className="tabular text-body text-ink">
                {formatAmount(portion.grams)}
                <span className="ml-4 font-sans text-caption text-ink-muted">{foodsStrings.nutrients.gramsUnit}</span>
              </span>
              {editable ? (
                <span className="flex">
                  <button
                    type="button"
                    className={iconButton}
                    aria-label={t.edit(portion.label)}
                    disabled={busyId === portion.id}
                    onClick={() => onEdit?.(portion)}
                  >
                    <Pencil aria-hidden="true" size={16} />
                  </button>
                  <button
                    type="button"
                    className={iconButton}
                    aria-label={t.remove(portion.label)}
                    disabled={busyId === portion.id}
                    onClick={() => onRemove?.(portion)}
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </span>
              ) : null}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
