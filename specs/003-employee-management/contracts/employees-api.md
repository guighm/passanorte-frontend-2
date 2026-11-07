# Contrato: Employees API (SPE-02) — extraído do OpenAPI real

**Fonte**: `GET http://localhost:8010/openapi.json` — "Passanorte API"
(OpenAPI 3.1), extraído e registrado em 2026-11-06 (Princípio I da
constituição). **Não é baseline inventado**: este arquivo documenta o
contrato real vigente; pendências de observação da API em execução estão
ao fim, com resolução decidida (probe durante implementação — research D8).

**Autenticação**: security scheme global `HTTPBearer` —
`Authorization: Bearer <accessToken>` em todas as rotas (anexado apenas
server-side, via `src/shared/lib/http.ts` — Constraint 5). Sessão de
funcionário (`employee`) nestas rotas de administração ⇒ **403**
(`AuthorizationDeniedError` — estado de erro da ação; Princípio II).
Sessão expirada ⇒ 401 ⇒ renovação única com replay (`apiFetch`).

**Erros**: payload unificado `ApiError { "errorCode": <string>,
"message": <string>, "details": [] }` (formato confirmado na SPE-01);
exceção documentada: **422 usa `HTTPValidationError` padrão do FastAPI**.
Campos em **camelCase**.

## GET `/api/v1/employees` — listagem completa

- Request: sem parâmetros de query (sem filtro, sem paginação).
- 200 → `EmployeeListResponse`:
  ```json
  { "items": [EmployeeView], "total": 0 }
  ```
  ```json
  // EmployeeView (também corpo de GET/PATCH individual)
  { "id": 1, "name": "…", "username": "…", "status": "active",
    "createdAt": "…", "updatedAt": "…" }
  ```
- Sem campo de senha em qualquer view.

## POST `/api/v1/employees` — criar funcionário (RF04)

- Request (obrigatório):
  ```json
  { "name": "1–200 chars", "username": "3–100 chars" }
  ```
  NÃO há campo de senha nem de papel — descrição do schema:
  "no password field by design (system-generated)". Papel restrito
  atribuído pelo backend na criação (RF03/RF04).
- **201** → `EmployeeCreatedResponse`: `EmployeeView` +
  ```json
  { "initialPassword": "…" }
  ```
  — senha inicial devolvida **apenas nesta resposta** ("one-time
  initial password"); o painel a exibe uma única vez (FR-008) e nunca
  mais (não há reexibição/reset no contrato).
- 422: corpo inválido → `HTTPValidationError`.
- 409/400: username duplicado/inválido → `ApiError`
  (`errorCode` exato: **pendente de probe**).

## GET `/api/v1/employees/{employee_id}` — detalhe

- Path: `employee_id` (integer, obrigatório).
- 200 → `EmployeeView`. 404 (id inexistente) → `ApiError`
  (`errorCode` **pendente de probe**; observável na API real).

## PATCH `/api/v1/employees/{employee_id}` — editar / reativar (RF05)

- Request (corpo **parcial**, tudo opcional):
  ```json
  { "name": "…?", "username": "…?", "status": "active?" }
  ```
  `status` só aceita a constante `"active"` — descrição do schema:
  "reactivation only via status=active". **Revogação NÃO é PATCH.**
- 200 → `EmployeeView` atualizado. 422: corpo/path inválido.

## POST `/api/v1/employees/{employee_id}/revoke` — revogar (RF05)

- Request: sem corpo; path `employee_id`.
- **204** sem corpo — credencial deixa de validar login; efeito sobre
  sessões vigentes é do backend (Princípio II).
- Comportamento em funcionário já revogado (204 idempotente ou erro):
  **pendente de probe**.

## Segurança e privacidade (Princípios II e III)

- `initialPassword` transita uma única vez (resposta 201 → diálogo
  único): NUNCA em logs do frontend, `localStorage`/`sessionStorage`,
  caches persistentes ou relatórios de erro que ecoem payloads
  (RNF08/RNF10, SC-002).
- Hash e validação de senha são do backend (RNF10); o painel nunca vê
  hash, nunca compara, nunca gera senha.
- Auditoria das ações (RNF19) é do backend; o painel apenas informa ao
  operador o resultado das ações.

## Pendências — RESOLVIDAS por probe (2026-11-06, sessão admin real; task T005)

| Pendência | Valor observado (probe) |
| --- | --- |
| `status` de funcionário revogado | **`"revoked"`** (employee "Probe SPE-02", id 5, revoke → 204) |
| Re-revogação | **204 idempotente** (revoke re-enviado sobre id revogado ⇒ 204, sem erro) |
| Username duplicado (criação) | **HTTP 409, `errorCode: "conflict"`, `message: "username already in use"`** |
| `employee_id` inexistente (GET) | **HTTP 404, `errorCode: "resource_not_found"`, `message: "employee not found"`** |
| Formato de `createdAt`/`updatedAt` | **ISO date-time com Z** (`2026-11-07T00:00:50.905206Z`) |
| Reset/renovação de credencial (senha perdida) | **continua inexistente no contrato** — limitação registrada; se o backend adicionar, é emenda desta spec antes de qualquer uso no painel |

> Compare campo a campo concluído (governança 5): valores propagados para
> spec.md (Contrato da API), data-model.md, types (`EMPLOYEE_STATUS_REVOKED
> = "revoked"`) e messages (`conflict` → mensagem pt-BR de username em uso).
