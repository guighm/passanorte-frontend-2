# Contrato REAL — Gamification (Rotas e Brindes) — SPE-05

**Fonte**: OpenAPI real da "Passanorte API" em `API_BASE_URL` (ex.
`http://localhost:8010`), extraído em **2026-11-10** (tag `Gamification`,
prefixo `/api/v1`). Não é baseline especulado — conferido campo a campo
contra `paths` e `components.schemas`. Pendências de runtime (P1–P4) são
resolvidas por **probe** na primeira task da implementação (padrão SPE-02
T005 / SPE-03 T004 / SPE-04), atualizando este arquivo.

Autenticação: HTTPBearer em todas as operações; autorização final do
backend (403/401 para não administrador nas operações de escrita).
Chamadas do painel: exclusivamente pelo túnel BFF
(`/api/proxy/api/v1/...`).

## 1. Rotas — `/api/v1/gamification/routes`

### POST `/gamification/routes` — criar rota (RF18)

- **Request** `RouteCreateRequest` — todos os campos obrigatórios,
  `additionalProperties: false`:
  - `name`: string, 1–200
  - `description`: string, 1–2000
  - `spots`: array (minItems 1) de `RouteSpotItemInput`
    `{ spotId: int ≥ 1, displayOrder: int ≥ 1 }`
  - `prize`: `RoutePrizeInput` `{ name: string 1–200, initialStock: int ≥ 0 }`
    — **brinde nasce embutido na rota** (não existe POST/GET de prizes)
- **Responses**:
  - `201` → `TouristRouteView`
  - `401/403` não administrador
  - `404` ponto turístico desconhecido/removido
  - `422` payload inválido (validação Pydantic — detail: `loc/msg/type`)

### GET `/gamification/routes` — listar rotas

- **Query**: `includeArchived: boolean = false` — **admin-only**
  (Removal Decision do backend).
- **Response** `200` `RouteListResponse` — sem paginação nesta versão
  (YAGNI):
  `{ items: [ RouteSummaryView ] }`
  `RouteSummaryView = { id: int, name: string(200), description: string(2000),
  spotCount: int ≥ 1, prize: RoutePrizeView, status: string }`
  `RoutePrizeView = { id: int, name: string(200), stockQuantity: int ≥ 0 }`

### GET `/gamification/routes/{route_id}` — detalhe

- **Response** `200` `TouristRouteView`:
  `{ id: int, name, description,
     spots: [RouteSpotItemView { spotId: int, displayOrder: int }],
     prize: RoutePrizeView, status: string }`
- Admin lê qualquer estado; **não administradores recebem 404 em rota
  arquivada** (Removal Decision).
- Uso no painel: carregar a página de **edição** (não há página de detalhe
  na UI — clarificação da spec); `spots` traz apenas `spotId` +
  `displayOrder` — nomes resolvidos pelo catálogo da SPE-03 no cliente
  (fallback "ponto turístico não encontrado" — FR-013).

### PATCH `/gamification/routes/{route_id}` — editar rota (RF19)

- **Request** `RouteUpdateRequest` — **TODOS os campos opcionais**:
  `{ name?, description?, spots? }`; `spots` informada é revalidada
  (minItems 1). **O brinde NÃO é editável aqui** (nasce com a rota; o
  estoque muda apenas em §2).
- **Responses**: `200` → `TouristRouteView`; `404` rota desconhecida
  **ou arquivada** ou ponto inválido; `422` inválido.

### DELETE `/gamification/routes/{route_id}` — remover (RF19, arquivamento)

- **Efeito**: **arquivamento com histórico preservado** (não exclusão
  física — Removal Decision do backend).
- **Responses**: `204` (sem corpo); `404` desconhecida.

## 2. Estoque de brinde — `/api/v1/gamification/prizes/{prize_id}` (RF20)

### PATCH `/gamification/prizes/{prize_id}` — ajustar estoque

- **Request** `PrizeStockUpdateRequest`:
  `{ stockQuantity: int ≥ 0 }` — guarda no **backend**: valor negativo OU
  abaixo das reservas comprometidas → 422
- **Response** `200` → `RoutePrizeView` (novo estado)
- **Responses**: `404` brinde desconhecido (pendência P3: brinde de rota
  arquivada responde 200 ou 404?); `422` guarda de reservas (pendência P4:
  payload/mensagem).

## 3. Concessão — `/api/v1/gamification/redemptions` (fora do escopo — RF21/SPE-06)

