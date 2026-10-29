/** User-facing copy for the progress feature. Translate here. */
export const progressStrings = {
  title: "Progreso",
  description: "Tendencia de peso y balance diario de calorías.",
  logWeight: "Registrar peso",

  range: {
    label: "Período",
    option: (days: number) => `${days} días`,
  },

  weight: {
    heading: "Tendencia de peso",
    empty: "Todavía no registraste ningún peso en este período.",
    latest: "Último",
    change: "Cambio",
    lowest: "Mínimo",
    highest: "Máximo",
    noChange: "—",
    kg: (kg: string) => `${kg} kg`,
    signedKg: (kg: string) => `${kg} kg`,
    chartLabel: (count: number, days: number, from: string, to: string) =>
      `Gráfico de peso: ${count} ${count === 1 ? "registro" : "registros"} en los últimos ${days} días, del ${from} al ${to}.`,
    legendWeight: "Peso",
    legendAverage: "Promedio de 7 días",
    tooltip: (date: string, kg: string, average: string) => `${date}: ${kg} kg (promedio de 7 días ${average} kg)`,
  },

  entries: {
    heading: "Historial de peso",
    list: "Registros de peso",
    empty: "Los registros que agregues aparecen acá.",
    changeFromPrevious: (kg: string) => `${kg} kg vs. el anterior`,
  },

  calories: {
    heading: "Balance diario de calorías",
    description: "Comida menos ejercicio, comparado con tu objetivo diario.",
    noTarget: "Completá tu perfil en Ajustes para comparar cada día con un objetivo.",
    noTargetAction: "Ir a Ajustes",
    empty: "Todavía no registraste comidas en este período.",
    averageBalance: "Balance promedio",
    averageNet: "Consumo neto promedio",
    averageTarget: "Objetivo promedio",
    daysUnder: "Días por debajo del objetivo",
    daysOver: "Días por encima del objetivo",
    loggedDays: (logged: number, days: number) => `${logged} de ${days} días registrados`,
    under: "Por debajo del objetivo",
    over: "Por encima del objetivo",
    onTarget: "En el objetivo",
    notLogged: "Sin registros",
    chartLabel: (under: number, over: number) =>
      `Gráfico de balance diario: ${under} ${under === 1 ? "día" : "días"} por debajo del objetivo, ${over} por encima del objetivo.`,
    dayList: "Balance diario por día",
    dayDetail: (food: string, exercise: string, target: string) =>
      `Comida ${food} · Ejercicio ${exercise} · Objetivo ${target}`,
    dayDetailNoTarget: (food: string, exercise: string) => `Comida ${food} · Ejercicio ${exercise}`,
    balance: (kcal: string) => `${kcal} kcal`,
    tooltip: (date: string, balance: string) => `${date}: ${balance} kcal`,
    kcal: "kcal",
  },

  insights: {
    seeAll: "Ver todos los resúmenes",
  },

  form: {
    addTitle: "Registrar peso",
    editTitle: "Editar peso",
    close: "Cerrar",
    date: "Fecha",
    kg: "Peso (kg)",
    kgHint: "Si la fecha ya tiene un peso, se reemplaza.",
    save: "Guardar peso",
    update: "Guardar cambios",
    saving: "Guardando…",
    delete: "Eliminar registro",
    confirmDelete: (date: string) => `¿Eliminar el peso del ${date}?`,
    confirmDeleteAction: "Eliminar",
    deleting: "Eliminando…",
    cancel: "Cancelar",
  },

  validation: {
    required: "Obligatorio.",
    number: "Ingresá un número.",
    weightRange: (min: number, max: number) => `Ingresá un peso entre ${min} y ${max} kg.`,
    date: "Elegí una fecha.",
    futureDate: "La fecha no puede ser futura.",
    dateTaken: "Esa fecha ya tiene un peso. Editá ese registro.",
    fix: "Revisá los campos marcados.",
  },

  errors: {
    unauthorized: "Tu sesión expiró. Iniciá sesión de nuevo.",
    saveFailed: "No se pudo guardar el peso. Probá de nuevo.",
    deleteFailed: "No se pudo eliminar el peso.",
    entryMissing: "Este registro ya no existe.",
    unexpected: "Algo salió mal. Probá de nuevo.",
  },
} as const;
