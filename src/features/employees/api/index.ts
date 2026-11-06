// Única camada da feature employees que fala com a API FastAPI
// (Princípio I — SPE-02 T006/T010/T015/T019): contrato REAL de
// contracts/employees-api.md (OpenAPI "Passanorte API" 2026-11-06).
// Todas as chamadas passam por src/shared/lib/http.ts
// (apiJson/apiFetch/throwApiErrorResponse — Constraint 5); nenhuma outra
// pasta monta fetch. Parse defensivo campo a campo: divergência ⇒
// ContractViolationError, nunca dado silenciosamente aceito (research D3).

import {
  ContractViolationError,
} from "@/features/auth/api/errors";
import { apiFetch, apiJson, throwApiErrorResponse } from "@/shared/lib/http";
import {
  EMPLOYEE_STATUS_ACTIVE,
  type EmployeeCreateBody,
  type EmployeeCreatedResponse,
  type EmployeeListResponse,
  type EmployeeUpdateBody,
  type EmployeeView,
} from "@/features/employees/types";

const EMPLOYEES_PATH = "/api/v1/employees"; // caminho final: API_BASE_URL + /api/v1/employees

// ---------------------------------------------------------------- parsers --

function violation(endpoint: string, field: string): ContractViolationError {
  return new ContractViolationError(`${endpoint}: payload fora do contrato (campo "${field}")`);
}

/** Campos exigidos em toda view: id inteiro positivo + 5 strings não-vazias. */
function parseEmployeeView(body: unknown, endpoint: string): EmployeeView {
  if (typeof body !== "object" || body === null) {
    throw new ContractViolationError(`${endpoint}: payload fora do contrato (esperado objeto)`);
  }
  const candidate = body as Record<string, unknown>;
  const id = candidate.id;
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) throw violation(endpoint, "id");
  for (const field of ["name", "username", "status", "createdAt", "updatedAt"] as const) {
    if (typeof candidate[field] !== "string" || (candidate[field] as string).length === 0) {
      throw violation(endpoint, field);
    }
  }
  // Campos excedentes não são violação por si (contrato pode evoluir); os
  // divergentes que IMPORTAM (ausente/tipo errado) já lançaram acima.
  return {
    id,
    name: candidate.name as string,
    username: candidate.username as string,
    status: candidate.status as string,
    createdAt: candidate.createdAt as string,
    updatedAt: candidate.updatedAt as string,
  };
}

function parseEmployeeList(body: unknown, endpoint: string): EmployeeListResponse {
  if (typeof body !== "object" || body === null) {
    throw new ContractViolationError(`${endpoint}: payload fora do contrato (esperado objeto)`);
  }
  const candidate = body as Record<string, unknown>;
  if (!Array.isArray(candidate.items)) throw violation(endpoint, "items");
  if (typeof candidate.total !== "number" || !Number.isInteger(candidate.total)) {
    throw violation(endpoint, "total");
  }
  return {
    items: candidate.items.map((item) => parseEmployeeView(item, endpoint)),
    total: candidate.total,
  };
}

/** 201 de criação: `initialPassword` OBRIGATÓRIO e não-vazio (D5) — sua
 * ausência é violação, nunca "cadastro sem senha exibível". */
function parseEmployeeCreated(body: unknown, endpoint: string): EmployeeCreatedResponse {
  const view = parseEmployeeView(body, endpoint);
  const initialPassword = (body as Record<string, unknown>).initialPassword;
  if (typeof initialPassword !== "string" || initialPassword.length === 0) {
    throw violation(endpoint, "initialPassword");
  }
  return { ...view, initialPassword };
}

// ---------------------------------------------------------------- chamadas --

/** `GET /api/v1/employees` — listagem completa (sem filtro/paginação, FR-003). */
export async function listEmployees(): Promise<EmployeeListResponse> {
  const { data } = await apiJson<unknown>(EMPLOYEES_PATH);
  return parseEmployeeList(data, EMPLOYEES_PATH);
}

/** `POST /api/v1/employees` — cadastro (RF04): envia APENAS { name, username }
 * — sem campo de senha nem de papel ("no password field by design
 * (system-generated)", FR-002/FR-006); o backend gera a credencial e atribui
 * o papel restrito. A resposta 201 traz `initialPassword` (exibição única). */
export async function createEmployee(body: EmployeeCreateBody): Promise<EmployeeCreatedResponse> {
  const { data } = await apiJson<unknown>(EMPLOYEES_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseEmployeeCreated(data, EMPLOYEES_PATH);
}

/** `PATCH /api/v1/employees/{id}` — edição cadastral parcial (RF05/FR-009):
 * o caller decide os campos; esta função apenas transporta o corpo parcial
 * (name 1–200 e/ou username 3–100 — nunca `status` por edição cadastral). */
export async function updateEmployee(id: number, body: EmployeeUpdateBody): Promise<EmployeeView> {
  const path = `${EMPLOYEES_PATH}/${id}`;
  const { data } = await apiJson<unknown>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseEmployeeView(data, path);
}

/** `POST /api/v1/employees/{id}/revoke` — revogação (RF05/FR-010): endpoint
 * dedicado, sem corpo; 204 é o desfecho registrado (a "remoção" do RF05 é
 * revogação — não há exclusão física no contrato, FR-013). 404/erros ⇒
 * classificados em throwApiErrorResponse (re-revogação conforme probe T005). */
export async function revokeEmployee(id: number): Promise<void> {
  const path = `${EMPLOYEES_PATH}/${id}/revoke`;
  const response = await apiFetch(path, { method: "POST" });
  if (!response.ok) {
    await throwApiErrorResponse(response, path);
  }
}

/** Reativação (FR-012): `PATCH` com corpo `{ "status": "active" }` — única
 * constante aceita pelo contrato ("reactivation only via status=active"). */
export function reactivateEmployee(id: number): Promise<EmployeeView> {
  return updateEmployee(id, { status: EMPLOYEE_STATUS_ACTIVE });
}
