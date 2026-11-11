# Contrato da API — Gamification/Redemptions — SPE-06

**Fonte**: OpenAPI real da "Passanorte API" em `API_BASE_URL` (ex.
`http://localhost:8010`), extraído em **2026-11-10** (tag `Gamification`,
prefixo `/api/v1`). Seção 1 é **real** (conferida campo a campo contra
`paths` + `components.schemas`); Seção 2 é **contrato esperado** (o endpoint
de validação NÃO está publicado no Swagger — clarificação Q1 da spec: mocks
governados + compare obrigatório antes de encerrar, Governança 5). Chamadas
do painel: exclusivamente pelo túnel BFF (`/api/proxy/api/v1/...`).

Autenticação: `HTTPBearer` (mesma sessão do painel); autorização final do
backend (401/403 — 401 dispara renovação/replay padrão da SPE-01; 403 vira
mensagem acionável). Erros: payload unificado
`ApiError { errorCode, message, details? }` (exceção: 422 do FastAPI usa
`HTTPValidationError` — classificada como `validation_error` em
`src/shared/lib/api-error.ts`).

## 1. Concessão — REAL: `POST /api/v1/gamification/redemptions` (RF21)

Documentação real do `summary`: *"Register the prize concession against a
code (201; 409 already used or insufficient stock — the code stays valid;
404 unknown code/spot — RF36/Q3)"*; schema da request: *"staff only"*.

- **Request** `RedemptionCreateRequest` — `additionalProperties: false`:
  - `code`: string, 1–128
  - `spotId`: int ≥ 1 — ponto de retirada (semântica exata: probe P4)
- **Responses**:
  - `201` → `RedemptionView`:
    `{ code, prize: { id, name, stockQuantity (pós-baixa) }, routeId,
       touristId, pickupSpotId, concededBy, usedAt }` — o backend efetua a
    baixa no estoque e **invalida/extrai o código** na concessão
    (Princípio II; painel só reflete FR-005).
  - `404` código desconhecido **ou** `spotId` desconhecido
    (`resource_not_found`)
  - `409` código **já utilizado** **ou** **estoque insuficiente**
    (errorCode por sub-caso: probe P1) — **a tentativa falha não consome o
    código** ("the code stays valid" — confirmar P5)
  - `401/403` sessão/papel (probe P1: qual papel concede)
  - `422` payload inválido (`validation_error`)

## 2. Validação — ESPERADO: `POST /api/v1/gamification/redemptions/validate`

Contrato registrado para o backend implementar/confirmar (clarificação Q1 da
spec). Enquanto não publicado, a UI opera com **mock governado** (D4 do
research): `VALIDATE_ENDPOINT_LIVE = false` em
`features/benefits/api/queries.ts` + fixture fiel abaixo. Requisito funcional
da etapa (US1, FR-003): validar **sem consumir** o código e retornar os dados
de conferência.

- **Request**: mesmo corpo de §1 (`RedemptionCreateRequest`) — sem efeito no
  estoque nem no estado do código.
- **Response `200` (esperado) → `RedemptionPreviewView`**:
  `{ code, codeStatus: "valid", route: { id, name },
     enrollmentStatus: "completed",
     prize: { id, name, stockQuantity, available: boolean },
     pickupSpotId? }`
- **Desfechos negativos (semântica por errorCode — to confirm in probe P1)**:
  - `404` `resource_not_found` — código desconhecido (ou malformado)
  - `409` — código já utilizado
  - `409` — inscrição da rota ainda não concluída (nenhum dado parcial como
    concessionável)
  - `409` — brinde sem estoque (código **permanece válido** — FR-007)
  - `422` — payload inválido (`validation_error`)
  - `401/403` — sessão/papel (mesmo papel de §1)
- **Design alternativo aceito**: preview no próprio `POST /redemptions` (flag
  de simulação) — o que não é negociável é a etapa de leitura sem consumo;
  o compare registra qual design o backend adota e este arquivo é atualizado.

## 3. Superfície de apoio consumida (real)

- `GET /api/v1/gamification/routes` — catálogo de rotas (resolver nome da
  rota no registro, se necessário; aceita qualquer autenticado — contrato
  real da SPE-05).
- Catálogo de pontos (SPE-03): seletor do ponto de retirada (reuso
  D3 do research; `spot-name` para exibir rótulo).
- `GET /api/v1/auth/me` / fluxo de renovação — sessão existente, inalterado.

- **P6 — DERIVA #2 (probed em 2026-11-10, sessão employee real)**: o
  funcionário NÃO tem endpoint para listar pontos de retirada —
  `GET /tourist-spots` é admin-only (403 para employee, probe real) e
  `GET /tourist-spots/discover` é tourist-exclusive (403 para employee,
  probe real). O seletor do ponto de retirada (FR-010) depende de uma fonte
  do papel: **contrato esperado** `GET /api/v1/gamification/pickup-spots`
  (funcionário; `{ items: [{ id, name }] }` — pontos ativos) com mock no
  MESMO gate `REDEMPTIONS_ENDPOINTS_LIVE`. No compare (T019), confirmar o
  design adotado pelo backend (endpoint dedicado ou permissão da listing).

## 4. Pendências → probe (primeira task da implementação)

