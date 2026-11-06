# Implementation Plan: Gerenciamento de Pontos Turísticos (SPE-03)

**Branch**: `004-attractions-management` | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-attractions-management/spec.md`

## Summary

Implementar o gerenciamento de pontos turísticos do painel PassaNorte
(RF11–RF15, alinhado ao RF03): listagem paginada em `DataTable` com filtro
por status (server-side) e por categoria, cadastro com localização
selecionável em **mapa Google Maps** (`@vis.gl/react-google-maps` —
biblioteca sancionada pela Constraint 3, decisão do owner: integração com a
lib instalada), categorias do catálogo da API (fonte: interests do turista,
confirmadas por probe), cronograma por dia da semana com HH:MM, `toleranceRadiusM`
opcional e status contratal; edição parcial (PATCH) incluindo status; e
remoção permanente (`DELETE` 204) com confirmação explícita. Camada de
dados client-side via **TanStack Query + túnel BFF** (padrão estabelecido
na SPE-02, REVISÃO 2) e classificador de erro compartilhado. Contrato REAL
extraído do OpenAPI (`contracts/spots-api.md`); pendências resolvidas por
probe na implementação.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Next.js 16.4.3 (App Router) +
React 19.3.0 — versões de `package.json` são a referência (Constraint 1).

**Primary Dependencies**: Tailwind CSS 4 (tokens da SPE-08), **TanStack
Query 5** (queries/mutações, mesmo padrão da SPE-02 rodada 2), TanStack
Table (via `DataTable` transversal implementado), **`@vis.gl/react-google-maps`
1.10.2 — única integração de mapa do painel** (APIProvider/Map/Marker
confirmados nos tipos da lib; chave via `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`,
Princípio III), lucide-react (ícones D11), React Hook Form + Zod
(formulário com limites do contrato: name 1–200, description 1–2000, lat ±90,
lng ±180, HH:MM, categorias ≥1, dias ≥1), componentes de estado e `Button`
de `src/shared/components`, Base UI (diálogos/tooltip), `cn`,
`bff.ts`/`api-error.ts` transversais da SPE-02. Nenhuma nova dependência.

**Storage**: N/A no frontend — a resposta de nenhuma mutação entra em
cache; o cadastro de spot não produz dado sensível (sem LGPD aqui).

**Testing**: nenhum framework configurado (padrão do projeto) — validação
por `quickstart.md` + `pnpm build`/`pnpm lint` (Constraint 6); **probe de
contrato como primeira task** (precisa de credenciais de seed do admin:
catálogo de categorias/correspondência de chaves, vocabulário de `weekday`,
`errorCode`s — pendências da spec).

**Target Platform**: navegador moderno (desktop), `pnpm dev` / build.

**Project Type**: web application — módulo `src/features/attractions`
(`api/`, `components/`, `types/`; sem `actions/` — padrão client-side
da SPE-02 rodada 2), rota real `/(panel)/admin/attractions` substitui o
placeholder.

**Performance Goals**: listagem paginada com cache por página
(`queryKey` composto com página/filtros — revisitas instantâneas);
nenhuma tela travada sem feedback (SC-006); mapa com carregamento
condicionado à existência da chave (`useApiIsLoaded`/lazy).

**Constraints**: nenhuma `fetch` fora de `src/shared/lib` (`bff.ts` client,
Constraint 5); chave do Google Maps APENAS em `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
— nunca em código (Princípio III); sem centro de mapa/categoria/cidade
hard-coded (FR-002, RNF06); enum `SpotStatus` fechado — valor desconhecido
⇒ violação explícita (nunca badge inventado); resposta divergente do
contrato ⇒ `ContractViolationError`; remoção permanente SEMPRE com
confirmação (Princípio V); integração de mapa definida UMA VEZ (Constraint 3
— componente de seletor único, reusado/adaptado pela SPE-07).

**Scale/Scope**: 1 feature module; 1 rota real; 5 endpoints confirmados
(`GET/POST /api/v1/tourist-spots`, `GET/PATCH/DELETE .../{id}`);

