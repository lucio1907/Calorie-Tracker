const formatters = new Map<number, Intl.NumberFormat>();

function formatter(maxDecimals: number): Intl.NumberFormat {
  let instance = formatters.get(maxDecimals);
  if (!instance) {
    instance = new Intl.NumberFormat("en-US", { maximumFractionDigits: maxDecimals, useGrouping: false });
    formatters.set(maxDecimals, instance);
  }
  return instance;
}

/** kcal values: whole numbers. */
export function formatKcal(value: number): string {
  return formatter(0).format(value);
}

/** Grams and milligrams: up to one decimal ("12.5", "0.4", "3"). */
export function formatAmount(value: number): string {
  return formatter(1).format(value);
}

/** Value for an input's defaultValue: plain number text, empty for null. */
export function toInputValue(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}
