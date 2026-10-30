import type { InsightInput } from "./insight-input";
import { DATA_GUIDE, NULL_RULE, PROFILE_RULE, SAFETY_RULES } from "./insight-prompt";
import { ANSWER_LIMITS, type QuestionKey } from "./insight-questions";

/** Each question as the model reads it, with the fields its answer should rest on. */
const QUESTIONS: Record<QuestionKey, string> = {
  weight:
    "¿Por qué mi peso no cambia como espero? Basate en weight (changeKg frente a expectedChangeKg), el balance de calorías y la meta; si no hay pesos, explicá que hace falta pesarse al menos dos veces en el período.",
  protein:
    "¿Cómo llego a mi objetivo de proteína? Basate en macros (averageProteinG frente a targetProteinG) y proponé formas concretas de sumar la proteína que falta en el día, con alimentos comunes y porciones aproximadas en gramos.",
  weekend:
    "¿Cómo mejoro mis fines de semana? Basate en weekPattern (fin de semana frente a días de semana); si no hay fines de semana registrados, sugerí registrarlos para poder compararlos.",
  consistency:
    "¿Cómo registro con más constancia? Basate en logging, loggedDays y rangeDays, y proponé hábitos simples para registrar todos los días.",
};

/** System and user messages for one predefined question; the user message is the same anonymous input as the summary's. */
export function buildQuestionMessages(input: InsightInput, question: QuestionKey): { system: string; user: string } {
  const system = [
    ...DATA_GUIDE,
    NULL_RULE,
    "",
    `Pregunta: ${QUESTIONS[question]}`,
    "",
    "Respondé solo un objeto JSON, sin texto fuera del JSON y sin bloques de código, con esta forma exacta:",
    '{"answer": string, "tips": string[]}',
    `- answer: la respuesta a la pregunta, en 2 a 4 oraciones (máximo ${ANSWER_LIMITS.answer} caracteres), citando los números de la persona.`,
    `- tips: hasta ${ANSWER_LIMITS.tips} acciones concretas para los próximos días (máximo ${ANSWER_LIMITS.tip} caracteres cada una).`,
    "",
    "Reglas:",
    ...SAFETY_RULES,
    PROFILE_RULE,
    "- Respondé solo la pregunta; si los datos no alcanzan para responderla, decilo y sugerí qué registrar.",
  ].join("\n");
  return { system, user: JSON.stringify(input) };
}
