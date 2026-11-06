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

## Pendências (resolvidas por probe — não bloqueiam o plan)

| Pendência | Método |
| --- | --- |
| Correspondência de chaves do catálogo (interests ↔ spot categories) + rótulos | probe com sessão admin (obrigatório antes das tasks de formulário) |
| Vocabulário exato de `weekday` (e.g. "monday" vs pt) | probe (criar/ler spot de teste) |
| `errorCode`s: coordenada fora de faixa, horário inválido, ponto inexistente (404 em DELETE/GET), conflitos | probe |
| Comportamento de DELETE/GET em id inexistente | probe |
| Filtro server-side por categoria (query param) | hoje NÃO existe — enriquecimento futuro via emenda de contrato |
