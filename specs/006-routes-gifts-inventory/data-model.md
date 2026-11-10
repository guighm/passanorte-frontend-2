# Data Model: Rotas Turísticas e Estoque de Brindes (SPE-05)

**Feature**: specs/006-routes-gifts-inventory | **Date**: 2026-11-10
Fonte: spec.md + contrato REAL (`contracts/gamification-api.md`, OpenAPI
2026-11-10, tag `Gamification`). Tipos Zod vivem em
`src/features/tours/types/{index,schemas}.ts`; parsers puros em
`src/features/tours/api/contract.ts`.

## Entidades

### TouristRoute (rota turística)

| Campo (contrato) | Tipo | Regra de validação | Uso na UI |
| --- | --- | --- | --- |
| `id` | integer | ≥ 1 (identificador) | chave de linha, navegação para edição (`[routeId]`) |
| `name` | string | 1–200 caracteres | coluna "nome", header do formulário |
| `description` | string | 1–2000 caracteres | coluna "descrição"; textarea do formulário |
| `spotCount` | integer | ≥ 1 (somente leitura — derivado no backend) | coluna "pontos" na listagem |
| `spots[]` | RouteSpotEntry[] | mínimo 1 item (create/edit); ordem 1..n sem lacunas | lista ordenada da página de edição (única superfície de leitura da ordem) |
| `prize` | RoutePrizeView | embutido — nasce com a rota | coluna "brinde" + indicador de saldo |
| `status` | string | valores exatos ativa × arquivada → **pendência P1 (probe)** | status identificável na listagem; alterna ações da linha (arquivadas: só leitura) |

#### RouteSpotEntry (item da lista de pontos)

| Campo | Tipo | Regra | Uso na UI |
| --- | --- | --- | --- |
| `spotId` | integer | ≥ 1; deve existir no catálogo da SPE-03 (backend valida com 404 em create/edit) | nome resolvido via catálogo `useSpotCatalogQuery` — fallback "ponto turístico não encontrado" (FR-013) |
| `displayOrder` | integer | ≥ 1; serializado 1..n no submit a partir do índice da lista (derivado no cliente — nunca editável direto) | posição exibida na lista reordenável |

Invariante: **sem duplicatas de `spotId`** na lista em construção (seletor
indisponibiliza o item já listado — residual registrado na 3ª passada de
clarify); sem lacunas de ordem.

#### RoutePrizeView (brinde embutido)

| Campo | Tipo | Regra | Uso na UI |
| --- | --- | --- | --- |
| `id` | integer | identificador do brinde | parâmetro de `PATCH /gamification/prizes/{id}` (ajuste de estoque) |
| `name` | string | 1–200 (nascido com a rota; **não editável** pós-criação) | coluna "brinde"; apenas-leitura na edição |
| `stockQuantity` | integer | ≥ 0; baixa na concessão é do backend (RF21) — reservas comprometidas guardadas no backend | indicador de saldo (esgotado 0 em destaque — clarificação Q2); ajustável via diálogo da linha |

### PrizeStockUpdateBody (ajuste de estoque — request)

| Campo | Tipo | Regra |
| --- | --- | --- |
| `stockQuantity` | integer | ≥ 0; se abaixo das reservas comprometidas o backend rejeita (422 — pendência P4) |

### Entidades fora de escopo (referência)

- **Redemption** (concessão, RF21/SPE-06): `POST /gamification/redemptions`
  — o backend efetua a baixa; o painel apenas reflete o saldo resultante.
- **Enrollments** (matrículas de turista nas rotas): endpoints
  `/gamification/enrollments` e o POST de matrícula não têm UI no painel
  nesta spec.

## Relações

- `TouristRoute` 1—N `RouteSpotEntry` (ordenada por `displayOrder`).
- `RouteSpotEntry` N—1 **TouristSpot** (SPE-03, apenas por `spotId` — o
  detalhe da rota não traz nomes; nome resolvido no cliente pelo catálogo
  carregado de `@/features/events/api/queries`).
- `TouristRoute` 1—1 `RoutePrizeView` (brinde nasce com a rota; depois só o
  estoque muda, via endpoint de ajuste).

## Ciclo de vida (status)

```text
[na listagem, includeArchived=false]
     │ POST /gamification/routes ──► status ativa
ativa ── DELETE /gamification/routes/{id} (204) ──► arquivada
     │                                    (histórico preservado — não há exclusão física)
arquivada ── visível somente com includeArchived=true (admin)
arquivada ── PATCH da rota: 404 (backend) → UI não expõe edição para arquivadas
arquivada ── reativação: NÃO EXISTE no contrato
saldo do brinde: alterado apenas por PATCH /gamification/prizes/{id}
                 e pela baixa do backend na concessão (RF21, fora do escopo)
```

## Schemas de request (resumo — detalhe em contracts/gamification-api.md)

- **RouteCreateBody** (POST — todos obrigatórios):
  `{ name, description, spots: [{ spotId, displayOrder }], prize: { name, initialStock } }`
- **RouteUpdateBody** (PATCH parcial — TODOS opcionais):
  `{ name?, description?, spots? }` — `spots` informada é revalidada no
  backend (mínimo 1); envio apenas dos campos alterados (diff — padrão SPE-04)
- **PrizeStockUpdateBody** (PATCH prizes): `{ stockQuantity }`

## Validações Zod (resumo)

- `name`: string 1–200 · `description`: string 1–2000
- `spots`: array min 1 de `{ spotId: int ≥ 1, displayOrder: int ≥ 1 }`
- `prize.name`: string 1–200 · `initialStock`: int ≥ 0 (create)
- `stockQuantity`: int ≥ 0 (ajuste)
- Toda leitura passa por parser puro campo a campo: campo ausente/inalterado
  divergente do esperado ⇒ `ContractViolationError` (Princípio I).
