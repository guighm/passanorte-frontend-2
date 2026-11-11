# Quickstart: Dashboard e Insights (SPE-07)

Roteiro de validação ponta a ponta da feature. Pré-requisitos: backend
FastAPI no ar em `http://localhost:8010` (endpoints `/api/v1/dashboard/*`
— tag `Dashboard`), `.env.local` com `API_BASE_URL`, dados semearáveis
(visitações/acessos/perfis vêm do **app do turista** — coleta é do backend,
FR-009).

```bash
pnpm install
pnpm build && pnpm lint   # gate da Constraint 6 — sem erros
pnpm dev                  # painel em http://localhost:3000
```

Login do administrador (`/login`) → redireção para `/admin/dashboard`
(RF03 — funcionário é bloqueado nas rotas `/admin/*` por `src/proxy.ts`).

## Cenários de validação (spec — Acceptance Scenarios)

### US1 — Mapa de calor (RF06)

1. Com visitas registradas, o card carrega o mapa OSM com um **círculo por
   ponto visitado** (posição = coordenadas da API, raio/cor ∝ `weight`,
   tooltip com `name`) — nenhum dado fabricado. *(AS1, FR-003/004)*
2. Alternar agregação **ponto → região**: marcadores passam a representar
   regiões (`spotId: null`, rótulo da região) mantendo o período vigente.
   *(AS2, FR-005)*
3. Período sem visitas ⇒ **vazio** claro, nunca erro. *(AS3, FR-015)*
4. (Opcional, para parse defensivo) endpoint retornando marcação malformada ⇒
   card em **erro** explícito, sem dado silenciosamente aceito. *(AS4, FR-016)*
5. **Regressão da extração (D2)**: o mapa seletor de pontos da SPE-03
   (`/admin/attractions` → novo/editar ponto) continua funcionando idêntico
   consumindo `OsmBaseMap`.

### US2 — Ranking (RF08)

1. Segmento **dia** (referência hoje): linhas com posição/nome/visitas na
   ordem da API. *(AS1, FR-010/011)*
2. Alternar **mês**/**ano**: lista recarregada pela janela da referência,
   mantendo o limite escolhido. *(AS2)*
3. Mês/ano sem visitas ⇒ vazio claro. *(AS3)*
4. Ajustar limite (padrão 5, domínio 1–100) reflete na resposta. *(AS4)*

### US3 — Contador de acessos (RF07)

1. Escolher **semana**: totais (turistas únicos por dia + total de eventos) +
   **gráfico de linha** da série diária, período visível no card. *(AS1,
   FR-007/008, Q2)*
2. **Configurável**: duas datas inclusivas; `startDate > endDate` não dispara
   query (validação cliente). *(AS2, edge case)*
3. Período sem acessos ⇒ zeros legítimos como **vazio explícito**. *(AS3)*

### US4/US5 — Distribuições (RF09/RF10)

1. Países: **barras horizontais** — país/contagem/% por barra (± arredondamento
   somando ~100%), identificáveis via teclado. *(AS1, FR-012, Q4)*
2. Interesses: barras por `interestKey/interestLabel` com % sobre
   **totalSelections** e nota do multiplicador (>100% explicável). *(AS1/AS2,
   FR-013)*
3. Período sem visitantes ⇒ vazio claro nos dois cards. *(AS2/AS3)*

### Transversais

- **Seletor global (Q1)**: mudar hoje→semana→mês→configurável recarrega os
  quatro cards de janela (≤3s por card — SC-002) sem recarregar a página; o
  ranking mantém seus controles. *(FR-014)*
- **Independência (FR-015)**: parar o backend/quebrar um endpoint ⇒ apenas o
  card correspondente entra em **erro com refetch**; os demais seguem.
- **Sob demanda (FR-020, Q5)**: sem polling — dados atualizam ao entrar na
  página, mudar período/segmento ou recarregar card. Sair/atualizar a aba
  NÃO dispara nada periódico.

## Como semear dados

Via **app do turista** (coleta é do backend — Kotlin + FastAPI, fora deste
repo): registrar acessos (`Passaporte`), visitações em pontos e perfis com
países/interesses. O painel **não** deve ser validado com dados mockados no
frontend (Princípio I) — qualquer endpoint faltando é problema de backend,
exposto como estado de erro do card.

## Compare de contrato (antes de encerrar — Governança 5)

Comparar `contracts/dashboard-api.md` campo a campo contra
`http://localhost:8010/docs` (tag `Dashboard`); divergências atualizam spec +
contrato antes de reexecutar tasks. Já verificado em 2026-11-10 na extração.
