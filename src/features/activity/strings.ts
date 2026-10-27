/** User-facing copy for the activity feature. Translate here. */
export const activityStrings = {
  title: "Actividad",
  description: "El ejercicio le suma calorías a tu presupuesto del día.",
  logActivity: "Registrar actividad",

  day: {
    totalHeading: "Total de ejercicio",
    entries: "Actividades registradas",
    empty: "Todavía no registraste actividad en este día.",
  },

  weight: {
    using: (kg: string, when: string) => `Las calorías usan tu peso de ${kg} kg (${when}).`,
    missing: "Registrá tu peso para calcular las calorías que queman tus actividades.",
    missingAction: "Registrar peso en Ajustes",
  },

  units: {
    kcal: "kcal",
    minutes: (minutes: string) => `${minutes} min`,
    met: (met: string) => `MET ${met}`,
  },

  add: {
    title: "Registrar actividad",
    close: "Cerrar",
    search: "Buscar actividades",
    searchPlaceholder: "Correr, yoga, natación…",
    catalog: "Actividades",
    noResults: (query: string) => `Ninguna actividad coincide con “${query}”.`,
    back: "Volver a actividades",
  },

  form: {
    minutes: "Duración (minutos)",
    minutesHint: (max: number) => `Minutos enteros, hasta ${max}.`,
    previewHeading: "Calorías quemadas",
    previewEmpty: "Ingresá una duración para ver las kcal.",
    previewBasis: (met: string, kg: string) => `MET ${met} × ${kg} kg`,
    save: "Agregar actividad",
    update: "Guardar cambios",
    saving: "Guardando…",
    activityDeleted:
      "La actividad de este registro se eliminó, así que no podés cambiar la duración. Igual podés eliminarlo.",
    noWeight: "Registrá tu peso en Ajustes para cambiar la duración de este registro. Igual podés eliminarlo.",
  },

  edit: {
    title: "Editar actividad",
    delete: "Eliminar actividad",
    confirmDelete: (label: string) => `¿Eliminar “${label}” de este día?`,
    confirmDeleteAction: "Eliminar",
    deleting: "Eliminando…",
    cancel: "Cancelar",
  },

  validation: {
    required: "Obligatorio.",
    wholeMinutes: "Ingresá minutos enteros.",
    minutesRange: (max: number) => `Ingresá entre 1 y ${max} minutos.`,
    kcalTooLarge: "Es más de lo que admite un solo registro. Dividilo en registros más cortos.",
    fix: "Revisá los campos marcados.",
  },

  errors: {
    unauthorized: "Tu sesión expiró. Iniciá sesión de nuevo.",
    noWeight: "Registrá tu peso en Ajustes antes de agregar actividades.",
    saveFailed: "No se pudo guardar la actividad. Probá de nuevo.",
    dayFull: "Este día ya tiene la cantidad máxima de actividades.",
    deleteFailed: "No se pudo eliminar la actividad.",
    entryMissing: "Este registro ya no existe.",
    activityMissing: "Esta actividad ya no existe.",
    unexpected: "Algo salió mal. Probá de nuevo.",
  },
} as const;
