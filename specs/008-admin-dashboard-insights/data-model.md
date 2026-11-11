# Data Model: Dashboard e Insights (SPE-07)

**Feature**: specs/008-admin-dashboard-insights | **Date**: 2026-11-10
**Fonte das entidades**: contrato REAL do OpenAPI (`contracts/dashboard-api.md`)
— o frontend **não persiste nada** (RNF08): todas as entidades abaixo são
somente-leitura na superfície do painel, consumidas via túnel BFF.

## Visão geral

```text
PeriodSelection (estado de cliente, não entidade da API)
   │  alimenta query keys de
   ├── HeatmapMarker[]            ← GET /dashboard/heatmap
   ├── AccessCountsResponse       ← GET /dashboard/access-counts
   └── CountryShare / InterestShare ← GET /dashboard/visitor-{countries,interests}
SpotRanking ← GET /dashboard/spot-ranking (segmento próprio, não usa o período global)
```

## Entidades (somente-leitura)

### HeatmapMarker — marcador do mapa de calor (RF06)

| Campo | Tipo | Regra | Uso na UI |
|-------|------|-------|-----------|
| `spotId` | `number \| null` | inteiro; `null` ⇒ marcador de região (`groupBy=region`) | chave do marcador (`region:${index}` quando nulo) |
| `name` | `string` | nome público do ponto ou rótulo da região | tooltip/legenda — nunca fabricado |
| `latitude` | `number` | coordenada da API | posição no `OsmBaseMap` |
| `longitude` | `number` | coordenada da API | posição no `OsmBaseMap` |
| `weight` | `int ≥ 0` | peso de visitas (ordem decrescente de envio) | raio/cor do `CircleMarker` (Q3 — proporcional) |

Validação do parser: `name` string não vazia; `latitude` ∈ [−90,90];
`longitude` ∈ [−180,180]; `weight` inteiro ≥ 0; `spotId` inteiro positivo
ou `null`. Divergência ⇒ `ContractViolationError` (card em erro).

### AccessCounts — contador de acessos (RF07)

| Campo | Tipo | Regra | Uso na UI |
|-------|------|-------|-----------|
| `period` | `string` | eco do `period` enviado (`today/week/month/custom`) | rótulo do período vigente (FR-008) |
| `uniqueTouristDays` | `int ≥ 0` | turistas únicos por dia na janela | número em destaque (numeral tabular) |
| `totalAccessEvents` | `int ≥ 0` | total de eventos de acesso | número em destaque |
| `daily[]` | `AccessDailyCount[]` | ascendente, só dias COM eventos; vazio ⇒ lista vazia | gráfico de linha compacto (Q2) |

**AccessDailyCount**: `date` (ISO), `uniqueTourists` (int ≥ 0),
`accessEvents` (int ≥ 0).

### RankingItem — linha do ranking (RF08)

| Campo | Tipo | Regra | Uso na UI |
|-------|------|-------|-----------|
| `position` | `int ≥ 1` | posição oficial do backend — **nunca recalculada no cliente** (FR-011) | coluna posição |
| `spotId` | `number` | id do ponto turístico | chave |
| `name` | `string` | nome público | coluna |
| `visits` | `int ≥ 1` | visitas na janela | coluna |

A resposta carrega `granularity` (`day/month/year` — eco) e
`referenceDate` (ISO ou `null`), exibidos para o operador confirmar a janela.

### CountryShare — parcela de país (RF09)

| Campo | Tipo | Regra | Uso na UI |
|-------|------|-------|-----------|
| `country` | `string` | país de origem cadastrado | rótulo da barra |
| `tourists` | `int ≥ 0` | turistas do país | valor visível na barra |
| `share` | `number 0–100` | % sobre `totalVisitors` | valor visível na barra |

Envelope: `totalVisitors` (int ≥ 0) — usado no estado vazio (0 ⇒ vazio
legítimo) e na leitura do denominador.

### InterestShare — parcela de interesse (RF10)

| Campo | Tipo | Regra | Uso na UI |
|-------|------|-------|-----------|
| `interestKey` | `string` | chave canônica do interesse | chave React |
| `interestLabel` | `string` | rótulo legível (da API — nunca fixado) | rótulo da barra |
| `tourists` | `int ≥ 0` | turistas que declararam o interesse | valor visível |
| `share` | `number 0–100` | % sobre **`totalSelections`** (turista conta N vezes) | valor visível |

Envelope: `totalVisitors`, `totalSelections` (int ≥ 0) — o denominador
`totalSelections` sustenta a nota UI de "parcelas podem somar >100%"
(FR-013/clarificação).

### PeriodSelection — estado de client (não vem da API)

| Campo | Tipo | Regra |
|-------|------|-------|
| `kind` | `"today" \| "week" \| "month" \| "custom"` | opção do seletor global (clarificação Q1) |
| `startDate` | ISO `YYYY-MM-DD` | `today`/`week`/`month` traduzidos (D4) ou início do custom |
| `endDate` | ISO `YYYY-MM-DD` | idem (janela inclusiva; semana = segunda→domingo; mês = calendário corrente) |

Regra de UI: custom exige as duas datas com `startDate ≤ endDate`
(validação no cliente antes de disparar query — edge case da spec).

## Estado transitório de UI (por card)

`idle/loading (fetching) → data | empty | error` — 1º estado da query +
`isFetching` ⇔ `LoadingState`; resposta com total 0 / lista vazia ⇒
`EmptyState` (mensagem acionável, "nenhum acesso no período" etc.); exceção da
`queryFn` (contrato/401/403/rede) ⇒ `ErrorState` com refetch (FR-020).
A falha de um card é isolada (FR-015 — queries independentes).
