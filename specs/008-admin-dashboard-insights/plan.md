# Implementation Plan: Dashboard e Insights (SPE-07)

**Branch**: `008-admin-dashboard-insights` | **Date**: 2026-11-10 | **Spec**: `/specs/008-admin-dashboard-insights/spec.md`

**Input**: Feature specification from `/specs/008-admin-dashboard-insights/spec.md`

## Summary

Painel de visões analíticas exclusivo do administrador (RF06–RF10), uma única
página `(panel)/admin/dashboard` com cinco cards independentes consumindo os
endpoints `GET /api/v1/dashboard/*` (tag `Dashboard`, verificados no OpenAPI
real em 2026-11-10 — nenhum mock): mapa de calor com marcadores graduados
sobre a base OSM da SPE-03; contador de acessos (totais + série em linha);
ranking dia/mês/ano; distribuições por país e por interesses em barras
horizontais. Seletor global de período (hoje/semana/mês/configurável),
atualização sob demanda, estados de carregamento/vazio/erro por card e parse
defensivo do contrato. Gráficos client-side com **Recharts 3.10.1** (já
instalado — research D1, sancionado por emenda da constituição).

## Technical Context

**Language/Version**: TypeScript 5 (strict) sobre Next.js 16.4.3 (App Router) + React 19.3.0 — stack obrigatória da Constraint 1

**Primary Dependencies**: Recharts 3.10.1 (gráficos — já instalado, peer-deps React 19 confirmado no `node_modules`), TanStack Query 5 (dados assíncronos), react-leaflet 5 + leaflet 1.9 (mapa OSM — Constraint 3), lucide-react, `cn` (Constraint 1) — nenhuma dependência nova

**Storage**: N/A — o painel não persiste nada (RNF08; aggregates são todos server-side)

**Testing**: validação por `pnpm build` + `pnpm lint` (Constraint 6) e o roteiro de validação manual do `quickstart.md` (projeto não tem suíte de testes automatizados — padrão das SPE-01..06)

**Target Platform**: Web (desktop do painel administrativo), browser moderno; sessão httpOnly via túnel BFF

**Project Type**: Web app — feature do painel (Single project conforme as features anteriores)

**Performance Goals**: SC-001 (cinco cards carregados/estado legítimo em ≤5s na navegação) e SC-002 (mudança de período refletida em ≤3s por card, sem reload de página)

**Constraints**: RNF13 (estados explícitos), RNF08 (nenhum dado de turista individual no frontend), Princípio I (parse defensivo `contract.ts`), Constraint 3 (mapa OSM único), Constraint 5 (client ⇔ túnel BFF ⇔ API), FR-020 (sem polling; refetch sob demanda)

**Scale/Scope**: 1 página + 5 cards; módulo único `src/features/dashboard`; 5 endpoints read-only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Princípio/Constraint | Status | Evidência |
|---|----------------------|--------|-----------|
| 1 | **Princípio I (Contrato único)** | ✅ Pass | 5 endpoints verificados no OpenAPI real (spec "Contrato da API"); parsers puros em `api/contract.ts` (padrão SPE-02/03/04/05); `contracts/dashboard-api.md` captura campo a campo; compare de contrato (Governança 5) segue na tarefa de encerramento |
| 2 | **Princípio II (Backend autoridade)** | ✅ Pass | Nenhuma agregação/regra duplicada — o painel exibe o retorno; ranking nunca reordenado no cliente; nenhuma coleta de dados brutos (FR-009) |
| 3 | **Princípio III (Sessão segura)** | ✅ Pass | Chamadas client exclusivamente pelo túnel BFF (`bffJson`) — token anexado server-side; nenhum dado sensível de turista exibido (RNF08); nenhum valor de mapa/cidade fixado em código (Princípio IV) |
| 4 | **Princípio IV (Layout)** | ✅ Pass | Tela substitui o placeholder `(panel)/admin/dashboard` já coberto por `roleCanAccess` em `src/proxy.ts`; módulo `src/features/dashboard/{api,components,types}`; estados reusados de `src/shared/components` |
| 5 | **Princípio V (Estados)** | ✅ Pass | Carregando/vazio/erro por card (FR-015); independência de cards; confirmação não aplicável (nenhuma ação destrutiva — read-only) |
| 6 | **Constraint 1 (Stack)** | ⚠️→✅ Resolvido por emenda | **Recharts 3.10.1** já instalado no `package.json` (peer-deps: React 19 ✅); a constituição dizia "nenhuma biblioteca instalada" — emenda MINOR 2.1.0 → **2.2.0** sanciona Recharts na Constraint 4 (justificativa completa em research D1) |
| 7 | **Constraint 3 (Mapas)** | ✅ Pass | Mesma integração OSM (`react-leaflet`+`leaflet`) da SPE-03; extração da base de tiles em `src/shared/components` para uso compartilhado (research D2 — sem segunda integração, tiles sem CDN/chave) |
| 8 | **Constraint 5 (Acesso à API)** | ✅ Pass | Client: `bffFetch`/`bffJson` do túnel `src/app/api/proxy/[...path]`; nenhum `fetch` direto à API na feature |
| 9 | **Constraint 6 (Qualidade)** | ✅ Pass | Gate: `pnpm build` e `pnpm lint` limpos por task; teclado/labels fazem parte das tasks dos cards |
| 10 | **Governança (ordem SPE)** | ✅ Pass | SPE-07 é a próxima em docs/SPECS.md §3 (SPE-01..06 e SPE-08 entregues); dependência declarada SPE-03 (dados de visita via API) atendida |

