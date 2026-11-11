# Contract: Dashboard API (SPE-07)

**Extraído do OpenAPI real** — "Passanorte API" 0.1.0 em `http://localhost:8010`
(`/openapi.json`, 2026-11-10, tag `Dashboard`). Todos os endpoints são `GET`,
autenticados por `HTTPBearer` (o token é anexado server-side no túnel
`src/app/api/proxy/[...path]` — Constraint 5; client usa `bffJson`).
Caminhos upstream a partir do túnel: `api/v1/dashboard/...`.

**Erros transversais**: `422` (validação — payload `HTTPValidationError`),
`401` (sessão encerrada ⇒ `SessionEndedError`), `403` (papel ⇒
`AuthorizationDeniedError`) — sempre tratados como estados de erro do card
(FR-016/FR-017). Nenhum payload fora do contrato é silenciosamente aceito
(Princípio I).

---

## GET `api/v1/dashboard/heatmap` (RF06)

| Query | Obrigatório | Padrão | Domínio |
|-------|-------------|--------|---------|
| `groupBy` | não | `spot` | `spot` \| `region` |
| `startDate` | não | — | ISO `date` (inclusive) |
| `endDate` | não | — | ISO `date` |

**200 → `HeatmapResponse`**

```json
{ "markers": [HeatmapMarker, ...] }   // ordem decrescente de weight
```

**HeatmapMarker** (required: `spotId, name, latitude, longitude, weight`)

- `spotId`: `int|null` — **`null` em marcadores de região** (`groupBy=region`)
- `name`: string — nome público do ponto ou rótulo da região
- `latitude`: number · `longitude`: number
- `weight`: int ≥ 0 — peso de visitas (RF06)

## GET `api/v1/dashboard/access-counts` (RF07)

| Query | Obrigatório | Padrão | Domínio |
|-------|-------------|--------|---------|
| `period` | não | `today` | `today` \| `week` \| `month` \| `custom` |
| `startDate` | com `period=custom` | — | ISO `date` |
| `endDate` | com `period=custom` | — | ISO `date` |

**200 → `AccessCountsResponse`** (required: `period, uniqueTouristDays,
totalAccessEvents, daily`)

- `period`: string (eco do enviado)
- `uniqueTouristDays`: int ≥ 0 — turista×dia distinto (mesmo turista duas
  vezes no mesmo dia conta 1)
- `totalAccessEvents`: int ≥ 0 — todo evento de acesso registrado
- `daily`: `AccessDailyCount[]` — ascendente, **só dias COM eventos**
  (janela vazia ⇒ zeros + lista vazia)

**AccessDailyCount** (required: `date, uniqueTourists, accessEvents`)
— `date`: ISO; `uniqueTourists`: int ≥ 0; `accessEvents`: int ≥ 0
(dias no fuso da cidade — "city-tz day").

## GET `api/v1/dashboard/spot-ranking` (RF08)

| Query | Obrigatório | Padrão | Domínio |
|-------|-------------|--------|---------|
| `granularity` | não | `day` | `day` \| `month` \| `year` |
| `referenceDate` | não | hoje | ISO `date` |
| `limit` | não | 5 | inteiro 1–100 |

**200 → `SpotRankingResponse`** (required: `granularity, referenceDate, items`)

- `granularity`: string (eco) · `referenceDate`: ISO|null (eco)
- `items`: `RankingItem[]` —
  `{ position: int ≥ 1, spotId: int, name: string, visits: int ≥ 1 }`
  (position/visits são do backend — o cliente NUNCA reordena/recalcula)

## GET `api/v1/dashboard/visitor-countries` (RF09)

| Query | Obrigatório | Domínio |
|-------|-------------|---------|
| `startDate` | não | ISO `date` (inclusive) |
| `endDate` | não | ISO `date` |

**200 → `VisitorCountriesResponse`** (required: `totalVisitors, items`)

- `totalVisitors`: int ≥ 0 — tamanho da população de visitantes
- `items`: `CountryShareItem[]` —
  `{ country: string, tourists: int ≥ 0, share: number 0–100 }`
  (% sobre `totalVisitors`; soma ≈ 100)

## GET `api/v1/dashboard/visitor-interests` (RF10)

| Query | Obrigatório | Domínio |
|-------|-------------|---------|
| `startDate` | não | ISO `date` (inclusive) |
| `endDate` | não | ISO `date` |

**200 → `VisitorInterestsResponse`** (required: `totalVisitors,
totalSelections, items`)

- `totalVisitors`: int ≥ 0
- `totalSelections`: int ≥ 0 — **total de declarações de interesse**
  (turista com N interesses conta N vezes: % é sobre este total e as
  parcelas PODEM somar acima de 100)
- `items`: `InterestShareItem[]` —
  `{ interestKey: string, interestLabel: string, tourists: int ≥ 0,
  share: number 0–100 }`

---

## Regras do consumidor (spec ↔ contrato)

1. Parsers defensivos por payload em `features/dashboard/api/contract.ts` —
   campo ausente/tipo errado ⇒ `ContractViolationError` com endpoint+campo.
2. Sem reordenação/redimensionamento local: `markers` (ordem de peso),
   `items` do ranking (ordem de `position`) e os arrays de parcelas chegam
   formatados da API — o cliente apenas renderiza.
3. Janelas inclusivas de datas; `period=custom` sempre com as duas datas
   (validação `startDate ≤ endDate` no cliente antes de disparar query).
4. Compare de contrato obrigatório contra o Swagger antes de encerrar a
   feature (Governança 5) — este documento é o baseline.
