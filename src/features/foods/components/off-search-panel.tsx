import { Plus } from "lucide-react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui";
import { formatAmount, formatKcal } from "../lib/format";
import type { OffSearchHit } from "../lib/types";
import { foodsStrings } from "../strings";

const t = foodsStrings.off;
const n = foodsStrings.nutrients;

export type OffSearchStatus = "idle" | "loading" | "done" | "error";

type OffSearchPanelProps = {
  initialQuery: string;
  status: OffSearchStatus;
  error: string | null;
  results: OffSearchHit[];
  addingBarcode: string | null;
  addError: string | null;
  onSearch: (query: string) => void;
  onAdd: (hit: OffSearchHit) => void;
};

/** Open Food Facts search (Argentina). Results are only saved when "Add" is pressed. */
export function OffSearchPanel({
  initialQuery,
  status,
  error,
  results,
  addingBarcode,
  addError,
  onSearch,
  onAdd,
}: OffSearchPanelProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("q");
    onSearch(typeof value === "string" ? value : "");
  }

  return (
    <div className="flex flex-col gap-16">
      <p className="text-body text-ink-muted">{t.description}</p>
      <form role="search" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <label htmlFor="off-search" className="text-body font-medium text-ink">
          {t.searchLabel}
        </label>
        <div className="flex gap-8">
          <input
            id="off-search"
            name="q"
            type="search"
            defaultValue={initialQuery}
            maxLength={100}
            autoComplete="off"
            enterKeyHint="search"
            aria-invalid={status === "error" ? true : undefined}
            aria-describedby={status === "error" ? "off-search-error" : undefined}
            className={`min-h-44 min-w-0 flex-1 rounded-inputs border bg-surface px-12 py-8 text-body-lg text-input-text ${status === "error" ? "border-danger-ink" : "border-input-border"}`}
          />
          <Button type="submit" disabled={status === "loading"} className="shrink-0">
            {status === "loading" ? t.submitting : t.submit}
          </Button>
        </div>
        {status === "error" && error ? (
          <p id="off-search-error" role="alert" className="text-body text-danger-ink">
            {error}
          </p>
        ) : null}
      </form>

      {addError ? (
        <p role="alert" className="rounded-inputs bg-danger-wash px-12 py-8 text-body text-danger-ink">
          {addError}
        </p>
      ) : null}

      <div aria-live="polite" aria-busy={status === "loading"}>
        {status === "done" && results.length === 0 ? <p className="text-body text-ink-muted">{t.noResults}</p> : null}
        {results.length > 0 ? (
          <ul className="rounded-cards border border-border">
            {results.map((hit) => {
              const adding = addingBarcode === hit.barcode;
              return (
                <li key={hit.barcode} className="flex items-center gap-12 border-b border-border py-8 pr-8 pl-12 last:border-b-0">
                  <div className="flex min-w-0 flex-1 flex-col gap-4">
                    <span className="line-clamp-2 text-body text-ink">{hit.name}</span>
                    <span className="truncate text-caption text-ink-muted">
                      {[hit.brand, hit.barcode].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <span className="tabular shrink-0 text-body text-ink">
                    {formatKcal(hit.kcal)}
                    <span className="ml-4 font-sans text-caption text-ink-muted">{n.kcalUnit}</span>
                    <span className="sr-only">
                      {`, ${n.protein} ${formatAmount(hit.protein)} ${n.gramsUnit}, ${n.carbs} ${formatAmount(hit.carbs)} ${n.gramsUnit}, ${n.fat} ${formatAmount(hit.fat)} ${n.gramsUnit}`}
                    </span>
                  </span>
                  <Button
                    onClick={() => onAdd(hit)}
                    disabled={addingBarcode !== null}
                    aria-label={t.addLabel(hit.name)}
                    className="shrink-0 px-12"
                  >
                    <Plus aria-hidden="true" size={16} />
                    <span>{adding ? t.adding : t.add}</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <p className="text-caption text-ink-muted">{t.attribution}</p>
    </div>
  );
}
