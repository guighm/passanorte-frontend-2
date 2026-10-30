# Research: Fundações e Autenticação do Painel

**Feature**: 001-panel-foundation-auth · **Date**: 2026-10-30

Nenhum item `NEEDS CLARIFICATION` restante da spec / plano. As decisões abaixo
resolvem as incógnitas técnicas do plano, todas verificadas contra a
documentação empacotada em `node_modules/next/dist/docs/` (Constraint 2 da
constituição: Next 16 diverge de versões antigas).

## D1. Guardas de rota: `proxy.ts`, não `middleware.ts`

- **Decision**: guardas por sessão/papel em `src/proxy.ts` (convenção nova)
  + verificação de papel em Server Components (layouts) para dados.
- **Rationale**: o guia `01-app/03-api-reference/03-file-conventions/middleware.md`
  de Next 16 declara explicitamente: "The `middleware.js` file convention has
  been **deprecated** in Next.js 16 and renamed to `proxy.js`". `proxy.ts`
  executa antes das rotas renderizarem, lê `request.cookies` (o cookie
  httpOnly é legível do lado do servidor) e redireciona sem renderizar
  conteúdo protegido — elimina o "flash" de conteúdo protegido (US2, SC-002).
  A verificação de papel (não apenas presença de sessão) fica no
  `layout.tsx`/página server-side, que pode consultar `/auth/me` — `proxy.ts`
  documentadamente não deve depender de módulos compartilhados pesados.
- **Alternatives considered**: `middleware.ts` (deprecated — recusado,
  Constraint 2); guardas apenas em layout de rota (deixa flash de conteúdo e
  depende de render para bloquear; recusado como mecanismo único, mantido
  como segunda camada de papel).

## D2. Sessão: cookie httpOnly + Route Handlers server-side (clarificação Q1)

- **Decision**: os tokens (`access_token`, `refresh_token`) retornados por
  `/auth/login` / `/auth/refresh` são trocados por cookies httpOnly
  (`passanorte.session`, `passanorte.refresh`), gravados por Route Handlers
  (`src/app/api/.../route.ts`); o JS do navegador nunca os lê.
- **Rationale**: fixado na clarify (Q1 = A) e exigido pelos Princípios
  III/FR-005. A guide `02-guides/backend-for-frontend.md` do Next 16 valida o
  padrão BFF (painel como intermediário do backend). `cookies()` no Next 16 é
  **async** (`await cookies()`) — doc `04-functions/cookies.md`;
  gravação de cookie só é permitida em Server Functions/Route Handlers
  (Server Components só leem), o que define a arquitetura abaixo.
- **Alternatives considered**: `localStorage` (recusado — expõe token a XSS);
  token só em memória (recusado — perde sessão em recarga, FR-005).

## D3. Acesso à FastAPI: camada `features/auth/api` + BFF mínimo

- **Decision**: toda chamada à FastAPI sai de (`a`) Server Components/Server
  Actions via `src/shared/lib/http.ts` (anexo token server-side + renovação
  401) e (`b`) um BFF mínimo `src/app/api/proxy/[...path]/route.ts` para o
  caso (necessário nas próximas specs) de interações client-side — o BFF
  repassa o caminho e o corpo sem reinterpretar payloads.
- **Rationale**: FR-015 (cliente HTTP compartilhado com repasse da sessão,
  401/refresh, divergência de contrato). Renovação server-side: um único
  `POST /auth/refresh` por ciclo (US3 cenário 4) fica trivial de coordenar
  com um mutex em memória server-side. BFF minimalista evita dupla fonte de
  verdade: o contrato continua sendo o Swagger da FastAPI; o BFF é túnel, não
  tradutor.
- **Alternatives considered**: chamadas diretas do navegador à FastAPI com
  Bearer (exige token legível no JS — viola FR-005); lib de auth de terceiros
  (NextAuth etc. — induz segundo contrato de sessão, fere Princípio I e
  adiciona dependência desnecessária ao escopo).

## D4. Login: Server Action + `useActionState`

- **Decision**: formulário de login usa `<form action={...}>` com Server
  Action e `useActionState` (guia `02-guides/authentication.md` +
  `01-getting-started/mutating-data.md`), estados de pending/error vindos do
  fluxo itself.
- **Rationale**: executa no servidor (credenciais nunca trafegam via código
  cliente além do form), padrão recomendado pelo guia oficial, dá de graça os
  estados de carregamento/erro (FR-003, Princípio V, acessibilidade nativa do
  form — FR-019).
- **Alternatives considered**: chamada fetch client-side do login (coloca a
  senha no contexto de componentes cliente e duplica estados de UI).

## D5. Papéis e mapa de rotas

- **Decision**: `administrador → /` (home com placeholders de todas as
  seções); `funcionário → /beneficios`. Rotas admin em `/admin/<secao>`
  (placeholders: funcionarios, pontos, eventos, rotas, dashboard);
  `/beneficios` acessível a administrador e funcionário; `/login` pública.
- **Rationale**: fixado na SPECS.md (RBAC de superfície: "admin/*" bloqueado
  para funcionário; "/beneficios" acessível) e nos FR-010..FR-012. Dois
  papéis exatos (Assumption da spec).
- **Alternatives considered**: redirecionar funcionário para home do painel
  (mostraria placeholders administrativos — viola FR-010/SC-005).

## D6. Mocks temporários governados (clarificação Q2 = B)

- **Decision**: quando `API_BASE_URL` não estiver definida (o backend não
  está de pé), a camada `features/auth/api` responde com fixtures
  equivalentes ao contrato de `contracts/auth-api.md`; cada módulo mock
  traz o marcador `// MOCK (temporary): remove when /auth/* is live`
  (Princípio I). Nenhuma tela sabe se está em mock ou não.
- **Rationale**: permite validar end-to-end login/refresh/guardas sem o
  backend, com risco de divergência confinado a 1 arquivo por endpoint; a
  conferência contra o Swagger real é pré-condição para encerrar a SPE-01
  (Assumption da spec).
- **Alternatives considered**: wire mock mais pesado (MSW) — desnecessário
  para 4 endpoints; aguardar backend — bloqueia a fundação de todas as specs.

## D7. Testes: manual + gate build/lint nesta spec

- **Decision**: validação via `quickstart.md` (cenários US1–US4 executados
  no `pnpm dev` com mocks e, quando disponível, contra o backend real);
  gates `pnpm build` + `pnpm lint`.
- **Rationale**: o repositório não tem framework de testes configurado;
  introduzir Vitest/Jest é decisão de infraestrutura que foge ao escopo da
  fundação. A revisão desta decisão fica para o `/speckit-tasks` (podendo
  incluir setup de testes como task opcional) ou emenda posterior.
- **Alternatives considered**: adicionar Vitest nesta spec — amplia escopo
  além dos requisitos da SPE-01 sem pedido explícito.

## D8. Biblioteca de gráficos/mapas — N/A nesta spec

- **Decision**: nada de Recharts nem de integração de mapas aqui.
- **Rationale**: restritos à SPE-07 e SPE-03 (Constraints 3 e 4 da
  constituição); registrados para evitar escopo acidental.