| # | Pendência | Impacto |
| --- | --- | --- |
| P1 | `errorCode` exatos (e mensagens) por desfecho na concessão e, quando publicada, na validação: código desconhecido (404) × já utilizado (409) × rota não concluída (409) × sem estoque (409); e papel do chamador (employee concede? admin também concede/valida?) | mensagens distintas de FR-006; habilitação da área para admin (US3, Assumption da spec) |
| P2 | Publicação do endpoint de validação (ou design equivalente): forma exata assumida pelo backend; flip `VALIDATE_ENDPOINT_LIVE` + compare campo a campo de `RedemptionPreviewView` | Governança 5 — pré-condição de encerramento desta feature |
| P3 | 422 de payload (código vazio, spotId < 1) — forma de `HTTPValidationError` | bloqueio local já cobre; acionável via validation_error |
| P4 | Semântica do `spotId`: deve coincidir com o `pickupSpotId` escolhido pelo turista (RF36/Q3) ou é livre? O que 404 de "unknown spot" cobre | conferência e mensagens do seletor de ponto (FR-010) |
| P5 | "code stays valid" nos demais 409 (já utilizado NÃO aplica; sem estoque SIM) — e comportamento de 409 na validação mock-vs-real durante compare | FR-007/FR-008 e SC-003 |
| P6 | Fonte do catálogo de pontos de retirada ao papel funcionário (403 nas rotas existentes — derivas #2 acima); publicação do `pickup-spots` esperado ou redesign de permissão | seletor FR-010 funcional para o papel alvo |

Método (D7 do research): sessão com **papéis reais** — employee criado via
admin (RF04) + turista fixture (`POST /api/v1/tourists` + login, enrollment
na rota ativa, visitações com GPS nas coordenadas dos pontos, código obtido
via `GET /gamification/enrollments/{id}`); exercitar §1/§2 pelo túnel BFF;
registrar resultados na tabela abaixo e atualizar `messages.ts` **antes** de
a UI depender deles.

### Resultados do probe (executado 2026-11-10, sessão admin/employee/turista reais — T005)

- **DERIVA CRÍTICA DE CONTRATO — concessão AUSENTE no runtime**: o
  `openapi.json` servido pelo backend documenta `POST /api/v1/gamification/redemptions`,
  mas **toda chamada (admin/employee, código válido, pontos válidos) retorna
  404 genérico `{"errorCode":"resource_not_found","message":"Not Found"}`**
  (rota não implementada/roteada — 404 de *rota*, não de negócio: código
  NÃO é consumido, estoque NÃO muda). Consequência de governança: a
  **concessão passa a operar com o mesmo mock governado da validação**
  (`REDEMPTIONS_ENDPOINTS_LIVE = false` — chave única cobre os dois
  endpoints, marcador `// MOCK (temporary): remove when /gamification/redemptions*`
  is live`) até o compare de contrato (T019) confirmar a rota real —
  mecanismo constitucional (Princípio I: mocks temporários permitidos
  enquanto o endpoint não existe, marcados como tal). O desfecho esperado
  (201/baixa/invalidação) permanece o contrato de §1; pendências P1/P5
  ficam **bloqueadas pelo backend** e re-verificadas no compare.
- **P2 — validação**: `POST /gamification/redemptions/validate` ⇒ **404 de
  rota** (não publicada neste runtime — como previsto). Mesma chave de mock.
- **Fixture operacional confirmada**: spots (4, chaves de categoria reais
  `nature`/`culture`/`leisure`), rotas A/B/C com prizes (estoques 3/1/0),
  turista fixture (`+559290000123` — formato de telefone internacional
  `+<dígitos>` 8–15 é validação real do backend), 3 enrollments completos
  com **códigos reais emitidos** (`RedemptionCodeView.status: "unused"`),
  funcionário de teste criado (login employee confirmado `role: "employee"`)
  e **revogado** (204) após o teste.
- **P1 (bloqueado pela deriva)**: não foi possível diferenciar 404 de código
  desconhecido × 409 × desfechos — a rota 404 para TUDO. Baseline da UI
  (mock + `messages.ts`): errorCode `conflict` para os 409 (valor REAL
  observado em outra rota do backend — `POST /tourists` duplicado ⇒
  `{"errorCode":"conflict"}`), `resource_not_found` para o 404; sub-casos
  (já utilizado × sem estoque × rota incompleta) **não distinguíveis por
  `errorCode` genérico** — o compare deve registrar os valores finais; se o
  backend publicar apenas `conflict`, a distinção fica para o payload
  `message`/`details` (pendente).
- **P3**: 422 do FastAPI (`HTTPValidationError`) confirmado em chamadas mal
  formadas (ex.: telefone/turista — `validation_error`).
- **P4**: spotId ≠ ponto de criação não pôde ser distinguido (404 de rota).
- **P5**: bloqueado (rota ausente — código NÃO consumiu em nenhuma tentativa;
  saldo pós-probe permaneceu 3/1/0 — confirmado na listagem).
- **Resíduo**: rotas "Probe SPE-06 rota A/B/C" (6 duplicatas de execução,
  ids 8–19, ARQUIVADAS não-removíveis — sem endpoint de exclusão física) e
  16 spots "Probe SPE-06 spot W/X/Y/Z" (ids 23–38, NÃO deletados nesta
  sessão — cleanup manual do owner; descrever nomes ao deletar). Turista
  fixture `probe.spe06@exemplo.com` preservado para a validação de navegador
  (T020). Funcionário de teste revogado (sem credencial residual).
