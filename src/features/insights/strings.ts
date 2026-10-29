/** User-facing copy for the AI insights feature. Translate here. */
export const insightsStrings = {
  title: "Resumen con IA",
  description: "Cómo venís en el período elegido y qué podés mejorar, según tus registros.",
  generate: "Generar resumen",
  pending: "Generando resumen…",
  overview: "Cómo venís",
  wins: "Lo que vas bien",
  improvements: "Qué mejorar",
  note: (date: string) => `Generado por IA el ${date}. Es orientativo, no reemplaza a un profesional.`,

  errors: {
    dailyLimit: "Llegaste al límite de intentos de hoy. Probá mañana.",
    busy: "El servicio de IA está ocupado. Probá de nuevo en unos minutos.",
    unavailable: "No se pudo generar el resumen. Probá de nuevo.",
    notEnoughData: "Registrá comidas al menos un día de este período para tener un resumen.",
    invalidRange: "Elegí un período de 7, 30 o 90 días.",
    unauthorized: "Tu sesión expiró. Iniciá sesión de nuevo.",
    unexpected: "Algo salió mal. Probá de nuevo.",
  },
} as const;
