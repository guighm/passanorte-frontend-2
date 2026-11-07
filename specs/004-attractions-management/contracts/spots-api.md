# Contrato: Tourist Spots API (SPE-03) — extraído do OpenAPI real

**Fonte**: `GET http://localhost:8010/openapi.json` — "Passanorte API"
(OpenAPI 3.1), extraído e registrado em 2026-11-06 (Princípio I). Não é
baseline inventado; pendências de observação ao fim, resolvidas por probe
na implementação (padrão da SPE-02 T005).

**Autenticação**: security scheme `HTTPBearer` —
`Authorization: Bearer <accessToken>` (anexado apenas server-side: túnel
BFF — Constraint 5). Sessão de funcionário (`employee`) ⇒ 403 (estado de
erro). 401 pós-renovação ⇒ retorno ao login (FR-007).

**Erros**: payload unificado `ApiError { errorCode, message, details }`;
exceção: 422 (`HTTPValidationError` padrão do FastAPI). Campos em
**camelCase**. Classificação client-side via `shared/lib/bff.ts` +
`api-error.ts` (mesma semântica da SPE-02).

## GET `/api/v1/tourist-spots` — listagem administrativa paginada

- Query params: `status` (string — filtro por status), `page` (int),
  `pageSize` (int).
- **200** → `SpotListResponse`:
  ```json
  { "items": [SpotView], "total": 0, "page": 1, "pageSize": 20 }
  ```
- `SpotView`:
  ```json
  { "id": 1, "name": "…", "description": "…",
    "latitude": -3.1, "longitude": -60.0,
    "toleranceRadiusM": 50.0,          // number ou null
    "status": "open",                  // enum fechado
    "categories": ["key1", "key2"],    // chaves do catálogo ("raw catalog keys")
    "schedule": [ { "weekday": "…", "opensAt": "HH:MM", "closesAt": "HH:MM" } ],
    "createdAt": "date-time", "updatedAt": "date-time" }
  ```
- **Sem filtro por categoria** (apenas `status`) — filtro client-side
  registrado como limitação (FR-004/spec).
- **Sem parâmetro de ordenação** — ordem da API respeitada (paginação
  server-side; sem reordenação client sobre páginas).

## POST `/api/v1/tourist-spots` — cadastro (RF11/RF13/RF14/RF15)

- Request (obrigatório — `additionalProperties: false`):
  ```json
  { "name": "1–200", "description": "1–2000",
    "latitude": -90…90, "longitude": -180…180,
    "status": "open|temporarilyClosed|permanentlyClosed",  // opcional
    "toleranceRadiusM": >0,          // opcional
    "categories": ["…"],             // mínimo 1
    "schedule": [ { "weekday": "…", "opensAt": "HH:MM",
                    "closesAt": "^\\d{2}:\\d{2}$" } ] }  // mínimo 1
  ```
- **201** → `SpotView`.
- 422: `HTTPValidationError`; recusas de negócio → `ApiError`
  (`errorCode` a confirmar no probe).

## GET `/api/v1/tourist-spots/{spot_id}` — detalhe público (`PublicSpotDetailView`)

- Uso no painel **opcional** (a listagem supre esta área); corpo inclui
  `categories` resolvidas `[{key, label}]`, `events[]` e
  `mapLink`/`uberLink`/`ninetyNineLink` (RF28). **Não é** o corpo de
  edição; eventos são SPE-04.

## PATCH `/api/v1/tourist-spots/{spot_id}` — edição parcial (RF12/RF15)

- Request: todos os campos opcionais (mesmos limites/validações do create;
  `additionalProperties: false`).
- **200** → `SpotView` atualizado; 422: validação.

## DELETE `/api/v1/tourist-spots/{spot_id}` — remoção permanente (RF12)

- **204** sem corpo — irreversível; confirmação obrigatória na UI
  (FR-013).
- 404/`errorCode` de id inexistente (já removido/outra sessão):
  **observar no probe**; tratado como erro acionável + revalidação.

## GET `/api/v1/tourists/interest-categories` — catálogo (fonte do seletor)

- Requer sessão; retorna lista de categorias de interesse do turista.
- **Fonte DECIDIDA (clarificação 2026-11-06)** para o seletor de
  categorias de spots. **Probe obrigatório** (antes das tasks de
  formulário): confirmar correspondência das chaves usadas nos
  `categories` de `SpotView` com as chaves do catálogo e seus rótulos
  pt-BR. Divergência ⇒ registrar e alinhar com o backend antes da UI

## Segurança e privacidade

- Dados de spots não contêm dados pessoais (LGPD N/A aqui); auditoria
  (RNF19) é do backend; o painel apenas informa desfechos.
- Chave do Google Maps somente em `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
  (Princípio III) — nunca em código.

## Pendências — RESOLVIDAS por probe (2026-11-06, sessão admin real; task T004)

| Pendência | Valor observado (probe) |
| --- | --- |
| Catálogo de categorias (fonte: interests) | **`GET /api/v1/tourists/interest-categories` → `{ "categories": [ { key, label } ] }`** — chaves reais: `gastronomy, nature, culture, leisure, art, cinema` (rótulos pt); **correspondência CONFIRMADA**: o backend valida as categorias de spots contra este catálogo (`422 request_error` "invalid category … is not in the configured catalog" para chave fora dele) |
| Spot criado com chave do catálogo | **201, key `"leisure"` sobrevive intacta** na `SpotView` |
| Vocabulário de `weekday` | **lowercase inglês** (`"monday"` etc.) — idêntico às `SPOT_SCHEDULE_WEEKDAY_KEYS` da UI |
| `status` omitido no POST | **default do backend: `"open"`** (e `toleranceRadiusM` começa `null`) |
| Coordenada fora de faixa (lat 999) | **HTTP 422, `ApiError { errorCode: "validation_error", message: "Request body is invalid.", details: [ { key: "latitude", message: "Input should be less than or equal to 90" } ] }`** — o 422 usa o payload UNIFICADO (não o `HTTPValidationError` do FastAPI!) |
| Spot/DELETE de id inexistente | **HTTP 404, `errorCode: "resource_not_found"`, `message: "spot not found"`** |
| Timestamps | **ISO date-time com Z** (`2026-11-07T00:01:10.017732Z`) |

> **Divergência de contrato importante (corrigida no painel):** o OpenAPI
> documentava 422 como `HTTPValidationError` padrão do FastAPI — em run,
> o backend responde 422 COM O PAYLOAD UNIFICADO `ApiError` (erro
> `validation_error`), com `details[]` em pares `{key,message}`. O
> classificador do painel já mapeava `validation_error` — parse confirmado
> sem alteração. Compare campo a campo concluído (governança 5).

> Spot de teste **removido** ao fim da sonda (DELETE → 204; sem resíduo).
