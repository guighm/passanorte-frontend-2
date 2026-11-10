// Schemas de validação de eventos (SPE-04 T011, D7): espelham o contrato
// em contracts/events-api.md — spotId ≥ 1 (ponto obrigatório),
// occurrenceDate `^\d{4}-\d{2}-\d{2}$` (date puro; SEM validação de
// período — datas passadas PERMITIDAS, clarificação 2026-11-10/Princípio
// II), description 1–2000, ticketPrice ≥ 0 com NORMALIZAÇÃO para 2 casas
// (transform — valores com mais casas são arredondados, não bloqueados,
// conforme edge case da spec). Módulo puro.

import { z } from "zod";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD.");

/** Preço: number ≥ 0, NORMALIZADO para 2 casas (ex.: 25.505 ⇒ 25.51) —
 * valores com mais casas são arredondados, não bloqueados (edge case). */
const priceSchema = z
  .number({ message: "Informe o preço do ingresso." })
  .refine((value) => Number.isFinite(value), "Informe um preço válido.")
  .refine((value) => value >= 0, "Preço não pode ser negativo.")
  .transform((value) => Math.round(value * 100) / 100);

export const eventFormSchema = z.object({
  // Seletor obrigatório (FR-005): ponto turístico existente do catálogo.
  spotId: z
    .number({ message: "Selecione o ponto turístico." })
    .int()
    .min(1, "Selecione o ponto turístico."),
  occurrenceDate: dateSchema,
  description: z
    .string()
    .trim()
    .min(1, "Informe a descrição.")
    .max(2000, "Máximo de 2000 caracteres."),
  ticketPrice: priceSchema,
});

export type EventFormValues = z.infer<typeof eventFormSchema>;
