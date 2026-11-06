"use server";

// Server Functions da feature employees (SPE-02 T011/T016/T020, research
// D2): mutações via src/shared/lib/http.ts — renovação 401, 403 e
// divergência de contrato classificadas server-side em UM ponto. Em
// sucesso, revalidatePath("/admin/employees") reflete o estado retornado
// pela API (FR-005 — nada otimista não confirmado). Erros NÃO são
// relançados: viram EmployeeActionFailure (classificação serializável
// preservando errorCode — research D4); SessãoEndedError redireciona ao
// login (FR-007, helper da fundação).

import { revalidatePath } from "next/cache";
import {
  ApiRequestError,
  ApiUnavailableError,
  AuthorizationDeniedError,
  ContractViolationError,
} from "@/features/auth/api/errors";
import { redirectToLoginIfSessionEnded } from "@/shared/lib/http";
import {
  createEmployee,
  reactivateEmployee,
  revokeEmployee,
  updateEmployee,
} from "@/features/employees/api";
import { describeActionFailure, type EmployeeActionFailure } from "@/features/employees/api/messages";
import { employeeFormSchema, employeeUpdateSchema } from "@/features/employees/types/schemas";
import type { OneTimeCredential } from "@/features/employees/types";

const EMPLOYEES_PAGE = "/admin/employees";

export type {
  EmployeeActionFailure,
  EmployeeActionKind,
} from "@/features/employees/api/messages";

export type EmployeeActionResult<T> = ({ ok: true } & T) | EmployeeActionFailure;

function ok<T>(payload: T): { ok: true } & T {
  return { ok: true, ...payload };
}

/** Erro do lado das Server Functions classificado uma única vez. */
function failureOf(error: unknown): EmployeeActionFailure {
  if (error instanceof ApiRequestError) {
    if (error.errorCode === "validation_error") {
      return { ok: false, kind: "validation", status: error.status, errorCode: error.errorCode, message: "Dados inválidos." };
    }
    return {
      ok: false,
      kind: "api",
      status: error.status,
      errorCode: error.errorCode,
      backendMessage: error.backendMessage,
      message: error.backendMessage,
    };
  }
  if (error instanceof AuthorizationDeniedError) {
    return { ok: false, kind: "denied", message: "Ação não autorizada para o papel da sessão." };
  }
  if (error instanceof ContractViolationError) {
    return { ok: false, kind: "contract", message: error.message };
  }
  if (error instanceof ApiUnavailableError) {
    return { ok: false, kind: "unavailable", message: error.message };
  }
  return { ok: false, kind: "api", message: "Falha inesperada ao falar com a API." };
}

function parseIntId(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) return null;
  return value;
}

// ---------------------------------------------------------------- cadastro --

export async function createEmployeeAction(input: unknown): Promise<EmployeeActionResult<OneTimeCredential>> {
  const parsed = employeeFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, kind: "validation", message: "Dados inválidos: revise os campos." };
  }
  try {
    const created = await createEmployee({ name: parsed.data.name, username: parsed.data.username });
    revalidatePath(EMPLOYEES_PAGE);
    // Credencial devolvida UMA ÚNICA vez ao caller (FR-008/D5): o valor
    // mora só no estado do OneTimeCredentialDialog — nunca em log,
    // cache ou localStorage (SC-002). Logs registram apenas o desfecho
    // e o username (RNF08/Princípio III).
    return ok({ employeeId: created.id, username: created.username, initialPassword: created.initialPassword });
  } catch (error) {
    redirectToLoginIfSessionEnded(error);
    return failureOf(error);
  }
}

// ------------------------------------------------------------------ edição --

export async function updateEmployeeAction(
  id: number,
  input: unknown,
): Promise<EmployeeActionResult<{ username: string }>> {
  const employeeId = parseIntId(id);
  if (employeeId === null) {
    return { ok: false, kind: "validation", message: "Funcionário inválido." };
  }
  const parsed = employeeUpdateSchema.safeParse(input);
  if (!parsed.success || (parsed.data.name === undefined && parsed.data.username === undefined)) {
    return { ok: false, kind: "validation", message: "Envie ao menos um campo alterado." };
  }
  const body: { name?: string; username?: string } = {};
  if (parsed.data.name !== undefined) body.name = parsed.data.name;
  if (parsed.data.username !== undefined) body.username = parsed.data.username;
  try {
    const updated = await updateEmployee(employeeId, body);
    revalidatePath(EMPLOYEES_PAGE);
    return ok({ username: updated.username });
  } catch (error) {
    redirectToLoginIfSessionEnded(error);
    return failureOf(error);
  }
}

// ----------------------------------------------- revogação e reativação --

export async function revokeEmployeeAction(id: number): Promise<EmployeeActionResult<{ status: string }>> {
  const employeeId = parseIntId(id);
  if (employeeId === null) {
    return { ok: false, kind: "validation", message: "Funcionário inválido." };
  }
  try {
    await revokeEmployee(employeeId);
    revalidatePath(EMPLOYEES_PAGE);
    return ok({ status: "revoked" });
  } catch (error) {
    redirectToLoginIfSessionEnded(error);
    return failureOf(error);
  }
}

export async function reactivateEmployeeAction(id: number): Promise<EmployeeActionResult<{ status: string }>> {
  const employeeId = parseIntId(id);
  if (employeeId === null) {
    return { ok: false, kind: "validation", message: "Funcionário inválido." };
  }
  try {
    const updated = await reactivateEmployee(employeeId);
    revalidatePath(EMPLOYEES_PAGE);
    return ok({ status: updated.status });
  } catch (error) {
    redirectToLoginIfSessionEnded(error);
    return failureOf(error);
  }
}
