# Data Model: Gerenciamento de Pontos Turísticos (SPE-03)

**Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Fonte: contrato real `contracts/spots-api.md` (OpenAPI "Passanorte API",
2026-11-06). O painel não persiste nada — modelo do que transita e como é
validado/exibido.

## SpotView (entidade Ponto Turístico)

Corpo de `GET /api/v1/tourist-spots` (por página), resposta de POST/PATCH.

| Campo | Tipo (contrato) | Validado no parse | Exibido na UI |
| --- | --- | --- | --- |
| `id` | integer | int positivo, obrigatório | não (identifica a linha/ações) |
| `name` | string 1–200 | string não-vazia | coluna Nome |
| `description` | string 1–2000 | string não-vazia | (formulário; não na tabela) |
| `latitude` | number −90…90 | número na faixa | (formulário/mapa; tooltip da linha opcional) |
| `longitude` | number −180…180 | número na faixa | idem |
| `toleranceRadiusM` | number >0 ou null | número>0 ou ausente | (formulário, opcional) |
| `status` | string enum fechado `"open" \| "temporarilyClosed" \| "permanentlyClosed"` | valor no enum (desconhecido ⇒ violação) | badge (FR-005/US3.4) |
| `categories` | array de string (≥1) | array não-vazio de strings não-vazias | coluna Categorias (rótulos do catálogo) |
| `schedule` | array de `{weekday, opensAt, closesAt}` (≥1) | HH:MM `^\d{2}:\d{2}$`; weekday string não-vazia | (formulário; opcionalmente tooltip) |
| `createdAt` / `updatedAt` | string date-time | string não-vazia (parseável) | colunas Criado/Atualizado em |

**Campos ausentes/tipo inesperado ⇒ `ContractViolationError` (endpoint+campo)**
— nunca dado silenciosamente aceito; **status desconhecido ⇒ violação**
(nunca badge inventado — Princípio I; contraste com status aberto de
employees/SPE-02 — aqui o enum é fechado no OpenAPI).

## SpotListResponse (listagem paginada)

`GET /api/v1/tourist-spots` → `{ items, total, page, pageSize }` — os 4
campos obrigatórios; controles da UI derivam deles (FR-006). Cache por
`["spots", page, status]` (research D1/D4).

## SpotScheduleEntry (Cronograma)

`{ weekday: string, opensAt: "HH:MM", closesAt: "HH:MM" }` — ao menos 1
entrada por ponto (cronograma resubmitido inteiro quando alterado).
Formato `HH:MM` puro; coerência opensAt<closesAt validada na UI (edge).
**Vocabulário CONFIRMADO por probe (2026-11-06): lowercase inglês
(`"monday"` etc.)** — idêntico às `SPOT_SCHEDULE_WEEKDAY_KEYS` da UI;
parse exige string não-vazia.

## SpotStatus (ciclo de vida do status)

```text
    [ open ]  ⇄  [ temporarilyClosed ]
       │                │
       ▼                ▼
    [ permanentlyClosed ]  (transição final desejada; o PATCH aceita
                            qualquer dos 3 — política operacional é do
                            admin; efeito ao turista é do backend)
```

- Alterável pela própria edição (RF15/FR-012); os três valores são
  transíveis entre si via PATCH (contrato não restringe).
- Rótulos pt-BR: "Aberto ao público" / "Temporariamente fechado" / "Fechado
  permanentemente" — mapeamento explícito um a um.

## Categoria (catálogo)

Chave administrada pela API; rótulo pt-BR vindo do catálogo
(`CategoryView {key, label}`). Fonte CONFIRMADA por probe (2026-11-06): catálogo de interesses do
turista (`{categories:[{key,label}]}`, chaves `gastronomy/nature/culture/
leisure/art/cinema`), e o backend valida as categorias de spots contra
ele (422 `request_error`). Cada ponto tem ≥1 categoria
(contrato). Nada de categorias no código (RNF06/SC-005).

## Mutação (create/update) — validação espelhada

| Campo | Create | Update (parcial) |
| --- | --- | --- |
| name | obrigatório 1–200 | opcional |
| description | obrigatório 1–2000 | opcional |
| latitude/longitude | obrigatórios na faixa | opcionais (reposicionar no mapa) |
| status | opcional (enum; default UI: `open`) | opcional (RF15) |
| toleranceRadiusM | opcional >0 | opcional |
| categories | obrigatório ≥1 | opcional (resubmitida se alterada) |
| schedule | obrigatório ≥1 entrada | opcional (resubmitida alterada) |

## Remoção (distinta da revogação de employees)

`DELETE /api/v1/tourist-spots/{id}` → **204**; permanente e irreversível —
confirmação nomeando ponto + efeito (FR-013). Ponto removido por outra
sessão ⇒ desfecho real do backend (404/probe) apresentado como erro
acionável + revalidação da listagem.

## Relações

- `Spot` 1—N `SpotScheduleEntry`; `Spot` N—N `Categoria` (keys do catálogo).
- `Spot` vinculado a **eventos** (visão pública — SPE-04; NÃO CRUD aqui).
- `Spot` alimenta routes/brindes (SPE-05), validação de presença
  (RF32 via `toleranceRadiusM`), ranking/heatmap (SPE-07) — dados
  referenciados por id nas specs futuras.
