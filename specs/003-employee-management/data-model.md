# Data Model: Gerenciamento de Funcionários (SPE-02)

**Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Fonte: contrato real `contracts/employees-api.md` (OpenAPI "Passanorte API",
2026-11-06). O painel não persiste nada — este modelo descreve o que
transita e como é validado/exibido.

## EmployeeView (entidade Funcionário)

Corpo de `GET /api/v1/employees` (itens), `GET/PATCH .../{id}`.

| Campo | Tipo (contrato) | Validado no parse | Exibido na UI |
| --- | --- | --- | --- |
| `id` | integer | inteiro positivo, obrigatório | não (identifica linha) |
| `name` | string | string não-vazia, obrigatório | coluna Nome (ordenável — D7) |
| `username` | string | string não-vazia, obrigatório | coluna Usuário |
| `status` | string | string não-vazia, obrigatório; enum aberto até probe (D8) | badge ativo/revogado (FR-011) |
| `createdAt` | string (não tipado no OpenAPI) | string não-vazia | coluna Criado em |
| `updatedAt` | string (não tipado no OpenAPI) | string não-vazia | coluna Atualizado em |

- Campo **ausente ou de tipo inesperado** ⇒ `ContractViolationError`
  identificado por endpoint + campo (Princípio I, edge case da spec).
- **Sem campo de senha** em qualquer view — senha existe apenas como
  `initialPassword` na resposta de criação (abaixo).

## EmployeeListResponse (listagem)

`GET /api/v1/employees` → `{ "items": EmployeeView[], "total": integer }`.

- Sem parâmetros de query (sem filtro/paginação) — painel exibe a lista
  completa, total do payload exibido; ordenação de exibição alfabética
  por `name` (client-side, estável — D7).
- `total` discrepante de `items.length` NÃO é violação por si (contrato
  não garante correspondência 1:1), mas é renderizado como retornado.

## EmployeeCreateRequest (cadastro — RF04)

`POST /api/v1/employees` → corpo enviado pelo painel **apenas**:

| Campo | Regras (contrato) | Validação no cliente (Zod espelhada) |
| --- | --- | --- |
| `name` | string 1–200 | obrigatório, 1–200 |
| `username` | string 3–100 | obrigatório, 3–100 |

- **NÃO há campo de senha nem de papel** ("no password field by design
  (system-generated)") — painel nunca os envia (FR-002/FR-006,
  Princípios II/III).
- O backend gera a senha e atribui o papel restrito `employee`
  (valores de papel confirmados na SPE-01) — sem pontos turísticos e
  sem dashboard (RF03/RF04).

## EmployeeCreatedResponse (201 — credencial efêmera)

`EmployeeView` + `initialPassword: string` — a senha inicial existe
**apenas nesta resposta**.

| Campo | Tratamento no painel |
| --- | --- |
| campos de `EmployeeView` | parse padrão; listagem revalidada após diálogo |
| `initialPassword` | obrigatório no parse (vazio/ausente ⇒ violação de contrato) — transportado **uma única vez** ao `OneTimeCredentialDialog`; nenhum cache/persistência/log (D5, FR-008, SC-002) |

## EmployeeUpdateRequest (edição/reativação — RF05)

`PATCH /api/v1/employees/{id}` → corpo parcial:

| Campo | Regras |
| --- | --- |
| `name` | opcional, 1–200 |
| `username` | opcional, 3–100 |
| `status` | opcional; **apenas a constante `"active"`** ("reactivation only via status=active") |

- Edição cadastral: painel inclui no corpo **apenas os campos
  alterados** (FR-009, D6); alterar `username` dispara aviso de
  reemissão de credencial no diálogo.
- Reativação: corpo `{ "status": "active" }` — sempre com confirmação
  explícita (FR-012).
- **Revogação NÃO é PATCH** — endpoint dedicado abaixo.

## Ciclo de vida do status

```text
                 POST /employees (backend gera credencial, papel employee)
                         │
                         ▼
                    [ "active" ] ──── PATCH { status: "active" } ────┐
                         │                                            │
        POST /{id}/revoke│ (204)                                      │
                         ▼                                            │
                   [ revogado* ] ◀────────────────────────────────────┘
                         (valor exato a confirmar por probe — D8)
```

- Revogação não apaga dados cadastrais (editável em revogado — US3.3).
- Re-revogar funcionário já revogado: comportamento a confirmar no
  probe (204 idempotente ou erro — D8); painel reflete o resultado.
- Efeito de sessões vigentes do funcionário revogado é decisão do
  backend (Princípio II); o painel não infere nada.
- Não existe exclusão física no contrato (FR-013).

## Credencial (entidade efêmera)

Par `username` + senha inicial, válido para login (RF02):
- exibido **uma única vez** após criação (diálogo com aviso e copiar);
- nunca reexibida/regenerada (contrato não oferece reset — pendência
  registrada); perda da senha ⇒ limitação conhecida, não mecanismo de
  recuperação inventado no painel;
- com TanStack Query (REVISÃO 2 — research D10): a resposta de criação
  **NUNCA entra no cache do QueryClient** — o valor flui do `onSuccess`
  da mutação ao estado do diálogo e morre com ele (Princípio III/SC-002).

## Relações

- `Employee` 1—1 `Credencial de login` (gerenciada pelo backend; o
  painel só vê `username`).
- Nenhuma relação com pontos/eventos/rotas nesta feature.
