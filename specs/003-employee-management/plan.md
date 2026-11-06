# Implementation Plan: Gerenciamento de Funcionários (SPE-02)

**Branch**: `003-employee-management` | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-employee-management/spec.md`

## Summary

Implementar o gerenciamento de funcionários do painel PassaNorte (RF04, RF05,
alinhado ao RF03): listagem em `DataTable` (nome, nome de usuário, status,
datas — ordem alfabética por nome, estável), cadastro com credencial gerada
**pelo backend** e exibição **uma única vez** de usuário + senha inicial
(Princípios II, III e V), edição cadastral parcial (PATCH) com aviso de
reemissão de credencial ao alterar username, revogação de acesso com
confirmação explícita e reativação (decidida na clarificação 2026-11-06).
Papel restrito (`employee`) é atribuição **exclusiva do backend** na criação
— o painel não envia campo de papel. Contrato extraído do OpenAPI real da
"Passanorte API" (`http://localhost:8010`, `GET /openapi.json`) em
2026-11-06 e registrado em `contracts/employees-api.md`; estados de UI
(carregamento/vazio/erro) reusam os componentes transversais da SPE-01
(Princípio V).

**REVISÃO 2 (2026-11-06, decisão do owner — supersedes research D2 p/
esta feature):** camada de dados passa a ser **client-side** —
**TanStack Query** (`useQuery` para leitura com cache, `useMutation`
para criar/editar/revogar/reativar) consumindo exclusivamente o túnel
BFF da SPE-01 (`/api/proxy/[...path]`), com invalidação de cache
(`invalidateQueries`) no lugar de `revalidatePath`; **lucide-react**
para ícones das ações (biblioteca já sancionada na Constraint 1).
Pesquisa: D10/D11 em `research.md`.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Next.js 16.4.3 (App Router) +
React 19.3.0 — versões de `package.json` são a referência (Constraint 1).

**Primary Dependencies**: Tailwind CSS 4 (tokens tipográficos da SPE-08 já
em `globals.css`), TanStack Table (implementa o `DataTable` transversal —
research D1, já implementado), **TanStack Query 5 (REVISÃO 2 — uso ativo
nesta feature: cache de `useQuery` + `useMutation` via túnel BFF)**,
**lucide-react (REVISÃO 2 — ícones das ações)**, React Hook Form + Zod
(formulários com validação espelhando os limites do contrato: nome 1–200,
username 3–100), componentes de estado e `Button` de `src/shared/components`,
`cn` de `src/shared/lib`. Base UI para primitivos de diálogo/modais.
`eslint-config-next` 16.4.3, pnpm 12. Nenhuma nova dependência.

**Storage**: N/A no frontend — persistência exclusiva do backend; a UI não
mantém cache persistente de nenhuma credencial (Princípio III: `initialPassword`
existe apenas no estado efêmero do diálogo de credencial única).

**Testing**: nenhum framework de teste configurado (decisão da SPE-01 em
research). Validação: cenários de `quickstart.md` executados manualmente
contra a API real + `pnpm build` e `pnpm lint` sem erros (Constraint 5).

**Target Platform**: navegador moderno (desktop), servido por `pnpm dev` /
`pnpm build && pnpm start`.

**Project Type**: web application (App Router, feature-based em
`src/features/employees` + transversais em `src/shared`).

**Performance Goals**: listagem com cache client-side (revisitas
instantâneas do cache do TanStack Query; primeira visita usa
`isLoading` distinto) e invalidação pós-operação (SC-001, SC-006);
nenhuma tela travada sem feedback (SC-006).

**Constraints**: credencial exibida uma única vez e nunca persistida/logada
(Princípios III e V, SC-002) — **a resposta de criação NUNCA entra no
cache do QueryClient** (mutação não é cacheada; o valor trafega do
`onSuccess` ao estado do diálogo e morre com ele); papel nunca enviado
pelo painel (FR-002); chamadas client-side EXCLUSIVAMENTE pelo túnel BFF
(`/api/proxy/[...path]` — Constraint 5, caminho único de renovação
401/403 server-side); resposta fora do contrato é erro explícito
(`ContractViolationError`/parse defensivo client-side idêntico ao
server-side — Princípio I); APIs deprecated do Next 16 não usadas
(Constraint 2).

