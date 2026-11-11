# Research: Dashboard e Insights (SPE-07)

**Feature**: specs/008-admin-dashboard-insights | **Date**: 2026-11-10
**Base**: spec.md (6 clarificações do owner em Clarifications) + contrato REAL
extraído do OpenAPI `http://localhost:8010/openapi.json` (tag `Dashboard`,
2026-11-10 — verificação de primeira mão, `components/schemas` íntegros).

## D1 — Biblioteca de gráficos (Constraint 4): Recharts

**Decision**: **Recharts 3.10.1** — já presente no `package.json`
(`"recharts": "^3.10.1"`, `node_modules/recharts` instalado). Os componentes
usados serão `LineChart`/`Line` (série diária do RF07) e
`BarChart`/`BarChartLayoutVariant="vertical"` + `XAxis`/`YAxis`/`Tooltip`/`LabelList`
(distribuições RF09/RF10), dentro de `"use client"`.

**Rationale**: a decisão pendente da Constraint 4 ("escolha… no plan da SPE-07
e sancionada aqui por emenda") está, na prática, feita — a dependência já está
no projeto (instalação do owner). Peer-dependencies de 3.10.1 declaram
`react ^19.0.0` explicitamente (verificado em `node_modules/recharts/package.json`),
MIT (RNF15), e cobre exatamente os dois tipos de gráfico definidos pelas
clarificações Q2 (linha) e Q4 (barras horizontais) — nenhuma dependência nova
entra. Numerais formatados com `Intl.NumberFormat` pt-BR são props de rótulo,
não exigem lib de formatação.

**Alternatives considered**: @nivo (bundler + D3 completo — peso desnecessário
para 2 tipos de gráfico), visx (muito manual para o escopo), Chart.js via
`react-chartjs-2` (duas dependências + registro global de elementos),
Nova Charts — todos rejeitados: não agregam nada que o Recharts instalado não
cobre, com custo de bundle e de decisão extra.

**Emenda da constituição**: Constraint 4 reescrita para sancionar Recharts;
bump MINOR 2.1.0 → **2.2.0** (novo elemento sancionado na lista de
dependências — mesma régua da emenda `@zxing` 2.1.0 e do `cn` 1.2.0), Sync
Impact Report atualizado; cópia legível em `docs/CONSTITUTION.md` sincronizada.

## D2 — Base de mapa OSM: extração de componente compartilhado

**Decision**: extrair a base de tiles (MapContainer + TileLayer + CSS +
configuração de ícones servidos pelo bundle) para
`src/shared/components/OsmBaseMap/` como componente transversal reusado
(Princípio IV) e **migrar `SpotLeafletMap`/`SpotMapPicker` da SPE-03 para
consumi-la sem mudar comportamento**; o `HeatmapCard` compõe `OsmBaseMap` +
`CircleMarker` por marcador do endpoint (clarificação Q3: sem camada de calor
adicionais — raio/cor proporcionais a `weight`, tooltip com `name`).

**Rationale**: a Constraint 3 exige a integração OSM "definida uma única vez".
Com dois consumidores (SPE-03 picker, SPE-07 display), deixar o `MapContainer`
privado dentro de `SpotLeafletMap` duplicaria a configuração de tiles —
violação direta da régua de reuso. A extração segue o mesmo padrão já usado
na elevação de `ConfirmDeleteDialog`; o leaflet continua inacessível em
`window is not defined` no `Node`, então o módulo base mantém o padrão SPE-03:
importação interna isolada + consumo via `next/dynamic({ ssr: false })`.

**Alternatives considered**: reusar `SpotLeafletMap` diretamente com
`onChange` noop — rejeitado: as props do picker não expressam "mapa
somente-leitura com N marcadores" e acoplariam o picker da SPE-03 ao
dashboard; criar mapa duplicado em `features/dashboard` — rejeitado: segunda
definição de tiles (violaria a Constraint 3 literalmente).

**Risco registrado**: a migração do picker é refactor de comportamento
preservado — a tarefa correspondente só fecha com o mapa da SPE-03
revalidado no browser (roteiro do quickstart da 004).

## D3 — Estado do período global e ciclo de dados

**Decision**: estado do período global (opção nomeada + datas do custom) em
`useState` no `DashboardView`; os hooks do TanStack Query recebem as datas
resolvidas e as incluem nas query keys
(`["dashboard","heatmap",startDate,endDate]` etc.); `refetchOnWindowFocus`
desligado nesse escopo (FR-020 — sem polling/nada automático) e a entrada na
página recarrega (staleTime 0).

**Rationale**: os cinco cards vivem na mesma página — estado React local já
garante coerência, sem precisar de Zustand (nada é compartilhado fora da
rota) nem de URL query (nenhum requisito de deep-link de período). Query key
por parâmetro = refetch automático na mudança de período (SC-002) sem
recarregar a página (FR-014).

**Alternatives considered**: Zustand global — rejeitado: estado não sobrevive
à navegação por requisito nenhum; período na URL — rejeitado: nada o exige e
complicaria página fina.

## D4 — Tradução das janelas nomeadas (hoje/semana/mês) para datas

**Decision**: tradução no cliente com aritmética simples de `Date`
(granularidade de dia, sem fórmula de fuso exótica): hoje = data corrente;
semana corrente = segunda a domingo da semana atual (clarificação da 2ª
sessão de clarify); mês = primeiro/último dia do mês corrente. ISO
`YYYY-MM-DD` calculado por componentes locais do browser.

**Rationale**: o endpoint do contador é o único que aceita o `period`
nomeado — os outros três recebem startDate/endDate, e a clarificação fixou
janelas calêndricas correntes. A diferença de fuso (browser vs cidade)
afeta apenas o limite de dia quando o operador consulta perto da meia-noite —
dado de granularidade diária, aceito e registrado como assunção
(nenhuma lib de data entra por isso — RNF15/Constraint 1: nova dependência
exige justificativa forte, que não existe aqui).

**Alternatives considered**: nova dependência (`date-fns`/`dayjs`) para
cálculo em fuso fixo da cidade — rejeitado: custo de dependência para
granularidade dia; se o compare de contrato demonstrar divergência real de
janela, a correção volta aqui como emenda.

## D5 — Camada de dados: padrão SPE-02..06

**Decision**: `features/dashboard/api/contract.ts` com parsers puros
(`parseHeatmapResponse`, `parseAccessCountsResponse`, `parseSpotRankingResponse`,
`parseVisitorCountriesResponse`, `parseVisitorInterestsResponse`) +
`ContractViolationError`; `api/queries.ts` com 5 hooks de leitura sobre
`bffJson` e query keys estáveis; `types/index.ts` com os tipos espelhando o
contrato. Nenhum mock — os cinco endpoints existem no Swagger real.

**Rationale**: é o padrão consolidado das cinco features anteriores
(attractions/013-006, tours, events, gifts); parse defensivo é Princípio I;
`contracts/dashboard-api.md` é o artefato do compare de contrato
(Governança 5).

**Alternatives considered**: gerar types via openapi-typescript — rejeitado: o
projeto nunca adotou geração; parsers manuais conferem campo a campo no
espírito do Princípio I (não confia em "types" sem validação de runtime).

## D6 — Independência de cards e estados (FR-015)

**Decision**: cada card é query independente (5 hooks) — o erro de um não
afeta os outros; `DashboardCard` (casca interna da feature) orquestra
`LoadingState`/`EmptyState`/`ErrorState` de `src/shared/components` + botão de
refetch (FR-020), com mensagens pt-BR em `api/messages.ts` (padrão
`messages.ts` da SPE-03).

**Rationale**: TanStack Query isola ciclos de vida por hook; o padrão de
estados compartilhados evita novos componentes de estado (Princípio IV).

**Alternatives considered**: ErrorBoundary por card adicional — rejeitado para
o caso normal (erro de rede/contrato chega como exceção da queryFn e vira
estado de erro da query); um `react-error-boundary` envolvendo o grid fica
como rede de segurança para erros de render (padrão QueryProviders).

## D7 — Formatação de números/percentuais (pt-BR)

**Decision**: `Intl.NumberFormat("pt-BR")` para contagens inteiros e
percentual (1 casa decimal), aplicado nos rótulos de barras, totais e ranking;
numerais tabulares via tokens tipográficos da SPE-08.

**Rationale**: nenhuma formatação de gráficos específica é exigida da
biblioteca; `Intl` é plataforma. Sem deps novas.

## D8 — Gates pós-Phase 1 (reavaliação da constituição)

- **Princípio I**: `contracts/dashboard-api.md` extraído do OpenAPI real —
  compare campo a campo segue antes de encerrar a feature (Governança 5).
- **Constraint 3**: `OsmBaseMap` único → zero segunda integração de mapa;
  tarefa de migração do picker com revalidação da SPE-03.
- **Constraint 4**: emenda 2.2.0 aplicada (Recharts sancionado) — revisada
  `docs/CONSTITUTION.md`.
- **Constraint 5**: nenhuma chamada fora do túnel BFF nos hooks; server não
  lê dashboard (nada server-side além da tela fina + guardas de proxy).
- **Gate de build**: cada task de card fecha só com `pnpm build`/`pnpm lint`
  limpos.
