/** User-facing copy for the recipes feature. Translate here. */
export const recipesStrings = {
  title: "Recetas",
  description: "Combiná tus alimentos en recetas y registralas por porción.",
  newRecipe: "Nueva receta",
  backToFoods: "Alimentos",
  close: "Cerrar",

  list: {
    heading: "Tus recetas",
    empty: "Todavía no hay recetas. Creá una con alimentos que ya tenés.",
    servings: (servings: string) => (servings === "1" ? "1 porción" : `${servings} porciones`),
    totalGrams: (grams: string) => `${grams} g en total`,
    perServing: "por porción",
  },

  problems: {
    empty: "Todavía no hay ingredientes.",
    missingFood: "Un ingrediente ya no está disponible.",
  },

  form: {
    createHeading: "Nueva receta",
    editHeading: "Editar receta",
    name: "Nombre",
    servings: "Porciones",
    servingsHint: "Cuántas porciones rinde la receta completa.",
    notes: "Notas",
    notesHint: "Opcional.",
    ingredients: "Ingredientes",
    noIngredients: "Todavía no hay ingredientes. Una receta necesita al menos uno para poder registrarla.",
    addIngredient: "Agregar ingrediente",
    hideSearch: "Terminar de agregar",
    ingredientGrams: (name: string) => `Gramos de ${name}`,
    removeIngredient: (name: string) => `Quitar ${name}`,
    missingFood: "Ya no está disponible",
    summaryHeading: "Por porción",
    summaryEmpty: "Agregá ingredientes para ver las kcal y los macros por porción.",
    summaryTotal: (grams: string, serving: string) => `${grams} g en total · ${serving} g por porción`,
    save: "Guardar receta",
    saving: "Guardando…",
    cancel: "Cancelar",
  },

  delete: {
    action: "Eliminar receta",
    confirm: (name: string) => `¿Eliminar “${name}”? Los registros del diario conservan sus valores.`,
    confirmAction: "Eliminar",
    deleting: "Eliminando…",
    cancel: "Cancelar",
    failed: "No se pudo eliminar la receta.",
  },

  validation: {
    required: "Obligatorio.",
    nameLength: "Usá de 1 a 200 caracteres.",
    notesLength: "Usá como máximo 2000 caracteres.",
    number: "Ingresá un número.",
    servingsRange: (max: number) => `Ingresá más de 0 y como máximo ${max}.`,
    gramsRange: (max: number) => `Ingresá más de 0 y como máximo ${max}.`,
    tooManyItems: (max: number) => `Una receta puede tener como máximo ${max} ingredientes.`,
    fix: "Revisá los campos marcados.",
  },

  errors: {
    unauthorized: "Tu sesión expiró. Iniciá sesión de nuevo.",
    unexpected: "Algo salió mal. Probá de nuevo.",
    saveFailed: "No se pudo guardar la receta. Probá de nuevo.",
    recipeMissing: "Esta receta ya no existe.",
    foodMissing: "Un ingrediente ya no está disponible. Quitalo y guardá de nuevo.",
    limitReached: "Llegaste al máximo de recetas.",
  },
} as const;