**Scale/Scope**: 1 feature module (`src/features/employees`), 1 rota real
(`/admin/employees` substitui o placeholder da SPE-01), 5 endpoints
confirmados (`GET/POST /api/v1/employees`,
`GET/PATCH /api/v1/employees/{id}`, `POST /api/v1/employees/{id}/revoke`),
2 diálogos de confirmação (revogação, reativação), 1 diálogo de credencial
única. Volume: ordem de dezenas de funcionários (Assumptions da spec).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação no design | Status |
| --- | --- | --- |
| I. API como Contrato Único | Contrato extraído do OpenAPI real (2026-11-06) e registrado em `contracts/employees-api.md`; parse defensivo campo a campo (agora também client-side — REVISÃO 2): payload divergente vira `ContractViolationError`, nunca dado silencioso; 403/401 continuam classificados server-side pelo túnel | ✅ Pass |
| II. Backend É a Autoridade | Painel NÃO envia papel/password — backend gera credencial e atribui `employee`; revogação/reativação pelo backend; túnel BFF apenas transporta (NUNCA reinterpreta payload — Princípio II); guardas da SPE-01 reforçados; 403 ⇒ estado de erro | ✅ Pass |
| III. Sessão Segura, Dados Mínimos | `initialPassword` só transita na resposta de criação → do `onSuccess` da mutação ao estado do diálogo único — **NUNCA no cache do QueryClient**, sem localStorage/logs; sessão anexada apenas server-side pelo túnel; hash/senha do backend (RNF10) | ✅ Pass |
| IV. Feature-Based e Portabilidade | Código em `src/features/employees` com subpastas convencionadas; transversais novos em `src/shared` (`DataTable`, provider do QueryClient, cliente do túnel); ícones via lucide-react (sancionado); nenhum utilitário duplicado | ✅ Pass |
| V. Estados de UI Explícitos | `isLoading`/`isPending`/`isError` do TanStack Query mapeados para `LoadingState`/`EmptyState`/`ErrorState` distintos; revogação/reativação com confirmação; credencial única com aviso (Princípio V) | ✅ Pass |
| Constraints 1–6 | Stack conforme `package.json` (zero deps novas); docs Next 16 + TanStack (Table v9, Query 5) consultados; chamadas client-side por caminho único (túnel); `pnpm build`/`lint` sem erros como pronto | ✅ Pass |

**Gates pós-Phase 1**: reavaliados no fim de `research.md` — ampliações
transversais (todas do tipo permitido pelo Princípio IV — utilitário
compartilhado, não duplicado por feature): (1) parse do `ApiError` em
`src/shared/lib/http.ts` (rodada 1); (2) REVISÃO 2 — `QueryProviders`
(client) + `src/shared/lib/api-error.ts` (classificador puro compartilhado)
+ `src/shared/lib/bff.ts` (cliente do túnel, sem duplicação com a
`http.ts`). Sem violações a
justificar em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/003-employee-management/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── employees-api.md # Contrato real da API FastAPI (OpenAPI 2026-11-06)
│                        # + pendências resolvidas por probe (SPE-02)
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (panel)/
│   │   ├── layout.tsx           # Monta <QueryProviders> (REVISÃO 2) ao redor do shell
│   │   └── admin/
│   │       └── employees/
│   │           └── page.tsx     # Fina (Server Component): renderiza EmployeesView
│   │                            # (cacheComponents/Next 16: leitura de dados é client-side)
│   └── api/proxy/[...path]/     # Túnel BFF da SPE-01 — caminho ÚNICO das chamadas
│                                # client-side (Constraint 5): anexa sessão, renovação
│                                # 401+replay, 403 passthrough; nunca interpreta payload
├── features/
│   └── employees/
│       ├── api/
│       │   ├── contract.ts      # Parsers puros do contrato (client-safe, compartilhados)
│       │   ├── queries.ts       # useEmployees (useQuery) + mutações (useMutation)
│       │   └── messages.ts      # Mapeamento desfecho → mensagem de UI (já existe)
│       ├── components/          # EmployeesView (usa queries), EmployeeFormDialog,
│       │                        # OneTimeCredentialDialog, diálogos de confirmação,
│       │                        # EmployeeStatusBadge, RowActions (ícones lucide-react)
│       └── types/               # EmployeeView, EmployeeCreatedResponse, EmployeeStatus
└── shared/
    ├── components/
    │   ├── DataTable/index.tsx  # Genérico v9 (implementado, T003)
    │   └── QueryProviders/index.tsx  # NOVO (transversal, REVISÃO 2): QueryClientProvider
    └── lib/
        ├── http.ts              # Server-side (demais features + Server Functions) —
        │                        # delega classificação a api-error.ts
        ├── api-error.ts         # NOVO (REVISÃO 2, U1): classificador puro do payload
        │                        # de erro (ApiError/422/inválido) — único em uso
        └── bff.ts               # NOVO (client-safe, REVISÃO 2): fetch pelo túnel +
                                 # classificação via api-error.ts (sem duplicação)
```

**Structure Decision** (REVISÃO 2): estrutura única de app Next.js — o
backend é um repositório à parte. Leitura e mutações client-side via
**TanStack Query** consumindo EXCLUSIVAMENTE o túnel BFF (Constraint 5 —
a sessão e a renovação 401 continuam anexadas server-side pelo túnel,
que apenas transporta o payload). Server Functions ficam em `http.ts`
server-side para features futuras que as exijam; nesta feature o
`features/employees/actions` (Server Functions + revalidatePath) é
SUBSTITUÍDO por `queries.ts` (invalidação de cache no lugar do
`revalidatePath` — FR-005). Parser puro `contract.ts` é compartilhado;
nenhuma `fetch` fora de `src/shared/lib` (`http.ts` server / `bff.ts`
client).

## Complexity Tracking

> Sem violações de constituição a justificar.
