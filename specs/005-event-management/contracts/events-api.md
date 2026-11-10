# Contrato: Events API (SPE-04) — extraído do OpenAPI real

**Fonte**: `GET http://localhost:8010/openapi.json` — "Passanorte API"
(OpenAPI 3.1), extraído e registrado em 2026-11-10 (Princípio I). Não é
baseline inventado; pendências de observação ao fim, resolvidas por probe
na implementação (padrão SPE-02 T005 / SPE-03 T004).

**Autenticação**: security scheme `HTTPBearer` —
`Authorization: Bearer <accessToken>` (anexado apenas server-side: túnel
BFF — Constraint 5). Sessão de funcionário (`employee`) ⇒ 403 (FR-001).
401 pós-renovação ⇒ retorno ao login (padrão SPE-01).

**Erros**: payload unificado `ApiError { errorCode, message, details }`;
exceção: 422 (`HTTPValidationError` padrão do FastAPI ⇒ errorCode
"validation_error" no classificador). Campos em **camelCase**.
Classificação client-side via `shared/lib/bff.ts` + `api-error.ts` — MESMA
semântica da SPE-02/03 (401 ⇒ `SessionEndedError`, 403 ⇒
`AuthorizationDeniedError`, demais ⇒ `ApiRequestError`/fallbacks).

## GET `/api/v1/events` — listagem administrativa (combinação de filtros)

- Query params (todos opcionais, combináveis):
  - `spotId` (integer) — filtra por ponto turístico (FR-003, server-side).
  - `startDate` (date) — limite inferior INCLUSIVO por `occurrenceDate`
    (**FORA do escopo** desta fase — spec/Assumptions; registrado para
    evolução).
  - `endDate` (date) — limite superior INCLUSIVO (idem).
- **200** → `EventListResponse`:
  ```json
  { "items": [EventView] }
  ```
  - **Sem paginação nesta versão** — todas as linhas correspondentes.
  - Ordem da API: `(occurrenceDate, id)` ascendente — respeitada sem
    reordenação client.
- `EventView` (corpo de TODAS as leituras — listar, criar, editar):

  ```json
  { "id": 1, "spotId": 2, "occurrenceDate": "2026-12-01",
    "description": "…", "ticketPrice": 25.5 }
  ```

  - `id`: integer; `spotId`: integer ≥ 1; `occurrenceDate`: date puro;
    `description`: 1–2000; `ticketPrice`: **number** (2 casas — centavos
    no armazenamento; 0 = gratuito).
  - **NÃO embute nome do ponto** — resolve-se pela listagem de spots da
    SPE-03 (FR-012; fallback identificável se não resolvido).

## POST `/api/v1/events` — cadastro (RF16)

- Request — `EventCreateRequest` (obrigatório, `additionalProperties: false`,
  **todos os campos exigidos**):
  ```json
  { "spotId": 2, "occurrenceDate": "2026-12-01",
    "description": "1–2000", "ticketPrice": 0 }
  ```
  - `spotId`: integer ≥ 1 (ponto **existente**); `ticketPrice`: number ou
    string, mínimo 0 (painel envia **number** — padrão a registrar no
    probe 2); máximo de duas casas decimais (centavos).
- **201** → `EventView`.
- Desfechos documentados na description do endpoint: 401/403 (não-admin),
  404 (ponto inexistente), **409 (ponto permanentemente fechado)**, 422
  (inválido). Corpos reais destes códigos: probe 1/3 (não listados
  explicitamente no OpenAPI).

## PATCH `/api/v1/events/{event_id}` — edição parcial (RF17)

- Path: `event_id` (integer).
- Request — `EventUpdateRequest` (**TODOS os campos opcionais**;
  `additionalProperties: false`; o OMITIDO permanece; patch vazio = no-op
  200 sem audit — precedente `update_spot` 007):
  ```json
  { "ticketPrice": 30 }        // só o que mudou (research D8)
  ```
  - `spotId` informado é **revalidado** contra o novo ponto pelo backend
    (404 desconhecido / 409 permanentemente fechado).
- **200** → `EventView` (estado pós-edição).
- Desfechos: 404 (evento/ponto inexistente), 409 (ponto fechado
  permanentemente), 422.

## DELETE `/api/v1/events/{event_id}` — remoção física (RF17)

- **204** sem corpo.
- **404** (evento inexistente — ex.: já removido em outra sessão): falha
  acionável; listagem revalidada MESMO assim (reflete estado real — padrão
  da mutação de remoção da SPE-03).

## Pendências por probe — RESOLVIDO em 2026-11-10 (execução real, sessão admin)

Executor: probe T004 da SPE-04 contra `http://localhost:8010` (login admin
real; employee temporário para 403; TODOS os resources de probe removidos
ao fim). Resultados registrados abaixo e aplicados em
`src/features/events/api/messages.ts`.

1. **Corpos do erro unificado** (`ApiError { errorCode, message, details }`
   em TODOS os desfechos não-ok; `details` como `[{key, message}]` no 422):

   | Código   | `errorCode`              | `message` real                                  |
   | -------- | ------------------------ | ----------------------------------------------- |
   | 401      | `authentication_failed`  | "invalid or expired credentials"                |
   | 403      | `authorization_failed`   | "insufficient permissions" (GET/POST/DELETE events com funcionário) |
   | 404      | `resource_not_found`     | "event or tourist spot not found"               |
   | 409      | `conflict`               | "tourist spot is permanently closed"            |
   | 422      | `validation_error`       | "Request body is invalid." (+ `details[{key,message}]`; keys de query sob prefixo `query.`) |

   Bônus confirmado: `PATCH /events/{id}` com body `{}` ⇒ **200 no-op**
   (documento no contrato; painel nunca envia patch vazio — submete nada).
2. **`ticketPrice` como string ACEITO no POST (201) e PATCH (200)** — o
   backend serializa de volta como number (in: `"12.90"` ⇒ out: `12.9`;
   `"99.99"` ⇒ `99.99`). **Padrão adotado pelo painel: enviar `number`**
   (2 casas) — igualmente válido e canônico (leitura é number).
3. **409 confirmado em POST e PATCH**: `errorCode` = **`conflict`**,
   mensagem "tourist spot is permanently closed" — mapeada na UI como
   mensagem acionável de vínculo proibido (FR-010; cenário 4 das US2/US3).
4. **`DELETE /api/v1/tourist-spots` com eventos pendentes ⇒ 204 com
   CASCATA**: os eventos do ponto são REMOVIDOS junto (não há órfãos por
   esse caminho). O fallback identificável "ponto turístico não encontrado"
   (FR-012) permanece como defesa contra corridas entre carga do catálogo
   e listagem — não como estado esperado.
5. **`pageSize` da listagem de spots**: máximo efetivo **100** (422 fora
   dos limites 1–100, key `query.pageSize`); esgotamento do laço confirmado
   por contagem `items.length < pageSize`. Painel usa pageSize 100 no
   laço do catálogo (research D6).

## Evoluções possíveis (não nesta fase — nenhum endpoint inventado)

- `GET /api/v1/events/{event_id}` (detalhe único): a edição hoje resolve
  pela listagem (research D2) — se o backend o expuser, o hook
  `useEventQuery` troca o interno.
- Filtros `startDate`/`endDate` na UI (contrato já aceita; FORA do
  escopo — spec/Assumptions).
- Paginação de eventos (contrato sem paginação; volume acadêmico).