+ 1 endpoint de catálogo (`GET /tourists/interest-categories`, pendência de
probe); volume: centenas de pontos — paginação server-side obrigatória;
3 diálogos (cadastro/edição unificados, remoção) + seletor de mapa + editor
de cronograma.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação no design | Status |
| --- | --- | --- |
| I. API como Contrato Único | Contrato REAL registrado em `contracts/spots-api.md`; parsers puros campo a campo (`SpotView`/`SpotListResponse`/`SpotScheduleEntry*`); enum `SpotStatus` fechado; pendências com probe; nenhuma invenção de endpoint (filtro categoria client-side registrado como limitação) | ✅ Pass |
| II. Backend É a Autoridade | O formulário não decide geofencing (raio é campo do contrato com orientação); status/efeito ao turista é backend; remoção permanente é contrato; túnel apenas transporta; 403 ⇒ estado de erro | ✅ Pass |
| III. Sessão Segura, Dados Mínimos | Chave do Google Maps apenas via `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (nunca em código); token anexado apenas server-side (túnel/`http.ts`); sem dados LGPD nesta área | ✅ Pass |
| IV. Feature-Based e Portabilidade | `src/features/attractions` com subpastas convencionadas; transversais reusados (`DataTable`, estados, `QueryProviders`, `api-error.ts`, `bff.ts`, `cn`); **mapa definido UMA VEZ** (componente de seletor único — SPE-07 reusa); nenhuma categoria/centro/cidade hard-coded (RNF06); catálogo da API (RNF06/Princípio IV) | ✅ Pass |
| V. Estados de UI Explícitos | `isPending`/`isError`/vazio/erro distintos na listagem, catálogo e formulário; remoção permanente com confirmação nomeando ponto+efeito; nenhum clique-destrutivo único | ✅ Pass |
| Constraints 1–6 | Stack conforme `package.json` (zero deps novas; Google Maps sancionado); docs Next 16 + TanStack (Query 5, @vis.gl) consultados em research; chamadas client-side só pelo túnel; build/lint como pronto | ✅ Pass |

**Gates pós-Phase 1**: reavaliados no fim de `research.md` — única
ampliação transversal é o **componente de mapa** (`SpotMapPicker` em
`src/features/attractions/components`) — Constraint 3 exige que a
integração seja definida uma única vez NESTA spec; posicionado no módulo
com interface mínima (props de coordenada/callback) para reuso da SPE-07.
Sem violações a justificar em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/004-attractions-management/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── spots-api.md     # Contrato real da API FastAPI (OpenAPI 2026-11-06) + pendências
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (panel)/
│   │   └── admin/
│   │       └── attractions/
│   │           └── page.tsx     # Página fina (Server Component → AttractionsView client)
│   └── api/proxy/[...path]/     # Túnel BFF existente (Constraint 5) — inalterado
├── features/
│   └── attractions/
│       ├── api/
│       │   ├── contract.ts      # Parsers puros: SpotView, SpotListResponse,
│       │   │                    # SpotScheduleEntry, enum fechado SpotStatus
│       │   ├── messages.ts      # describeActionFailure pt-BR (mapeamento de
│       │   │                    # classes→falha é COMPARTILHADO em shared/lib/api-error.ts — I1)
│       │   └── queries.ts       # useSpotsQuery(page/status), useSpotCategoriesQuery
│       │                        # (catálogo, probe), mutações create/update/delete
│       ├── components/          # AttractionsView (orquestra tudo),
│       │                        # SpotFormDialog (create|edit + validação Zod),
│       │                        # SpotMapPicker (ÚNICA integração de mapa — Constraint 3),
│       │                        # ScheduleEditor (dias da semana, HH:MM),
│       │                        # CategorySelector (catálogo da API),
│       │                        # SpotStatusBadge, RowActions (ícones+tooltip),
│       │                        # ConfirmDeleteDialog
│       └── types/               # SpotView, SpotListResponse, SpotStatus, etc.
└── shared/                      # DataTable, QueryProviders, bff.ts, api-error.ts,
                                 # estados, Button (todos da SPE-01/02 — inalterados)
```

**Structure Decision**: estrutura única de app Next.js (backend é outro
repositório). Padrão client-side da SPE-02 rodada 2: leitura e mutações em
TanStack Query via túnel BFF; parsers puros em `contract.ts`; página fina.
Módulo novo `src/features/attractions` — `SpotMapPicker` encapsula a
integração de mapa definida uma única vez (Constraint 3).

## Complexity Tracking

> Sem violações de constituição a justificar.
