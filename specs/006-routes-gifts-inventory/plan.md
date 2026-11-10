# Implementation Plan: Rotas Turísticas e Estoque de Brindes (SPE-05)

**Branch**: `006-routes-gifts-inventory` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-routes-gifts-inventory/spec.md`

## Summary

Implementar a administração de rotas turísticas e estoque de brindes do
painel PassaNorte (RF18–RF20, RBAC admin da SPE-01): listagem em `DataTable`
com alternador "exibir arquivadas" (`includeArchived`), indicador claro de
saldo do brinde (destaque distinto para esgotado = 0, clarificação Q2),
cadastro e edição em **páginas dedicadas com rota própria**
(`admin/tours`, `admin/tours/new`, `admin/tours/[routeId]/edit` —
clarificação Q1 da especificação) com lista ordenada de pontos turísticos
montável a partir do catálogo da SPE-03 e **reordenada por botões
subir/descer** (clarificação Q3 — sem arrastar-e-soltar, sem dependência
nova), brinde **nascido embutido na rota** (nome + estoque inicial, não
editável pós-criação) e remoção como **arquivamento** com confirmação
explícita (`DELETE` 204). Ajuste de estoque (`PATCH /prizes/{id}`) via **ação
na linha da listagem** (clarificação da 2ª sessão — sem página de detalhe).
A baixa de estoque na concessão é do backend (RF21/SPE-06) — o painel apenas
reflete o saldo. Camada de dados client-side via **TanStack Query + túnel
BFF** (padrão SPE-02 rodada 2 / SPE-03 / SPE-04); parsers puros campo a
campo; contrato REAL extraído do OpenAPI (tag `Gamification`,
`contracts/gamification-api.md`, 2026-11-10) com pendências resolvidas por
probe na implementação.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Next.js 16.4.3 (App Router) +
React 19.3.0 — versões de `package.json` são a referência (Constraint 1);
documentação vigente em `node_modules/next/dist/docs/` lida antes do código
(Constraint 2, AGENTS.md).

**Primary Dependencies**: Tailwind CSS 4 (tokens da SPE-08), **TanStack
Query 5** (queries/mutações — padrão estabelecido SPE-02 rodada 2, SPE-03,
SPE-04), TanStack Table via `DataTable` transversal, React Hook Form + Zod
(formulário com limites do contrato: `name` 1–200, `description` 1–2000,
`spots` mínimo 1 item com `spotId` ≥ 1 e `displayOrder` ≥ 1 serializado
1..n, `prize.name` 1–200, `initialStock` ≥ 0, `stockQuantity` ≥ 0),
componentes de estado e `Button` de `src/shared/components`, Base UI
(diálogos de confirmação de arquivamento e de ajuste de estoque), `cn`,
`bff.ts`/`api-error.ts` transversais. **Zero dependência nova** (Constraint
1): reordenação por botões não exige biblioteca de drag-and-drop (clarificação Q3).

**Storage**: N/A no frontend — nenhuma resposta entra em cache além do
TanStack Query por `queryKey`; rotas/brindes não produzem dado sensível de
turista (sem LGPD aqui).

**Testing**: nenhum framework configurado (padrão do projeto) — validação
por `quickstart.md` + `pnpm build`/`pnpm lint` (Constraint 6); **probe de
contrato como primeira task** (valores de `status` ativa × arquivada;
efeito do `DELETE /api/v1/tourist-spots` sobre rotas que referenciam o
ponto; `PATCH /prizes/{id}` com rota arquivada; mensagens de erro do 422 de
estoque abaixo de reservas — pendências em `contracts/gamification-api.md`).

**Target Platform**: navegador moderno (desktop), `pnpm dev` / build.

**Project Type**: web application — módulo `src/features/tours`
(`api/`, `components/`, `types/`), rotas `/(panel)/admin/tours` (listagem,
**substitui o placeholder da SPE-01**), `/(panel)/admin/tours/new` e
`/(panel)/admin/tours/[routeId]/edit` (páginas dedicadas — clarificação Q1);
**sem página de detalhe em leitura** (clarificação da 2ª sessão — a edição
é a única superfície de leitura da lista ordenada).

**Performance Goals**: listagem com cache por alternador (`queryKey`
composto `["routes", includeArchived]` — revisitais instantâneas); catálogo
de pontos do formulário em cache compartilhado (uma carga por sessão, hook
reusado da SPE-04); nenhuma tela travada sem feedback; submits com botão em
estado de progresso e trava de duplo envio; saldo exibido imediatamente
após mutação por invalidação da query de rotas (SC-004).

**Constraints**: nenhuma `fetch` fora de `src/shared/lib` (`bff.ts` client,
Constraint 5); resposta divergente do contrato ⇒ `ContractViolationError`
(Princípio I — parsers puros campo a campo); **brinde só nasce com a rota**
(contrato: sem `POST/GET /prizes` independente — nenhum catálogo de brindes
inventado); **brinde não editável** pós-criação (só `stockQuantity` via
`PATCH /prizes/{id}`); remoção = arquivamento com confirmação que nomeia a
rota (Princípio V); rotas arquivadas não-editáveis e sem ajuste de estoque
exposto na UI (backend nega com 404 — probe confirmará); a baixa de estoque
é **exclusivamente** do backend (Princípio II — painel reflete `stockQuantity`);
PATCH de rota envia somente campos alterados; duplicata de ponto impedida no
construtor da lista (residual registrado da 3ª passada de clarify);
sem paginação de rotas (contrato: lista única, YAGNI).

**Scale/Scope**: 1 feature module novo; 3 rotas reais (listagem + 2
dedicadas); 5 endpoints do contrato (POST/GET/PATCH/DELETE `/gamification/routes*`,
`PATCH /gamification/prizes/{id}`) + catálogo de pontos reusado da SPE-03/04;
volume: poucas dezenas de rotas (lista única sem paginação); 1 formulário
dedicado com construtor de lista reordenável, 2 diálogos (confirmação de
arquivamento — `ConfirmDeleteDialog` transversal da SPE-04; ajuste de estoque).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação no design | Status |
| --- | --- | --- |
| I. API como Contrato Único | Contrato REAL registrado em `contracts/gamification-api.md` (OpenAPI 2026-11-10, tag `Gamification`); parsers puros campo a campo (`TouristRouteView`/`RouteListResponse`); **NÃO existe** catálogo de brindes independente no contrato (sem POST/GET /prizes) e o design não inventa; pendências com probe; `ContractViolationError` para payload divergente | ✅ Pass |
| II. Backend É a Autoridade | Baixa de estoque na concessão é do backend (RF21) — painel só exibe `stockQuantity`; guarda de estoque ≥ reservas é backend (422 traduzido em mensagem); arquivamento e autorização (403) são backend; PATCH parcial por diff; túnel apenas transporta | ✅ Pass |
| III. Sessão Segura, Dados Mínimos | Token anexado apenas server-side (túnel BFF); sem mapa/chave nesta feature (Constraint 3 não se aplica); sem dados LGPD | ✅ Pass |
| IV. Feature-Based e Portabilidade | `src/features/tours` com subpastas convencionadas; rotas dentro da árvore `(panel)/admin/tours` (substituindo o placeholder da SPE-01 — árvore do Princípio IV); transversais reusados (`DataTable`, estados, `QueryProviders`, `api-error.ts`, `bff.ts`, `cn`, `ConfirmDeleteDialog` já elevado na SPE-04); catálogo de pontos da API (RNF06 — nada fixado no código); **reuso entre features sancionado**: `useSpotCatalogQuery` e `SpotSelector`/`spot-name` importados de `@/features/events` (mesmo padrão de `events` → `attractions`), `parseSpotListResponse` de `@/features/attractions` | ✅ Pass |
| V. Estados de UI Explícitos | `isPending`/`isError`/vazio/erro distintos na listagem, catálogo e formulário; confirmação de arquivamento nomeia a rota e descreve o efeito real (arquivamento com histórico — não exclusão física); ajuste de estoque preserva valor anterior em erro (422 acionável); botões em progresso trava duplo envio; esgotado (0) destacado de forma não confundível | ✅ Pass |

**Gates pós-Phase 1**: reavaliados no fim de `research.md` — nenhuma
mudança transversal (nenhum componente precisa ser elevado a `shared`;
`ConfirmDeleteDialog` já é transversal desde a SPE-04). Zero dependência
nova. Sem violações a justificar em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/006-routes-gifts-inventory/
├── plan.md                    # This file (/speckit-plan command output)
├── research.md                # Phase 0 output (/speckit-plan command)
├── data-model.md              # Phase 1 output (/speckit-plan command)
├── quickstart.md              # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── gamification-api.md    # Contrato real da API FastAPI (OpenAPI 2026-11-10) + pendências
├── checklists/
│   └── requirements.md        # Spec quality checklist (/speckit-specify + clarify)
└── tasks.md                   # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (panel)/
│   │   └── admin/
│   │       └── tours/
│   │           ├── page.tsx             # Listagem (Server Component fino → ToursView client)
│   │           │                        # — SUBSTITUI o placeholder da SPE-01
│   │           ├── new/
│   │           │   └── page.tsx         # Cadastro dedicado (clarificação Q1)
│   │           └── [routeId]/
│   │               └── edit/
│   │                   └── page.tsx     # Edição dedicada (clarificação Q1; única
│   │                                    # superfície de leitura da lista ordenada)
│   └── api/proxy/[...path]/             # Túnel BFF existente (Constraint 5) — inalterado
├── features/
│   ├── tours/
│   │   ├── api/
│   │   │   ├── contract.ts              # Parsers puros: TouristRouteView,
│   │   │   │                            # RouteListResponse, RouteCreateBody,
│   │   │   │                            # RouteUpdateBody, PrizeStockUpdateBody
│   │   │   ├── messages.ts              # describeActionFailure — mapeamento pt-BR
│   │   │   │                            # (classes base compartilhadas em
│   │   │   │                            # shared/lib/api-error.ts)
│   │   │   └── queries.ts               # useRoutesQuery({ includeArchived }),
│   │   │                                # useRouteQuery(routeId) [carrega edição],
│   │   │                                # mutações create/update/archive/
│   │   │                                # updatePrizeStock, useInvalidateTours
│   │   ├── components/
│   │   │   ├── ToursView.tsx            # Listagem + alternador "exibir arquivadas"
│   │   │   │                            # + indicador de saldo (esgotado em destaque)
│   │   │   │                            # + RowActions (editar, ajustar estoque,
│   │   │   │                            # arquivar)
│   │   │   ├── RouteForm.tsx            # Formulário dedicado (create|edit) — RHF+Zod
│   │   │   ├── RouteSpotList.tsx        # Construtor da lista ordenada: adicionar/
│   │   │   │                            # remover/reordenar por botões subir/descer
│   │   │   │                            # (duplicatas impedidas); teclado acessível
│   │   │   ├── RouteStockDialog.tsx     # Ajuste de estoque em diálogo (ação da linha)
│   │   │   └── prize-label.tsx          # Indicador de saldo (número + esgotado em
│   │   │                                # destaque — clarificação Q2)
│   │   └── types/                       # TouristRouteView, RouteListResponse,
│   │                                    # RouteCreateBody, RouteUpdateBody,
│   │                                    # PrizeStockUpdateBody (schemas.ts do Zod)
│   ├── events/                          # INALTERADO — useSpotCatalogQuery,
│   │                                    # SpotSelector e spot-name importados
│   │                                    # por tours (reuso, Princípio IV)
│   └── attractions/                     # INALTERADO — parseSpotListResponse reusado
└── shared/
    ├── components/                      # ConfirmDeleteDialog (SPE-04), DataTable,
    │                                    # estados, Button, QueryProviders — inalterados
    └── lib/                             # bff.ts, api-error.ts, cn.ts, http.ts — inalterados
```

**Structure Decision**: estrutura única de app Next.js (backend é outro
repositório). Padrão client-side estabelecido (SPE-02 rodada 2, SPE-03,
SPE-04): leitura e mutações em TanStack Query via túnel BFF; parsers puros
em `contract.ts`; páginas Server Component finas. Módulo novo
`src/features/tours` (nome do módulo segue a árvore de rotas do Princípio
IV — `admin/tours`, placeholder da SPE-01 substituído; entidade canônica
permanece "rota turística"/`TouristRoute`). Páginas dedicadas por
clarificação do owner (spec Q1), no padrão da SPE-04 — sem página de
detalhe (clarificação da 2ª sessão). Reuso entre features: catálogo de
pontos e seletor de `@/features/events`, parsers de `@/features/attractions`
(D1/D6 do research — cadeia de reuso no mesmo formato sancionado na
SPE-04). Nota: implementação deve seguir as convenções do guia atual do
App Router (`node_modules/next/dist/docs/`) e não as de versões antigas do
framework (AGENTS.md/Constraint 2).

## Complexity Tracking

> Sem violações de constituição a justificar.
