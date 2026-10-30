# Contract: Superfície interna do painel — sessão e guardas

**Feature**: 001-panel-foundation-auth · **Date**: 2026-10-30

Interfaces que a fundação expõe para as features seguintes (SPE-02..07
consomem isto; nenhuma delas toca cookies, JWT ou a FastAPI direto).

## Sessão server-side (`src/features/auth/session`)

```ts
// Leitura (Server Components, Route Handlers, proxy)
await getSession(): Promise<PanelSession | null>
// PanelSession: { operator: Operator; } — token nunca é exposto a caller de render

// Escrita (Route Handlers / Server Actions apenas)
await setSession(loginResponse): Promise<void>   // grava cookies httpOnly
await clearSession(authenticated: boolean): Promise<void>  // logout local

// Renovação coordenada (US3 cenário 4: uma por vez)
await refreshSession(): Promise<PanelSession | null>  // null ⇒ sessão encerrada
```

Contrato do cookie (data-model.md): par session/refresh httpOnly, `Secure`
em produção, `SameSite=Lax`, expiração alinhada a `expires_in`.

## API de autenticação (`src/features/auth/api`)

```ts
login(username, password): Promise<LoginResult | LoginError>   // 200 | 401 | 5xx
logout(authenticated): Promise<void>                            // 204 | 401→ok
me(): Promise<Operator | null>                                  // 200 | 401
```

Erros tipados por código de resposta; divergência de contrato é um tipo de
erro próprio (Princípio I) — nunca silenciosamente reinterpretada.

## Guardas (`src/features/auth/guards`)

```ts
roleCanAccess(role: Role, pathPattern: RoutePattern): boolean
// mapa de rotas:
//   "/"           → administrador
//   "/admin/*"    → administrador
//   "/beneficios" → administrador | funcionário
//   "/login"      → pública (com sessão ativa → redireciona por papel)
```

`src/proxy.ts` consome apenas presença de sessão + papel (cookie server-side)
para redirecionar sem render: sem sessão ⇒ `/login`; papel insuficiente ⇒
rota permitida do papel. Layouts server-side revalidam papel via sessão e,
quando o contrato permitir, `/auth/me` (segunda camada de papel — research D1).

## Cliente HTTP compartilhado (`src/shared/lib/http`)

```ts
apiFetch(path, init?): Promise<Response>  // uso server-side
// - anexa Authorization a partir da sessão (nunca a partir do cliente)
// - em 401: uma única renovação coordenada + replay da requisição original
//   (US3 cenário 1/4); renovação falhada ⇒ sessão encerrada (FR-007)
// - 403 ⇒ erro de autorização da ação (regra transversal 1)
// - payload divergente do contrato ⇒ erro explícito de divergência
// - expõe helpers p/ estados loading/empty/error consumidos pela UI (Princípio V)
```

`/api/proxy/[...path]` (BFF mínimo): repassa `path`, método e corpo para
`API_BASE_URL` anexando a sessão — túnel sem reinterpretar payloads
(research D3).

## Convenções obrigatórias às features seguintes

1. Nenhuma feature importa `cookies`, JWT ou `fetch` da FastAPI fora das
   camadas acima (Princípio I/II).
2. Tela/trecho de UI consome os helpers de estado do `http.ts` — estados
   loading/vazio/erro nunca desenhados ad hoc (Princípio V).
3. Componentes transversais novos (ex.: `FormField`, `Alert`) nascem em
   `src/shared/components` com o padrão de `Button`/`DataTable` (Princípio IV).