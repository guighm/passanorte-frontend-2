# Contract: API FastAPI de Autenticação (confirmado)

**Feature**: 001-panel-foundation-auth · **Date**: 2026-11-06 · **Status**:
**re-confirmado** — compare campo a campo re-executado contra o OpenAPI real
da API "Passanorte API" ativa em `http://localhost:8010` (`GET /openapi.json`,
security scheme `HTTPBearer`). Supersedes o compare de 2026-11-01 atribuído a
`localhost:8000`, cujo serviço em execução é o "ADA Backend" (sistema alheio
ao PassaNorte). Supersedes o baseline de 2026-10-30 (era "esperado", backend
ainda não acessível — `research.md` D6). Especificação sincronizada:
`spec.md`, seção "Contrato da API".

> Pendências de 2026-11-01 **RESOLVIDAS em 2026-11-06** por login real com
> credenciais de seed fornecidas pelo owner (usadas apenas localmente, nunca
> registradas em artefatos): `role` = `"admin"` (administrador) / `"employee"`
> (funcionário); `expiresIn` = 3600 s; token de renovação é string opaca
> (não-JWT) e é **rotacionado** em toda renovação. As fixtures do mock
> (`admin`/`admin`, `funcionario`/`funcionario`) respondem 401 na API real
> e DEVEM ser removidas antes do encerramento da SPE-01 (Princípio I).

## POST /api/v1/auth/login

Autentica operador do painel. (Real: prefixo `/api/v1` — divergência D1.)

```http
POST {API_BASE_URL}/api/v1/auth/login
Content-Type: application/json

{ "username": "string (1–100)", "password": "string (1–200)" }
```

- `200 OK` (real — divergências D2 e D3)

```json
{
  "accessToken": "string (JWT)",
  "refreshToken": "string (opaca, não-JWT, uso único)",
  "tokenType": "bearer",
  "expiresIn": 3600,
  "role": "string"
}
```

- `expiresIn` real observado: **3600 s (1 h)**.
- Valores de `role` confirmados por login real (2026-11-06): **`"admin"`
  (administrador) · `"employee"` (funcionário)**.

- `401 Unauthorized` — credenciais inválidas, payload unificado (divergência D4; confirmado em login real):

```json
{ "errorCode": "authentication_failed", "message": "invalid credentials", "details": [] }
```

- `422` — corpo inválido → `HTTPValidationError` padrão do FastAPI (exceção
  documentada ao payload unificado)
- `5xx` — indisponibilidade/erro de serviço

Notas do painel: **não há objeto `user`** — `role` está no nível raiz e
`id`/`name` não existem; identificação exibível na moldura é `username` +
`role` (via login ou `/me`). Mapeamento de papel no painel é **explícito e
exaustivo**: `admin` → administrador, `employee` → funcionário; qualquer
outro valor ⇒ papel não reconhecível ⇒ falha de sessão (edge case — nunca
liberar acesso por omissão).

## POST /api/v1/auth/refresh

Troca o token de renovação por nova sessão (chamada server-side; ver
`panel-session.md`).

```http
POST {API_BASE_URL}/api/v1/auth/refresh
Content-Type: application/json

{ "refreshToken": "string (opaca, uso único)" }
```

Corpo JSON (confirmado; **não** existe variante por cookie httpOnly).

- `200 OK` — mesmo corpo da resposta de login (inclui `role` renovado)
- **Rotação confirmada em teste real (2026-11-06):** a resposta traz um
  **novo** `refreshToken`; o anterior deixa de valer (token de renovação de
  uso único). O painel deve persistir o novo token server-side ao renovar.
- `401` / `422` — token de renovação inválido/expirado
  → painel encerra a sessão (FR-007)
- Painel garante no máximo **uma** chamada em curso por ciclo de expiração
  (US3 cenário 4).

## POST /api/v1/auth/logout

Encerra a sessão no backend — **confirmado** (baseline: "se previsto";
divergência D6).

```http
POST {API_BASE_URL}/api/v1/auth/logout
Authorization: Bearer <accessToken>
```

- Sem corpo de requisição; autenticação via security scheme **`HTTPBearer`**
- `204 No Content` · `401` — sessão já encerrada (tratar como logout
  concluído)

## GET /api/v1/auth/me (confirmado — não é mais opcional; D5)

Identidade da sessão vigente; restauração de identificação/papel da moldura
após recarga de página.

```http
GET {API_BASE_URL}/api/v1/auth/me
Authorization: Bearer <accessToken>
```

- `200 OK` → `{ "username": "string", "role": "string" }` — **não** há
  `id` nem `name`
- `401` — sessão inválida → payload unificado; dispara fluxo de renovação
  (FR-006/FR-007)

## GET /health (fora do escopo funcional)

`200 OK` → `{ "status": "ok", "database": "ok" }`. O painel não deve
substituir estados de UI por sondagens de health (Princípio V).

## Autorização para o resto da API

- Security scheme global **`HTTPBearer`** (OpenAPI): toda rota de negócio
  exige `Authorization: Bearer <accessToken>`, anexado apenas server-side
  (`src/shared/lib/http.ts` / túnel BFF — Constraint 5 da constituição).
- `403` com sessão insuficiente ⇒ estado de erro da ação (nunca exceção
  silenciosa).

## Divergências do baseline (compare 2026-11-01)

- **D1 — prefixo de versão:** todas as rotas de autenticação ficam sob
  `/api/v1/` (baseline previa `/auth/...`).
- **D2 — camelCase:** campos de sessão `accessToken`, `refreshToken`,
  `tokenType`, `expiresIn`, `role` (baseline previa snake_case
  `access_token`/`refresh_token`/`expires_in`). Convenção de API do backend
  (`camelcase-json`).
- **D3 — sem objeto `user`:** login/refresh não retornam `user`; `role` no
  nível raiz; sem `id`/`name` (também no `/me`).
- **D4 — erros unificados:** payload `ApiError { errorCode, message,
  details }` em vez do `{ "detail": }` do FastAPI (exceção: 422 usa
  `HTTPValidationError` padrão).
- **D5 — `/me` confirmado** (baseline o listava como opcional).
- **D6 — `logout` confirmado** (baseline o listava como "se previsto").
- **D7 — refresh por corpo JSON `refreshToken`** (baseline previa
  `refresh_token` ou "cookie httpOnly, a confirmar" — variante por cookie
  descartada).

## Regras transversais (mantidas)

1. **Autorização em qualquer rota de negócio**: `403` com sessão insuficiente
   ⇒ o painel mostra estado de erro da ação (nunca exceção silenciosa).
2. **401** em qualquer chamada ⇒ não é erro de ação: dispara renovação
   (FR-006/FR-009).
3. **Divergência de contrato** (payload/rota fora deste contrato) ⇒ erro
   explícito e registro de divergência (Princípio I) — tolerância silenciosa
   é defeito.
4. Todo endpoint de autenticação usa o prefixo `API_BASE_URL` (env var;
   Princípio III).

## Ação obrigatória (governança 5 da constituição)

Os paths mudaram de `/auth/*` para `/api/v1/auth/*` (D1, 2026-11-01); tasks
que implementam chamadas contra os endpoints reais conferem o contrato do
painel campo a campo contra este arquivo. Com o re-compare de 2026-11-06
contra a API real (`localhost:8010`) e a resolução das pendências de `role`
e credenciais, o compare de contrato da SPE-01 está **encerrado** — resta
apenas remover os mocks temporários (`src/features/auth/api/mock.ts`) antes
do encerramento (Princípio I).