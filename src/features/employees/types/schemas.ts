// Schemas de validação dos formulários de funcionário (SPE-02, D6):
// limites espelhados do contrato (data-model.md — "name": 1–200;
// "username": 3–100). Módulo puro (sem "use server"): consumido pelo
// diálogo cliente (EmployeeFormDialog) e pelas Server Functions.

import { z } from "zod";

export const employeeFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(200, "Máximo de 200 caracteres."),
  username: z
    .string()
    .trim()
    .min(3, "Mínimo de 3 caracteres.")
    .max(100, "Máximo de 100 caracteres."),
});

export const employeeUpdateSchema = employeeFormSchema.partial();
