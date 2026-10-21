import type { Meal } from "@/domain";

/** User-facing copy for the diary feature. Translate here. */
export const diaryStrings = {
  title: "Diary",
  description: "Everything you ate, grouped by meal.",
  logFood: "Log food",

  meals: {
    breakfast: "Breakfast",
    lunch: "Lunch",
    snack: "Snack",
    dinner: "Dinner",
    extra: "Extra",
  } satisfies Record<Meal, string>,

  dateNav: {
    label: "Day",
    previous: "Previous day",
    next: "Next day",
    today: "Today",
    pickDate: "Pick a date",
    relative: { today: "Today", yesterday: "Yesterday", tomorrow: "Tomorrow" },
  },

  nutrients: {
    kcal: "kcal",
    protein: "Protein",
    carbs: "Carbs",
    fat: "Fat",
    short: { protein: "P", carbs: "C", fat: "F" },
    grams: "g",
  },

  meal: {
    addTo: (meal: string) => `Add food to ${meal}`,
    add: "Add",
    empty: "Nothing logged yet.",
    entries: (meal: string) => `${meal} entries`,
    total: (meal: string) => `${meal} total`,
    editEntry: (label: string) => `Edit ${label}`,
  },

  day: {
    totalsHeading: "Day total",
    empty: "Nothing logged for this day yet.",
  },

  units: {
    grams: (grams: string) => `${grams} g`,
    gramsOption: "grams (g)",
    portion: (quantity: string, label: string, grams: string) => `${quantity} × ${label} · ${grams} g`,
    portionOption: (label: string, grams: string) => `${label} (${grams} g)`,
  },

  add: {
    title: (meal: string) => `Add to ${meal}`,
    close: "Close",
    recentHeading: "Recent",
    noRecent: "Foods you log show up here.",
    newFood: "New food",
    newFoodTitle: "New food",
    offTitle: "Open Food Facts",
    back: "Back to search",
    loadingFood: "Loading food…",
  },

  entryForm: {
    meal: "Meal",
    unit: "Unit",
    quantity: "Quantity",
    grams: "Grams",
    gramsHint: (max: number) => `Up to ${max} g per entry.`,
    previewHeading: "This entry",
    previewEmpty: "Enter an amount to see kcal and macros.",
    save: "Add to diary",
    saving: "Saving…",
    update: "Save changes",
    perHundred: (kcal: string) => `${kcal} kcal per 100 g`,
    foodDeleted:
      "The food behind this entry was deleted, so its amount can't change. You can still move it to another meal or delete it.",
    foodLoadFailed: "Could not load this food.",
    retry: "Try again",
  },

  edit: {
    title: "Edit entry",
    delete: "Delete entry",
    confirmDelete: (label: string) => `Delete “${label}” from this day?`,
    confirmDeleteAction: "Delete",
    deleting: "Deleting…",
    cancel: "Cancel",
  },

  validation: {
    required: "Required.",
    number: "Enter a number.",
    quantityRange: "Enter more than 0 and at most 1000.",
    gramsRange: (max: number) => `Enter more than 0 and at most ${max}.`,
    totalTooLarge: (max: number) => `That is more than ${max} g for one entry.`,
    totalTooSmall: "That rounds to 0 g. Enter a larger amount.",
    fix: "Check the highlighted fields.",
  },

  errors: {
    unauthorized: "Your session expired. Sign in again.",
    saveFailed: "Could not save the entry. Try again.",
    dayFull: "This day already has the maximum number of entries.",
    foodMissing: "This food no longer exists.",
    portionMissing: "This portion no longer exists. Pick another one.",
    entryMissing: "This entry no longer exists.",
    deleteFailed: "Could not delete the entry.",
    unexpected: "Something went wrong. Try again.",
  },
} as const;
