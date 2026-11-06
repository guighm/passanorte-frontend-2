// Tipos da feature employees (SPE-02, data-model.md / contracts/
// employees-api.md — extraído do OpenAPI real em 2026-11-06).
// Princípio II: o painel NUNCA envia papel nem senha — a credencial e o
// papel restrito são gerados pelo backend na criação (RF03/RF04).

/** Status do acesso. Enum aberto até o probe T005 (research D8):
 * "active" confirmado (constante do PATCH); valor revogado a fixar. */
export type EmployeeStatus = string;

/** Status fixado pelo probe de contrato (tasks T005). "revoked" é o
 * rascunho interim (D8 — any ≠ "active" ⇒ revogado até confirmação). */
export const EMPLOYEE_STATUS_ACTIVE = "active";
export const EMPLOYEE_STATUS_REVOKED = "revoked"; // interim — T005 confirma

/** Corpo de `GET /api/v1/employees` (itens), `GET/PATCH .../{id}` —
 * sem campo de senha em qualquer view. (type alias, não interface: linha
 * do DataTable v9 — constraint RowData exige index signature implícita.) */
export type EmployeeView = {
  id: number;
  name: string;
  username: string;
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
};

/** Corpo de `GET /api/v1/employees` — listagem completa (sem filtro/paginação). */
export type EmployeeListResponse = {
  items: EmployeeView[];
  total: number;
};

/** Corpo 201 de `POST /api/v1/employees` — credencial efêmera:
 * `initialPassword` existe APENAS nesta resposta (exibição única, FR-008). */
export type EmployeeCreatedResponse = EmployeeView & {
  initialPassword: string;
};

/** Corpo de `POST /api/v1/employees` — apenas nome e username;
 * "no password field by design (system-generated)" (contrato). */
export interface EmployeeCreateBody {
  name: string;
  username: string;
}

/** Corpo de `PATCH /api/v1/employees/{id}` — parcial; a revogação NÃO é
 * PATCH: `status` só aceita a constante "active"
 * ("reactivation only via status=active"). */
export interface EmployeeUpdateBody {
  name?: string;
  username?: string;
  status?: typeof EMPLOYEE_STATUS_ACTIVE;
}

/** Credencial efêmera transportada UMA única vez ao diálogo (FR-008/D5). */
export interface OneTimeCredential {
  employeeId: number;
  username: string;
  initialPassword: string;
}
