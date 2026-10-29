import type { ActivityLevel, Goal, Sex } from "@/domain";

/** Numbers inside copy ("0,8", "1,5") follow the app locale. */
const num = new Intl.NumberFormat("es-AR", { useGrouping: false }).format;

/** User-facing copy for the settings feature. Translate here. */
export const settingsStrings = {
  title: "Ajustes",
  description: "Datos corporales, meta y macros.",
  accountHeading: "Cuenta",

  profile: {
    heading: "Perfil",
    description: "Se usa para estimar tu objetivo diario de calorías.",
    bodyLegend: "Cuerpo",
    sex: "Sexo",
    sexHint: "Lo usa la fórmula del metabolismo basal.",
    sexPlaceholder: "Elegí…",
    birthDate: "Fecha de nacimiento",
    heightCm: "Altura (cm)",
    activityLevel: "Nivel de actividad",
    activityPlaceholder: "Elegí…",
    activityHint: "Tu día a día sin contar entrenamientos: esos se registran en Actividad y se suman aparte.",
    goalLegend: "Meta",
    goal: "Meta de peso",
    goalKgPerWeek: "Ritmo (kg por semana)",
    rateHint: (min: number, max: number) => `Entre ${num(min)} y ${num(max)} kg.`,
    rateEffect: (kcal: string, direction: "below" | "above") =>
      `≈ ${kcal} kcal/día ${direction === "below" ? "por debajo del" : "por encima del"} TDEE.`,
    floorHint: (female: string, male: string) =>
      `El objetivo diario nunca baja de ${female} kcal (mujeres) o ${male} kcal (hombres).`,
    macrosLegend: "Macros",
    proteinGPerKg: "Proteínas (g por kg)",
    proteinHint: (min: number, max: number) =>
      `Gramos por kg de tu último peso, ${num(min)}–${num(max)}. Las proteínas no cambian cuando bajás calorías.`,
    splitHint:
      "Los carbohidratos y las grasas se reparten las calorías que quedan después de las proteínas. Tienen que sumar 100%.",
    carbsSharePct: "Carbohidratos (%)",
    fatSharePct: "Grasas (%)",
    splitTotal: (total: string) => `Total: ${total}%`,
    previewNoWeight: "Registrá tu peso para ver estos objetivos en gramos.",
    previewProtein: (protein: string, kg: string) =>
      `${protein} g de proteínas con ${kg} kg. Completá el perfil para ver carbohidratos y grasas.`,
    previewFull: (kg: string, kcal: string, protein: string, carbs: string, fat: string) =>
      `Con ${kg} kg y ${kcal} kcal: ${protein} g de proteínas, ${carbs} g de carbohidratos, ${fat} g de grasas.`,
    previewCapped:
      "Esta configuración de proteínas necesita más calorías que tu objetivo diario, así que los carbohidratos y las grasas quedarían en 0.",
    save: "Guardar perfil",
    saving: "Guardando…",
    saved: "Perfil guardado. Hoy ya usa estos valores.",
  },

  sexes: { male: "Masculino", female: "Femenino" } satisfies Record<Sex, string>,
  activityLevels: {
    sedentary: "Sedentario (casi todo el día sentado)",
    light: "Ligero (de pie o caminando parte del día)",
    moderate: "Moderado (de pie y en movimiento casi todo el día)",
    active: "Activo (trabajo físico)",
    very_active: "Muy activo (trabajo físico intenso)",
  } satisfies Record<ActivityLevel, string>,
  goals: {
    lose: "Bajar de peso",
    maintain: "Mantener el peso",
    gain: "Subir de peso",
  } satisfies Record<Goal, string>,

  weight: {
    heading: "Peso",
    latest: (kg: string, when: string) => `Último: ${kg} kg (${when})`,
    today: "hoy",
    none: "Todavía no registraste tu peso.",
    kg: "Peso actual (kg)",
    hint: "Se guarda para hoy. Si lo registrás de nuevo hoy, reemplaza el valor de hoy.",
    save: "Registrar peso",
    saving: "Guardando…",
    saved: "Peso guardado.",
  },

  twoFactor: {
    heading: "Verificación en dos pasos",
    off: "Desactivada. Activala para que se pida un código de una app de autenticación después de tu contraseña.",
    on: "Activada. Al iniciar sesión se pide un código de tu app de autenticación.",
    start: "Configurar la verificación en dos pasos",
    starting: "Iniciando…",
    scan: "Escaneá este código QR con tu app de autenticación y después ingresá el código de 6 dígitos que muestra.",
    qrAlt: "Código QR para tu app de autenticación",
    secretLabel: "¿No podés escanearlo? Ingresá esta clave de configuración en la app:",
    code: "Código de verificación",
    confirm: "Activar",
    confirming: "Verificando…",
    disable: "Desactivar la verificación en dos pasos",
    disabling: "Desactivando…",
  },

  validation: {
    required: "Obligatorio.",
    number: "Ingresá un número.",
    wholeNumber: "Ingresá un número entero.",
    date: "Ingresá una fecha válida.",
    birthDateRange: "Ingresá una fecha de nacimiento posterior a 1900.",
    minAge: (years: number) => `Tenés que tener al menos ${num(years)} años.`,
    heightRange: (min: number, max: number) => `Ingresá una altura entre ${num(min)} y ${num(max)} cm.`,
    rateRange: (min: number, max: number) => `Ingresá entre ${num(min)} y ${num(max)} kg por semana.`,
    pctRange: "Ingresá un valor de 0 a 100.",
    proteinRange: (min: number, max: number) =>
      `Ingresá de ${num(min)} a ${num(max)} g por kg, con un decimal como máximo.`,
    splitTotal: (total: number) => `Los carbohidratos y las grasas tienen que sumar 100% (ahora ${num(total)}%).`,
    weightRange: (min: number, max: number) => `Ingresá un peso entre ${num(min)} y ${num(max)} kg.`,
    fix: "Revisá los campos marcados.",
    totpCode: "Ingresá el código de 6 dígitos de tu app de autenticación.",
    totpCodeIncorrect: "Ese código no es válido. Revisá tu app de autenticación y probá de nuevo.",
  },

  errors: {
    unauthorized: "Tu sesión expiró. Iniciá sesión de nuevo.",
    profileSaveFailed: "No se pudo guardar tu perfil. Probá de nuevo.",
    weightSaveFailed: "No se pudo guardar tu peso. Probá de nuevo.",
    twoFactorStartFailed: "No se pudo iniciar la configuración de la verificación en dos pasos. Probá de nuevo.",
    twoFactorConfirmFailed: "No se pudo activar la verificación en dos pasos. Probá de nuevo.",
    twoFactorDisableFailed: "No se pudo desactivar la verificación en dos pasos. Probá de nuevo.",
    twoFactorNeedsCode: "Iniciá sesión de nuevo con el código de tu app de autenticación para desactivarla.",
  },
} as const;
