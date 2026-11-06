// Schemas de validação de pontos turísticos (SPE-03 T013, D6): espelham o
// contrato em contracts/spots-api.md — name 1–200, description 1–2000,
// latitude −90…90, longitude −180…180, toleranceRadiusM >0 (opcional),
// categories ≥1, schedule ≥1 entrada HH:MM (`^\d{2}:\d{2}$`) com
// fechamento APÓS abertura, status enum dos 3 valores. Módulo puro.

import { z } from "zod";
import { SPOT_STATUSES } from "@/features/attractions/types";

const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Use o formato HH:MM.");

export const spotFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(200, "Máximo de 200 caracteres."),
  description: z
    .string()
    .trim()
    .min(1, "Informe a descrição.")
    .max(2000, "Máximo de 2000 caracteres."),
  latitude: z
    .number({ message: "Informe a latitude." })
    .min(-90, "Latitude fora da faixa (−90…90).")
    .max(90, "Latitude fora da faixa (−90…90)."),
  longitude: z
    .number({ message: "Informe a longitude." })
    .min(-180, "Longitude fora da faixa (−180…180).")
    .max(180, "Longitude fora da faixa (−180…180)."),
  toleranceRadiusM: z
    .number({ message: "Raio deve ser um número de metros." })
    .positive("Raio deve ser maior que zero.")
    .nullish(), // opcional do contrato (ausente ⇒ backend decide)
  categories: z
    .array(z.string().min(1))
    .min(1, "Selecione ao menos uma categoria do catálogo."),
  schedule: z
    .array(
      z
        .object({
          weekday: z.string().min(1),
          opensAt: timeSchema,
          closesAt: timeSchema,
        })
        .refine((entry) => entry.opensAt < entry.closesAt, {
          message: "Fechamento deve ser APÓS a abertura.",
        }),
    )
    .min(1, "Inclua ao menos um dia no cronograma."),
  status: z.enum(SPOT_STATUSES, { message: "Escolha um dos três status." }),
});

export const spotUpdateSchema = spotFormSchema.partial();
