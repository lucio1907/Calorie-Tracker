import type { MissingProfileField } from "./lib/today-summary";

/** User-facing copy for the today feature. Translate here. */
export const todayStrings = {
  title: "Hoy",
  logFood: "Registrar comida",
  remainingLabel: "Te queda por comer hoy",
  overLabel: "Te pasaste del objetivo de hoy",
  kcalUnit: "kcal",
  targetHeading: "Objetivo diario",
  targetBreakdown: {
    tdee: "TDEE",
    lose: (kgPerWeek: string) => `− Bajar ${kgPerWeek} kg/semana`,
    gain: (kgPerWeek: string) => `+ Subir ${kgPerWeek} kg/semana`,
    floor: (minimum: string) => `+ Ajuste al mínimo seguro (${minimum} kcal)`,
    target: "= Objetivo",
  },
  belowBmrWarning: (bmr: string) =>
    `Tu objetivo está por debajo de tu metabolismo basal (${bmr} kcal). Comer tan poco durante mucho tiempo es difícil de sostener; considerá un ritmo más lento.`,
  equation: {
    target: "Objetivo",
    food: "Comida",
    exercise: "Ejercicio",
    /** Food comes off the budget, exercise adds to it. */
    foodValue: (kcal: string) => `−${kcal}`,
    exerciseValue: (kcal: string) => `+${kcal}`,
  },
  macrosHeading: "Macros",
  macros: {
    protein: "Proteínas",
    carbs: "Carbohidratos",
    fat: "Grasas",
  },
  /** Follows the consumed grams: "90,3 / 207 g". */
  macroTarget: (target: string) => ` / ${target} g`,
  proteinCappedWarning: (gPerKg: string) =>
    `Tu configuración de proteínas (${gPerKg} g/kg) necesita más calorías que tu objetivo diario, así que las proteínas se limitan al objetivo y los carbohidratos y las grasas quedan en 0. Bajala en Ajustes.`,
  setupMessage: "Completá tu perfil para obtener un objetivo diario de calorías.",
  missingFields: {
    sex: "sexo",
    birthDate: "fecha de nacimiento",
    height: "altura",
    activityLevel: "nivel de actividad",
    weight: "peso",
  } satisfies Record<MissingProfileField, string>,
  missing: (fields: readonly string[]) => `Falta: ${fields.join(", ")}.`,
  setupAction: "Completar perfil",
  underageMessage: (minAgeYears: number) =>
    `Tenés que tener ${minAgeYears} años o más para obtener un objetivo de calorías. Actualizá tu fecha de nacimiento en Ajustes.`,
  underageAction: "Actualizar fecha de nacimiento",
} as const;
