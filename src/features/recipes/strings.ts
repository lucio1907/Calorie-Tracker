/** User-facing copy for the recipes feature. Translate here. */
export const recipesStrings = {
  title: "Recipes",
  description: "Combine your foods into recipes and log them by serving.",
  newRecipe: "New recipe",
  backToFoods: "Foods",
  close: "Close",

  list: {
    heading: "Your recipes",
    empty: "No recipes yet. Create one from foods you already have.",
    servings: (servings: string) => (servings === "1" ? "1 serving" : `${servings} servings`),
    totalGrams: (grams: string) => `${grams} g in total`,
    perServing: "per serving",
  },

  problems: {
    empty: "No ingredients yet.",
    missingFood: "An ingredient is no longer available.",
  },

  form: {
    createHeading: "New recipe",
    editHeading: "Edit recipe",
    name: "Name",
    servings: "Servings",
    servingsHint: "How many servings the whole recipe makes.",
    notes: "Notes",
    notesHint: "Optional.",
    ingredients: "Ingredients",
    noIngredients: "No ingredients yet. A recipe needs at least one to be logged.",
    addIngredient: "Add ingredient",
    hideSearch: "Done adding",
    ingredientGrams: (name: string) => `Grams of ${name}`,
    removeIngredient: (name: string) => `Remove ${name}`,
    missingFood: "No longer available",
    summaryHeading: "Per serving",
    summaryEmpty: "Add ingredients to see kcal and macros per serving.",
    summaryTotal: (grams: string, serving: string) => `${grams} g in total · ${serving} g per serving`,
    save: "Save recipe",
    saving: "Saving…",
    cancel: "Cancel",
  },

  delete: {
    action: "Delete recipe",
    confirm: (name: string) => `Delete “${name}”? Diary entries keep their values.`,
    confirmAction: "Delete",
    deleting: "Deleting…",
    cancel: "Cancel",
    failed: "Could not delete the recipe.",
  },

  validation: {
    required: "Required.",
    nameLength: "Use 1 to 200 characters.",
    notesLength: "Use at most 2000 characters.",
    number: "Enter a number.",
    servingsRange: (max: number) => `Enter more than 0 and at most ${max}.`,
    gramsRange: (max: number) => `Enter more than 0 and at most ${max}.`,
    tooManyItems: (max: number) => `A recipe can have at most ${max} ingredients.`,
    fix: "Check the highlighted fields.",
  },

  errors: {
    unauthorized: "Your session expired. Sign in again.",
    unexpected: "Something went wrong. Try again.",
    saveFailed: "Could not save the recipe. Try again.",
    recipeMissing: "This recipe no longer exists.",
    foodMissing: "An ingredient is no longer available. Remove it and save again.",
    limitReached: "You have reached the maximum number of recipes.",
  },
} as const;
