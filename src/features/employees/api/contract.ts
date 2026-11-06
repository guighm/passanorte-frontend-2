// Parsers puros do contrato de funcionários (SPE-02 T002 — extraídos de
// api/index.ts da rodada 1 e movidos para módulo client-safe): sem
// imports de `http.ts` nem de qualquer dependência de servidor —
// consumidos tanto por `features/employees/api/queries.ts` (client)
// quanto por qualquer leitura server-side futura. Regras idênticas
// (research D3): divergência de contrato ⇒ ContractViolationError,
// nunca dado silenciosamente aceito (Princípio I).

import { ContractViolationError } from "@/features/auth/api/errors";
import type {
  EmployeeCreatedResponse,
  EmployeeListResponse,
  EmployeeView,
} from "@/features/employees/types";

function violation(endpoint: string, field: string): ContractViolationError {
  return new ContractViolationError(`${endpoint}: payload fora do contrato (campo "${field}")`);
}

/** Campos exigidos em toda view: id inteiro positivo + 5 strings não-vazias
 * (sem campo de senha em qualquer view). */
export function parseEmployeeView(body: unknown, endpoint: string): EmployeeView {
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
  return {
    id,
    name: candidate.name as string,
    username: candidate.username as string,
    status: candidate.status as string,
    createdAt: candidate.createdAt as string,
    updatedAt: candidate.updatedAt as string,
  };
}

/** `GET /api/v1/employees` → `{ items: EmployeeView[], total }` (sem filtro/
 * paginação — painel exibe a lista completa). */
export function parseEmployeeList(body: unknown, endpoint: string): EmployeeListResponse {
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
export function parseEmployeeCreated(body: unknown, endpoint: string): EmployeeCreatedResponse {
  const view = parseEmployeeView(body, endpoint);
  const initialPassword = (body as Record<string, unknown>).initialPassword;
  if (typeof initialPassword !== "string" || initialPassword.length === 0) {
    throw violation(endpoint, "initialPassword");
  }
  return { ...view, initialPassword };
}
