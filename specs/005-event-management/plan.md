# Implementation Plan: Gerenciamento de Eventos (SPE-04)

**Branch**: `005-event-management` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-event-management/spec.md`

## Summary

Implementar o gerenciamento de eventos do painel PassaNorte (RF16–RF17,
RBAC admin da SPE-01): listagem em `DataTable` com filtro por ponto
turístico (server-side via `spotId`), cadastro e edição em **páginas
dedicadas com rota própria** (`admin/events`, `admin/events/new`,
`admin/events/[eventId]/edit` — clarificação 2026-11-10) com formulário
único de 4 campos (ponto, data de ocorrência, descrição, preço do ingresso),
seletor de pontos carregando **todas as páginas** do catálogo paginado da
SPE-03, resolução do nome do ponto na listagem via vínculo `spotId`
(fallback "ponto turístico não encontrado") e remoção permanente com
confirmação explícita. Camada de dados client-side via **TanStack Query +
túnel BFF** (padrão SPE-02 rodada 2 / SPE-03); edição parcial (PATCH)
enviando somente campos alterados; remoção física (`DELETE` 204). Contrato
REAL extraído do OpenAPI (`contracts/events-api.md`, extraído
2026-11-10); 4 pendências resolvidas por probe na implementação.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Next.js 16.4.3 (App Router) +
React 19.3.0 — versões de `package.json` são a referência (Constraint 1);
documentação vigente em `node_modules/next/dist/docs/` lida antes do código
(Constraint 2, AGENTS.md).

**Primary Dependencies**: Tailwind CSS 4 (tokens da SPE-08), **TanStack
Query 5** (queries/mutações — padrão estabelecido SPE-02 rodada 2 e
SPE-03), TanStack Table via `DataTable` transversal, React Hook Form + Zod
(formulário com limites do contrato: `spotId` ≥ 1 obrigatório,
`occurrenceDate` formato `date`, `description` 1–2000, `ticketPrice` ≥ 0 —
2 casas), componentes de estado e `Button` de `src/shared/components`,
Base UI (diálogo de confirmação), `cn`, `bff.ts`/`api-error.ts`
transversais. Nenhuma nova dependência (Constraint 1). Sem mapa — nenhum
elemento da Constraint 3 se aplica; **sem nova integração externa**.

**Storage**: N/A no frontend — nenhuma resposta entra em cache além do
TanStack Query por filtro; evento não produz dado sensível (sem LGPD aqui).

**Testing**: nenhum framework configurado (padrão do projeto) — validação
por `quickstart.md` + `pnpm build`/`pnpm lint` (Constraint 6); **probe de
contrato como primeira task** (erros unificados 401/403/404/409/422;
aceitação de `ticketPrice` como string; comportamento do `DELETE
/api/v1/tourist-spots` com eventos pendentes — pendências 1–4 da spec).

**Target Platform**: navegador moderno (desktop), `pnpm dev` / build.

**Project Type**: web application — módulo `src/features/events`
(`api/`, `components/`, `types/`), rotas `/(panel)/admin/events` (listagem,
substitui o placeholder da SPE-01), `/(panel)/admin/events/new` e
`/(panel)/admin/events/[eventId]/edit` (clarificação FR-013).

**Performance Goals**: listagem com cache por filtro (`queryKey` composto
`["events", spotId]` — revisitas instantâneas, SC-001); seletor de pontos
com catálogo completo em cache compartilhado (uma carga por sessão);
nenhuma tela travada sem feedback; submit com botão em estado de progresso
e trava de duplo envio (SC-003).

**Constraints**: nenhuma `fetch` fora de `src/shared/lib` (`bff.ts` client,
Constraint 5); resposta divergente do contrato ⇒ `ContractViolationError`
(Princípio I — parsers puros campo a campo); datas passadas permitidas
(clarificação Q1 — sem validação de período no cliente, Princípio II);
edição PATCH apenas com campos alterados (contrato: campos omitidos
permanecem); remoção permanente SEMPRE com confirmação que nomeia o evento
(Princípio V); filtro por faixa de datas FORA do escopo (Assumption —
contrato suporta, UI não expõe nesta fase); sem paginação de eventos
(contrato sem paginação — lista única ordenada).

**Scale/Scope**: 1 feature module novo; 3 rotas reais (listagem + 2
dedicadas); 5 endpoints confirmados (`POST/GET /api/v1/events`,
`PATCH/DELETE /api/v1/events/{event_id}`) + catálogo de pontos paginado
reusado da SPE-03; volume: centenas de eventos (lista única sem paginação,
ordenação `occurrenceDate,id` da API); 1 formulário único (não wizard —
Assumption), 1 diálogo (confirmação de remoção).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação no design | Status |
| --- | --- | --- |
| I. API como Contrato Único | Contrato REAL registrado em `contracts/events-api.md` (OpenAPI 2026-11-10); parsers puros campo a campo (`EventView`/`EventListResponse`); pendências com probe; **sem endpoint de detalhe no contrato** (`GET /events` lista apenas — edição resolve o evento pela listagem, research D4); nenhuma invenção de endpoint | ✅ Pass |
| II. Backend É a Autoridade | Sem regra de período de data no cliente (clarificação Q1); revalidação do ponto (404/409) e regra "fechado permanentemente" são backend; PATCH parcial por diff — o que muda o estado é o backend; túnel apenas transporta | ✅ Pass |
| III. Sessão Segura, Dados Mínimos | Token anexado apenas server-side (túnel BFF); sem mapa/CHAVE nesta feature; sem dados LGPD; preço é dado público | ✅ Pass |
| IV. Feature-Based e Portabilidade | `src/features/events` com subpastas convencionadas; rotas dentro da árvore `(panel)/admin/events` (Princípio IV — FR-013); transversais reusados (`DataTable`, estados, `QueryProviders`, `api-error.ts`, `bff.ts`, `cn`); catálogo de pontos da API (RNF06 — nada fixado no código); **reuso entre features sancionado**: parsers/`SPOT_PAGE_SIZE` importados de `@/features/attractions` (nenhum parser de `SpotView` duplicado); `ConfirmDeleteDialog` elevado a `src/shared/components` (componente transversal reusado antes de novo — Princípio IV; pequena mudança em SPE-03, import update) | ✅ Pass |
| V. Estados de UI Explícitos | `isPending`/`isError`/vazio/erro distintos na listagem, catálogo e formulário; confirmação de remoção nomeia vínculo+ponto (vínculo resolvido) e data; botão em progresso trava duplo envio; 404/409 com mensagens acionáveis preservando formulário | ✅ Pass |
| Constraints 1–6 | Stack conforme `package.json` — **zero dependência nova**; docs Next 16 + TanStack (Query 5) consultados; chamadas client-side só pelo túnel; build/lint como pronto; a11y (labels, teclado) na definição de pronto | ✅ Pass |

**Gates pós-Phase 1**: reavaliados no fim de `research.md` — única
mudança transversal é a **remoção do `ConfirmDeleteDialog` do módulo
attractions para `src/shared/components`** (generalização: props recebem
título/rótulos, `SpotView`→item genérico). SPE-03 passa a importar do lugar
novo; `pnpm build`/`lint` das duas features pelo mesmo gate (Constraint 6).
Sem violações a justificar em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/005-event-management/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── events-api.md    # Contrato real da API FastAPI (OpenAPI 2026-11-10) + pendências
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit-specify + clarificações)
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (panel)/
│   │   └── admin/
│   │       └── events/
│   │           ├── page.tsx             # Listagem (Server Component fino → EventsView client)
│   │           ├── new/
│   │           │   └── page.tsx         # Cadastro dedicado (clarificação FR-013)
│   │           └── [eventId]/
│   │               └── edit/
│   │                   └── page.tsx     # Edição dedicada (clarificação FR-013)
│   └── api/proxy/[...path]/             # Túnel BFF existente (Constraint 5) — inalterado
├── features/
│   ├── events/
│   │   ├── api/
│   │   │   ├── contract.ts              # Parsers puros: EventView, EventListResponse,
│   │   │   │                            # EventCreateBody, EventUpdateBody
│   │   │   ├── messages.ts              # describeActionFailure — mapeamento pt-BR específico
│   │   │   │                            # (classes base compartilhadas em shared/lib/api-error.ts)
│   │   │   └── queries.ts               # useEventsQuery(spotId), useEventQuery(id),
│   │   │                                # useSpotCatalogQuery (todas as páginas, cache único),
│   │   │                                # mutações create/update/delete
│   │   ├── components/
│   │   │   ├── EventsView.tsx           # Listagem + filtro por ponto + RowActions
│   │   │   ├── EventForm.tsx            # Formulário único (create|edit) — RHF+Zod
│   │   │   ├── SpotSelector.tsx         # Seletor do catálogo completo (todas as páginas)
│   │   │   └── spot-name.ts             # Resolução spotId→nome (fallback identificável)
│   │   └── types/                       # EventView, EventListResponse, EventCreateBody,
│   │                                    # EventUpdateBody (schemas.ts do Zod)
│   └── attractions/                     # INALTERADO — parsers/SPOT_PAGE_SIZE importados
│                                        # por events (reuso, Princípio IV)
└── shared/
    ├── components/
    │   ├── ConfirmDeleteDialog/         # ELEVADO de attractions (generalizado):
    │    └── ...                         # transversal Princípio IV — attractions importa daqui
    ├── DataTable/                       # SPE-01 — inalterado
    ├── QueryProviders/                  # SPE-02 — inalterado
    └── lib/                             # bff.ts, api-error.ts, cn.ts, http.ts — inalterados
```

**Structure Decision**: estrutura única de app Next.js (backend é outro
repositório). Padrão client-side estabelecido (SPE-02 rodada 2, SPE-03):
leitura e mutações em TanStack Query via túnel BFF; parsers puros em
`contract.ts`; páginas Server Component finas. Módulo novo
`src/features/events` — com rotas dedicadas por clarificação do owner
(FR-013), padrão distinto dos diálogos da SPE-03 (decisão registrada em
research D3). Reuso entre features: parsers de `SpotView`/`SPOT_PAGE_SIZE`
de `@/features/attractions` (D6) e `ConfirmDeleteDialog` elevado a
transversal (D5). Nota: implementação deve seguir as convenções do guia
atual do App Router (`node_modules/next/dist/docs/`) e não as de versões
antigas do framework (AGENTS.md/Constraint 2).

## Complexity Tracking

> Sem violações de constituição a justificar.
