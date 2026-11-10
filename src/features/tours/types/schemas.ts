// Schemas de validação de rotas (SPE-05 — espelham o contrato em
// contracts/gamification-api.md): name 1–200, description 1–2000, spots
// mínimo 1 item com spotId ≥ 1 e displayOrder ≥ 1 (serializada 1..n no
// submit — derivada do índice da lista), prize.name 1–200 + initialStock
// int ≥ 0 (brinde NASCE embutido — FR-005/008). O diálogo de estoque usa
// stockDialogSchema: stockQuantity int ≥ 0 (guarda de reservas é do
// backend — Princípio II). Módulo puro.

import { z } from "zod";

export const routeNameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome da rota.")
  .max(200, "Máximo de 200 caracteres.");

export const routeDescriptionSchema = z
  .string()
  .trim()
  .min(1, "Informe a descrição da rota.")
  .max(2000, "Máximo de 2000 caracteres.");

export const prizeNameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome do brinde.")
  .max(200, "Máximo de 200 caracteres.");

/** Estoque inicial do brinde embutido no cadastro (contrato: int ≥ 0). */
export const initialStockSchema = z
  .number({ message: "Informe o estoque inicial do brinde." })
  .int("Informe um número inteiro.")
  .min(0, "O estoque inicial não pode ser negativo.");

/** Item da lista ordenada — o cliente serializa displayOrder 1..n a
 * partir do índice (nunca digitado). */
export const routeSpotEntrySchema = z.object({
  spotId: z.number().int().min(1),
  displayOrder: z.number().int().min(1),
});

export const routeSpotsSchema = z
  .array(routeSpotEntrySchema)
  .min(1, "Adicione ao menos um ponto turístico à rota.");

/** Valores tipados do formulário de rota (create|edit). Em edição, o
 * brinde é apenas-leitura e NÃO participa do schema/submit. */
export const routeFormSchema = z.object({
  name: routeNameSchema,
  description: routeDescriptionSchema,
  spots: routeSpotsSchema,
  prizeName: prizeNameSchema,
  initialStock: initialStockSchema,
});

export type RouteFormValues = z.infer<typeof routeFormSchema>;

/** Ajuste de estoque (RF20 — PATCH /prizes/{id}); reservas comprometidas
 * são guardadas no backend (422 — pendência P4). */
export const stockDialogSchema = z.object({
  stockQuantity: z
    .number({ message: "Informe a quantidade em estoque." })
    .int("Informe um número inteiro.")
    .min(0, "A quantidade não pode ser negativa."),
});

export type StockDialogValues = z.infer<typeof stockDialogSchema>;
