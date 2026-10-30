# Implementation Plan: Fundações e Autenticação do Painel

**Branch**: `001-panel-foundation-auth` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-panel-foundation-auth/spec.md`

## Summary

Implementar a fundação do Painel Administrativo PassaNorte (RF02, RF03, RNF09):
tela de login autenticando contra a API FastAPI com sessão JWT gerenciada
server-side em cookie httpOnly (clarificação de 2026-10-30), guardas de rota
por papel (administrador = acesso total; funcionário = apenas `/beneficios`),
shell de layout reutilizável, cliente HTTP compartilhado com renovação
transparente de sessão (401/refresh) e página inicial com placeholders das
seções do painel. O backend ainda não está acessível: o contrato esperado da
spec é o baseline e mocks temporários são permitidos apenas quando marcados
(Princípio I).

## Technical Context

**Language/Version**: TypeScript 5.x sobre Next.js 16.4.3 (App Router) +
React 19.3.0 — versões de `package.json` são a referência (Constraint 1).

**Primary Dependencies**: Tailwind CSS 4 (via `@tailwindcss/turbopack`),
`eslint` + `eslint-config-next` 16.4.3, pnpm 12. Nenhuma biblioteca de
autenticação de terceiros: Next.js puro (Server Actions + Route Handlers +
`proxy.ts`) expõe exatamente o contrato do backend FastAPI (RNF15, Princípio
I — a API é o contrato único; libs de auth induziriam um segundo contrato).

**Storage**: N/A no frontend; a única persistência é a sessão local do painel
(cookie httpOnly gravado por handler de servidor). O estado de
usuário/papel vive no servidor do painel e no backend.

**Testing**: nenhum framework de teste configurado no repositório. Validação
desta feature: cenários de `quickstart.md` executados manualmente +
`pnpm build` e `pnpm lint` sem erros (Constraint 5). Introdução de framework
de testes não é desta spec (decisão registrada em research.md).

**Target Platform**: navegador moderno (desktop), servido pelo `pnpm dev` /
`next start`.

**Project Type**: web application (App Router, estrutura feature-based em
`src/features/<modulo>` + `src/shared`).

**Performance Goals**: navegação entre rotas protegidas sem flash de conteúdo
protegido (guarda no nível de proxy); login concluído em < 5s em rede local
(SC-001); renovação de sessão invisível ao operador (SC-003).

**Constraints**: token de sessão nunca acessível ao JavaScript do navegador
(Princípio III, FR-005); nenhuma API do Next.js deprecated (Constraint 2 —
em Next 16 `middleware.ts` é deprecated, usar `proxy.ts`, ver research.md);
mocks temporários obrigatoriamente marcados (Princípio I).

**Scale/Scope**: 2 papéis exatos (administrador, funcionário); ~8 rotas
(`/login`, `/`, `/beneficios`, `/admin/*` placeholders); 4 endpoints de
autenticação no contrato esperado.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação no design | Status |
| --- | --- | --- |
| I. API como Contrato Único | Contrato esperado registrado em `contracts/auth-api.md`; mocks atrás de uma única camada (`src/features/auth/api`), marcados `MOCK (temporary)`; compare com Swagger real é task obrigatória quando o backend subir | ✅ Pass |
| II. Backend É a Autoridade | Painel não valida credenciais nem decide autorização: papel vem da resposta da API (`/auth/login`, `/auth/me`); guardas de `proxy.ts`/layout só previnem navegação; FR-013/FR-014 mapeados para design | ✅ Pass |
| III. Sessão Segura, Dados Mínimos | Tokens trocados por cookie httpOnly em Route Handler; zero exposição a JS do cliente; chaves externas via env vars (`API_BASE_URL`); sem novas dependências pagas | ✅ Pass |
| IV. Feature-Based e Portabilidade | Código em `src/features/auth` + `src/shared`; nada da cidade fixado — placeholders consomem apenas sessão e dados da API | ✅ Pass |
| V. Estados de UI Explícitos | Login, shell e placeholders exigem estados loading/vazio/erro distintos; login destrutivo N/A; ações destrutivas não existem nesta feature | ✅ Pass |
| Constraints 1–5 | Stack conforme `package.json`; docs de `node_modules/next/dist/docs/` consultados na pesquisa (proxy.ts, cookies async, Server Actions, BFF) | ✅ Pass |

**Gates pós-Phase 1**: reavaliados no fim de `research.md`/fase 1 — única
decisão que aproxima de violação é o proxy BFF (`/api/proxy/[...path]`),
que NÃO reinterpreta o contrato do backend: apenas repassa requisições
anexando a sessão. Sem violações a justificar em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-panel-foundation-auth/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── auth-api.md      # Contrato esperado da API FastAPI (baseline)
│   └── panel-session.md # Superfície interna do painel (sessão + server actions)
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── proxy.ts                     # Guardas de rota por sessão/papel (convenção proxy.ts de Next 16)
├── app/
│   ├── layout.tsx               # Root layout existente
│   ├── (painel)/                # Route group: shell + áreas protegidas
│   │   ├── layout.tsx           # Shell de layout com navegação condicional ao papel (T018, RBAC de superfície)
│   │   ├── page.tsx             # / (home admin com placeholders)
│   │   ├── beneficios/
│   │   │   └── page.tsx         # /beneficios — área do funcionário (RF03)
│   │   └── admin/
│   │       └── {funcionarios,pontos,eventos,rotas,dashboard}/page.tsx  # Placeholders admin* (SPE-02..07)
│   ├── login/
│   │   └── page.tsx             # Tela de login (RF02) — rota pública única
│   └── api/
│       └── proxy/
│           └── [...path]/route.ts  # BFF: repassa chamadas à FastAPI anexando token da sessão
├── features/
│   └── auth/
│       ├── api/                 # Única camada que fala com a FastAPI (mock quando API_BASE_URL ausente)
│       ├── session/             # Sessão server-side (cookie httpOnly, refresh, logout)
│       ├── components/          # LoginForm etc.
│       └── guards/              # Lógica de papel consumida por proxy.ts e layout
└── shared/
    ├── components/              # Button, DataTable (existentes) + novos transversais
    └── lib/
        └── http.ts              # Cliente HTTP compartilhado (FR-015): anexo de sessão, 401/refresh, divergência de contrato
```

**Structure Decision**: estrutura única de app Next.js (opção "web
application" não se aplica — o backend é um repositório à parte): código da
feature em `src/features/auth`, transversais em `src/shared`, rotas em
`src/app`, guardas em `src/proxy.ts`. A camada `features/auth/api` centraliza
toda conversa com a FastAPI — nenhuma outra pasta importa a FastAPI direto.

## Complexity Tracking

> Sem violações de constituição a justificar.