**Resultado do gate**: ✅ Pass (nenhuma violação pendente após a emenda da Constraint 4 — sem entradas na Complexity Tracking).

## Project Structure

### Documentation (this feature)

```text
specs/008-admin-dashboard-insights/
├── plan.md              # Este arquivo
├── research.md          # Fase 0 — decisões D1–D8
├── data-model.md        # Fase 1 — entidades do dashboard
├── quickstart.md        # Fase 1 — roteiro de validação
├── contracts/
│   └── dashboard-api.md # Fase 1 — contrato dos 5 endpoints (OpenAPI real)
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/(panel)/admin/dashboard/
│   └── page.tsx                     # Tela fina server → DashboardView (substitui placeholder)
├── features/dashboard/
│   ├── api/
│   │   ├── contract.ts              # Parsers defensivos dos 5 payloads (Princípio I)
│   │   ├── queries.ts               # TanStack Query sobre o túnel BFF (5 hooks de leitura)
│   │   └── messages.ts              # Mensagens de estado/erro da feature (pt-BR)
│   ├── components/
│   │   ├── DashboardView.tsx        # Seletor global de período + grid de cards (client)
│   │   ├── DashboardCard.tsx        # Casca interna do card (título/estado/refetch)
│   │   ├── HeatmapCard.tsx          # RF06 — mapa + marcadores graduados
│   │   ├── AccessCountsCard.tsx     # RF07 — totais + série (Recharts LineChart)
│   │   ├── SpotRankingCard.tsx      # RF08 — segmento/Referência/limite + tabela
│   │   ├── CountryDistributionCard.tsx  # RF09 — barras horizontais
│   │   └── InterestDistributionCard.tsx # RF10 — barras horizontais
│   └── types/
│       └── index.ts                 # Tipos do contrato + estado de período
├── shared/components/
│   └── OsmBaseMap/                  # (D2) base de tiles OSM extraída para reuso
└── (reuso) shared/lib/{bff,http,api-error}.ts · shared/components/{LoadingState,
    EmptyState,ErrorState,QueryProviders} · auth/guards via src/proxy.ts
```

**Structure Decision**: página fina (padrão SPE-02/03/04/05) substituindo o
placeholder `(panel)/admin/dashboard`; toda a lógica client em
`src/features/dashboard` com a tripla convencionada `api/`, `components/`,
`types/`. A base de mapa OSM é extraída para `src/shared/components/OsmBaseMap`
(research D2 — componente de mapa usado por ≥2 contextos: SPE-03 picker e
SPE-07 display), mantendo a integração OSM definida uma única vez
(Constraint 3); `SpotLeafletMap` da SPE-03 migra para consumir a base sem
mudar comportamento.

## Complexity Tracking

> Nenhum desvio restante — a única violação potencial (Constraint 4 vs
> Recharts no `package.json`) foi resolvida pela emenda MINOR documentada em
> research D1.
