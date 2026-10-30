# Contract: API FastAPI de Autenticação (baseline)

**Feature**: 001-panel-foundation-auth · **Date**: 2026-10-30 · **Status**:
baseline (clarificação 2026-10-30 — backend ainda não acessível; ver
`research.md` D6). Fonte canônica futura: Swagger `/docs` da FastAPI.

> Este documento registra o **contrato esperado** exigido pelo Princípio I.
> O compare campo a campo com o Swagger real é pré-condição da conclusão da
> SPE-01; divergências atualizam este arquivo e a spec antes das tasks
> correspondentes.

## POST /auth/login

Autentica operador do painel.

```http
POST {API_BASE_URL}/auth/login
Content-Type: application/json

{ "username": "string", "password": "string" }
```

- `200 OK`

```json
{
  "access_token": "string (JWT)",
  "refresh_token": "string (JWT)",
  "token_type": "bearer",
  "expires_in": 0,
  "user": { "id": "string", "username": "string", "name": "string", "role": "administrador" }
}
```

- `401 Unauthorized` — credenciais inválidas → `{ "detail": "..." }`
- `4xx/5xx` demais — indisponibilidade/erro de serviço

Notas do painel: `role` esperado do enum `[administrador, funcionário]`
(painel mapeia nomes de campo exatos contra o Swagger quando disponível);
resposta sem `user.role` válido ⇒ falha de sessão.

## POST /auth/refresh

Troca o token de renovação por nova sessão (chamada server-side; ver
`panel-session.md`).

```http
POST {API_BASE_URL}/auth/refresh
Content-Type: application/json

{ "refresh_token": "string (JWT)" }
```

- `200 OK` — mesmo corpo da resposta de login
- `401` / `422` — token de renovação inválido/expirado
  → painel encerra a sessão (FR-007)
- Painel garante no máximo **uma** chamada em curso por ciclo de expiração
  (US3 cenário 4).

## POST /auth/logout

Encerra a sessão no backend, **se previsto** no Swagger. Sem esse endpoint:
logout apenas local (anotação de divergência nos artefatos).

```http
POST {API_BASE_URL}/auth/logout
Authorization: Bearer <access_token>
```

- `204 No Content` (esperado) · `401` — sessão já encerrada (tratar como
  logout concluído)

## GET /auth/me (opcional — a confirmar no Swagger)

Dados do operador da sessão vigente; usado para restaurar identidade/papel
após recarga de página, quando não embutidos na sessão.

```http
GET {API_BASE_URL}/auth/me
Authorization: Bearer <access_token>
```

- `200 OK` → `user` (mesmo objeto do login)
- `401` — sessão inválida → fluxo de renovação (FR-006/FR-007)

## Regras transversais

1. **Autorização em qualquer rota de negócio**: `403` com sessão insuficiente
   ⇒ o painel mostra estado de erro da ação (nunca exceção silenciosa).
2. **401** em qualquer chamada ⇒ não é erro de ação: dispara renovação
   (FR-006/FR-009).
3. **Divergência de contrato** (payload/rota fora deste baseline) ⇒ erro
   explícito e registro de divergência (Princípio I) — tolerância silenciosa
   é defeito.
4. Todo endpoint de autenticação usa o prefixo `API_BASE_URL` (env var;
   Princípio III).