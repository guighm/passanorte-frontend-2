// Camada de dados client-side da feature employees (SPE-02 rodada 2,
// T006/T009/T011/T013 — research D10): TanStack Query sobre o túnel BFF
// (bff.ts — Constraint 5, única via client-side). Leitura cacheada em
// ["employees"]; mutações com invalidação pós-sucesso (FR-005 — a UI
// reflete o estado retornado pela API, nada otimista não confirmado).
// A resposta de CRIAÇÃO (com initialPassword) NUNCA entra no cache
// (Princípio III/SC-002 — o valor flui do mutateAsync ao diálogo único).

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { bffFetch, bffJson } from "@/shared/lib/bff";
import {
  parseEmployeeCreated,
  parseEmployeeList,
  parseEmployeeView,
} from "@/features/employees/api/contract";
import { EMPLOYEE_STATUS_ACTIVE, type EmployeeView } from "@/features/employees/types";

const EMPLOYEES_QUERY_KEY = ["employees"] as const;
const EMPLOYEES_PATH = "api/v1/employees"; // caminho upstream (via túnel /api/proxy/...)

// ---------------------------------------------------------------- leitura --

async function fetchEmployees(): Promise<ReturnType<typeof parseEmployeeList>> {
  const { data } = await bffJson<unknown>(EMPLOYEES_PATH);
  return parseEmployeeList(data, `/${EMPLOYEES_PATH}`);
}

/** Listagem cacheada (US1/FR-003); revisitas vêm do cache, novas tentativas
 * por ação do operador (refetch — Princípio V, `retry: false` no provider). */
export function useEmployeesQuery() {
  return useQuery({ queryKey: EMPLOYEES_QUERY_KEY, queryFn: fetchEmployees });
}

// ---------------------------------------------------------------- mutações --

function useInvalidateEmployees(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY });
  };
}

export interface CreateEmployeeInput {
  name: string;
  username: string;
}

/** Cadastro (US2/RF04): envia APENAS { name, username } — "no password
 * field by design (system-generated)", sem campo de papel (FR-002/FR-006);
 * o backend gera a credencial e atribui o papel restrito. A resposta 201
 * (com initialPassword) não é cacheada — mutação (D10/Princípio III). */
export function useCreateEmployeeMutation(): UseMutationResult<
  ReturnType<typeof parseEmployeeCreated>,
  unknown,
  CreateEmployeeInput
> {
  const invalidate = useInvalidateEmployees();
  return useMutation({
    mutationFn: async ({ name, username }) => {
      const { data } = await bffJson<unknown>(EMPLOYEES_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username }),
      });
      return parseEmployeeCreated(data, `/${EMPLOYEES_PATH}`);
    },
    onSuccess: invalidate,
  });
}

export interface UpdateEmployeeInput {
  id: number;
  body: { name?: string; username?: string };
}

/** Edição cadastral parcial (US3/FR-009): corpo contém SOMENTE os campos
 * alterados (name 1–200 e/ou username 3–100 — nunca `status`). */
export function useUpdateEmployeeMutation(): UseMutationResult<EmployeeView, unknown, UpdateEmployeeInput> {
  const invalidate = useInvalidateEmployees();
  return useMutation({
    mutationFn: async ({ id, body }) => {
      const path = `${EMPLOYEES_PATH}/${id}`;
      const { data } = await bffJson<unknown>(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return parseEmployeeView(data, `/${path}`);
    },
    onSuccess: invalidate,
  });
}

/** Revogação (US4/FR-010): endpoint dedicado, 204 sem corpo — a "remoção"
 * do RF05 é revogação (não há exclusão física, FR-013); re-revogação
 * conforme probe T005. */
export function useRevokeEmployeeMutation(): UseMutationResult<void, unknown, number> {
  const invalidate = useInvalidateEmployees();
  return useMutation({
    mutationFn: async (id) => {
      // 204 sem corpo; não-ok (401/403/demais) é lançado por bffFetch
      await bffFetch(`${EMPLOYEES_PATH}/${id}/revoke`, { method: "POST" });
    },
    onSuccess: invalidate,
  });
}

/** Reativação (US4/FR-012): PATCH com `{ "status": "active" }` — única
 * constante aceita ("reactivation only via status=active"). */
export function useReactivateEmployeeMutation(): UseMutationResult<EmployeeView, unknown, number> {
  const invalidate = useInvalidateEmployees();
  return useMutation({
    mutationFn: async (id) => {
      const path = `${EMPLOYEES_PATH}/${id}`;
      const { data } = await bffJson<unknown>(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: EMPLOYEE_STATUS_ACTIVE }),
      });
      return parseEmployeeView(data, `/${path}`);
    },
    onSuccess: invalidate,
  });
}