`POST /gamification/redemptions` (funcionário) — corpo
`RedemptionCreateRequest` `{ code: string 1–128, spotId: int ≥ 1 }`.
Respostas: `201` → `RedemptionView`
`{ code, prize: { id, name, stockQuantity }, routeId, touristId,
pickupSpotId, concededBy, usedAt }`
— o **backend efetua a baixa do estoque**; `409` código já usado ×
estoque insuficiente (código permanece válido); `404` código/ponto
desconhecido. O painel administrativo apenas reflete o saldo resultante
(FR-004 da spec / Princípio II). Registrado aqui como referência do
vínculo estoque ↔ concessão.

## 4. Pendências → probe (primeira task da implementação)

| # | Pendência | Impacto |
| --- | --- | --- |
| P1 | Valores exatos de `status` (ativa × arquivada) — schema é string livre | comparar status na listagem; alternador de arquivadas; testes |
| P2 | `DELETE /api/v1/tourist-spots/{id}` com rotas que referenciam o ponto: rota continua listada (`spotCount`)? `spotId` órfão em `/routes/{id}`? O que o POST/PATCH devolve ao reusar o ponto | Edge Case 1 da spec; mensagens e fallback FR-013 |
| P3 | `PATCH /gamification/prizes/{prize_id}` para brinde de **rota arquivada**: 200 ou 404? | disponibilidade do diálogo de estoque para arquivadas |
| P4 | Payload/mensagem do 422 de estoque abaixo das reservas comprometidas | mensagem acionável no `RouteStockDialog` (preservar valor anterior) |

Método: sessão **administrador** real via túnel BFF; registrar resultados
na tabela abaixo (status/headers/corpos) e atualizar `messages.ts` antes
de a UI depender deles. Divulge também a ordenação de retorno do GET de
rotas (observação para a listagem).

### Resultados do probe (executado 2026-11-10, sessão admin real — T004)

- **P1** — valores de `status`: **`"active"`** / **`"archived"`** (literais do
  contrato na listagem e no detalhe). `DELETE /routes/{id}` ⇒ **204**;
  listagem padrão fica vazia; `GET /routes/{id}` de arquivada ⇒ **200 para
  admin** (qualquer estado) e `PATCH /routes/{id}` de arquivada ⇒ **404**
  (`resource_not_found`, mensagem `"tourist route not found"`).
- **P2** — `DELETE /tourist-spots/{id}` de ponto referenciado por rota ativa
  ⇒ **204 (sem bloqueio, sem cascata)**: a rota **continua listada**,
  `spotCount` **permanece como estava** (não é recalculado — fica stale) e
  `GET /routes/{id}` **continua devolvendo o `spotId` órfão** ⇒ o rótulo de
  fallback (FR-013) é o caso REAL em modo edição; `spotCount` da listagem
  não deve ser apresentado como "pontos vivos". POST de rota com spot
  desconhecido ⇒ 404 `resource_not_found`, `"tourist route not found"`
  (mensagem do backend genérica/misleading — traduzir como "ponto
  turístico não encontrado" na UI).
- **P3** — `PATCH /gamification/prizes/{prize_id}` para brinde de rota
  **ARQUIVADA** ⇒ **200** (o estoque permanece ajustável mesmo com a rota
  arquivada — o backend NÃO nega). decisão da UI: **manter a ação de
  estoque ofertada apenas para rotas ativas** (D5 — linhas arquivadas são
  somente-leitura no painel); o desfecho 404 para brinde desconhecido
  permanece acionável.
- **P4** — guarda de estoque: negativo ⇒ **422 `validation_error`** ("Request
  body is invalid.", details key `stockQuantity`: "Input should be greater
  than or equal to 0"); não-inteiro/facional ⇒ 422 `validation_error` (idem
  "valid integer"). **O caso específico "abaixo das reservas comprometidas"
  NÃO pôde ser disparado** (exige concessão em andamento — RF21/SPE-06);
  registrado como pendência menor: se ocorrer em runtime, esperar 422
  `validation_error` com mensagem dedicada — `messages.ts` já cobre o genérico.
- **Ordenação do GET** (observação): items em ordem de **id ascendente**
  (n=2 no probe; sem parâmetro de ordenação no contrato — a UI respeita a
  ordem retornada).
- **Resíduo do probe**: 2 rotas de teste ARQUIVADAS ("Probe SPE-05 rota",
  id 1; "Probe SPE-05 rota2 P2", id 2; brinde 2 com estoque 10) com spots de
  teste fisicamente removidos (spotId órfão 5/6/7) — servem de fixture real
  do fallback FR-013; NÃO é possível desarquivar (sem endpoint). Spots do
  catálogo de seed limpos.
