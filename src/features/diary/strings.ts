import type { Meal } from "@/domain";

/** User-facing copy for the diary feature. Translate here. */
export const diaryStrings = {
  title: "Diario",
  description: "Todo lo que comiste, agrupado por comida.",
  logFood: "Registrar comida",

  meals: {
    breakfast: "Desayuno",
    lunch: "Almuerzo",
    snack: "Merienda",
    dinner: "Cena",
    extra: "Extra",
  } satisfies Record<Meal, string>,

  dateNav: {
    label: "Día",
    previous: "Día anterior",
    next: "Día siguiente",
    today: "Hoy",
    pickDate: "Elegir una fecha",
    relative: { today: "Hoy", yesterday: "Ayer", tomorrow: "Mañana" },
  },

  nutrients: {
    kcal: "kcal",
    protein: "Proteínas",
    carbs: "Carbohidratos",
    fat: "Grasas",
    short: { protein: "P", carbs: "C", fat: "G" },
    grams: "g",
  },

  meal: {
    addTo: (meal: string) => `Agregar alimento a ${meal}`,
    add: "Agregar",
    empty: "Todavía no registraste nada.",
    entries: (meal: string) => `Registros de ${meal}`,
    total: (meal: string) => `Total de ${meal}`,
    editEntry: (label: string) => `Editar ${label}`,
  },

  target: {
    heading: "Objetivo del día",
    remaining: "Te quedan",
    over: "Te pasaste por",
    eaten: (eaten: string, target: string) => `${eaten} de ${target} kcal`,
    exercise: (kcal: string) => `+${kcal} kcal de ejercicio`,
    incomplete: "Completá tu perfil para ver tu objetivo diario.",
    underage: "No calculamos un objetivo diario para tu edad.",
    completeProfile: "Ir a Ajustes",
  },

  day: {
    totalsHeading: "Total del día",
    empty: "Todavía no registraste nada en este día.",
  },

  units: {
    grams: (grams: string) => `${grams} g`,
    gramsOption: "gramos (g)",
    portion: (quantity: string, label: string, grams: string) => `${quantity} × ${label} · ${grams} g`,
    portionOption: (label: string, grams: string) => `${label} (${grams} g)`,
    serving: "1 porción",
    /** Stored as the label of each user's own unit portion; lowercase, compared case-insensitively. */
    unitLabel: "unidad",
    newUnitOption: "unidad",
  },

  add: {
    title: (meal: string) => `Agregar a ${meal}`,
    close: "Cerrar",
    recentHeading: "Recientes",
    noRecent: "Los alimentos que registres aparecen acá.",
    newFood: "Nuevo alimento",
    barcode: "Código de barras",
    newFoodTitle: "Nuevo alimento",
    offTitle: "Open Food Facts",
    back: "Volver a la búsqueda",
    loadingFood: "Cargando alimento…",
    recipesHeading: "Recetas",
    recipeBadge: "Receta",
    perServing: "por porción",
  },

  entryForm: {
    meal: "Comida",
    unit: "Unidad",
    quantity: "Cantidad",
    grams: "Gramos",
    unitGrams: "Peso de 1 unidad (g)",
    unitGramsHint: "Se guarda solo para vos. La próxima vez la unidad ya aparece en la lista.",
    gramsHint: (max: number) => `Hasta ${max} g por registro.`,
    previewHeading: "Este registro",
    previewEmpty: "Ingresá una cantidad para ver las kcal y los macros.",
    save: "Agregar al diario",
    saving: "Guardando…",
    update: "Guardar cambios",
    perHundred: (kcal: string) => `${kcal} kcal cada 100 g`,
    foodDeleted:
      "El alimento o la receta de este registro se eliminó, así que no podés cambiar la cantidad. Igual podés moverlo a otra comida o eliminarlo.",
    foodLoadFailed: "No se pudo cargar este alimento.",
    retry: "Reintentar",
  },

  edit: {
    title: "Editar registro",
    delete: "Eliminar registro",
    confirmDelete: (label: string) => `¿Eliminar “${label}” de este día?`,
    confirmDeleteAction: "Eliminar",
    deleting: "Eliminando…",
    cancel: "Cancelar",
  },

  validation: {
    required: "Obligatorio.",
    number: "Ingresá un número.",
    quantityRange: "Ingresá más de 0 y hasta 1000.",
    gramsRange: (max: number) => `Ingresá más de 0 y hasta ${max}.`,
    totalTooLarge: (max: number) => `Son más de ${max} g para un solo registro.`,
    totalTooSmall: "Eso redondea a 0 g. Ingresá una cantidad mayor.",
    fix: "Revisá los campos marcados.",
  },

  errors: {
    unauthorized: "Tu sesión expiró. Iniciá sesión de nuevo.",
    saveFailed: "No se pudo guardar el registro. Probá de nuevo.",
    dayFull: "Este día ya tiene la cantidad máxima de registros.",
    foodMissing: "Este alimento ya no existe.",
    recipeMissing: "Esta receta ya no existe.",
    recipeEmpty:
      "Esta receta todavía no tiene ingredientes, así que no se puede registrar. Agregalos en Alimentos → Recetas.",
    recipeFoodMissing:
      "Un ingrediente de esta receta ya no está disponible, así que no se puede registrar. Editá la receta para quitarlo.",
    portionMissing: "Esta porción ya no existe. Elegí otra.",
    unitFailed: "No se pudo guardar el peso de la unidad. Probá de nuevo.",
    unitLimit: "Ya guardaste la cantidad máxima de unidades.",
    unitWeightDiffers: (grams: string) =>
      `Ya tenés guardado el peso de 1 unidad: ${grams} g. Escribí ese peso para registrar.`,
    entryMissing: "Este registro ya no existe.",
    deleteFailed: "No se pudo eliminar el registro.",
    unexpected: "Algo salió mal. Probá de nuevo.",
  },
} as const;
