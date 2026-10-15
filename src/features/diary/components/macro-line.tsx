import type { Nutrients } from "@/domain";
import { formatAmount } from "@/features/foods/lib/format";
import { cn } from "@/components/ui";
import { diaryStrings } from "../strings";

const n = diaryStrings.nutrients;

/** "P 10.4 · C 116.3 · F 0.3" on screen; "Protein 10.4 g, Carbs …" for screen readers. */
export function MacroLine({ nutrients, className }: { nutrients: Nutrients; className?: string }) {
  const protein = formatAmount(nutrients.protein);
  const carbs = formatAmount(nutrients.carbs);
  const fat = formatAmount(nutrients.fat);
  return (
    <span className={cn("tabular", className)}>
      <span aria-hidden="true">
        {n.short.protein} {protein} · {n.short.carbs} {carbs} · {n.short.fat} {fat}
      </span>
      <span className="sr-only">
        {n.protein} {protein} {n.grams}, {n.carbs} {carbs} {n.grams}, {n.fat} {fat} {n.grams}
      </span>
    </span>
  );
}
