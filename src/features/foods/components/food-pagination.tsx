import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import { foodsStrings } from "../strings";

const t = foodsStrings.search;

type FoodPaginationProps = {
  /** 1-based page on screen. */
  page: number;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
};

/** Anterior / Siguiente with the current page; hidden when every result fits on the first page. */
export function FoodPagination({ page, hasNextPage, onPageChange }: FoodPaginationProps) {
  if (page <= 1 && !hasNextPage) return null;

  return (
    <nav aria-label={t.pagination} className="flex items-center justify-between gap-12">
      <Button onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
        <ChevronLeft aria-hidden="true" size={18} />
        <span>{t.previousPage}</span>
      </Button>
      <p aria-live="polite" className="tabular text-body text-ink-muted">
        {t.page(page)}
      </p>
      <Button onClick={() => onPageChange(page + 1)} disabled={!hasNextPage}>
        <span>{t.nextPage}</span>
        <ChevronRight aria-hidden="true" size={18} />
      </Button>
    </nav>
  );
}
