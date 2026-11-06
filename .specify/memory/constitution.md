<!--
  Sync Impact Report
  ==================
  Version change: 1.2.1 → 2.0.0
  Modified constraints: 3 (Mapas) — REDEFINIDA INCOMPATIVELMENTE: a integração
    de mapa do painel migra de Google Maps (@vis.gl/react-google-maps) para
    **OpenStreetMap via react-leaflet/leaflet** (decisão do owner em
    2026-11-06, registrada como clarificação da SPE-03): o Google exige
    billing habilitada com pré-pago (R$200 na billing brasileira), conflitando
    com RNF15 (caráter acadêmico, sem orçamento); OSM é gratuito/open source e o
    RNF18 já previa "Google Maps ou OSM". `@vis.gl/react-google-maps` REMOVIDA
    da lista sancionada da Constraint 1 (dependência desinstalada); react-leaflet
    + leaflet sancionadas. SpotMapPicker (SPE-03) migrou com a MESMA interface de
    props — SPE-07 (heatmap RF06) consome a integração OSM normalmente.
  Added sections: (none)
  Removed sections: (none)
  Follow-up TODOs: (none)
  Motivo da emenda: custo real de infraestrutura do Google Maps vs alternativa
    gratuita equivalente no projeto (RNF15) — redefinição incompatível da
    Constraint 3 ⇒ bump MAJOR (2.0.0).
  Histórico: 1.2.0 → 1.2.1 (2026-11-01) — re-visão da constituição contra a
    estrutura real de src/ e o package.json em 2026-11-01 confirmou a emenda
    1.2.0 (dependências e módulos auth/shared conferem); único elemento ausente
    era o mapa de rotas do App Router, acrescentado ao Princípio IV
    (esclarecimento → PATCH).
  Modified principles: IV (agora cita também o mapa de rotas do App Router:
    route group `(panel)` com admin/{dashboard,attractions,events,tours,employees}
    e benefits, mais `login/` e o túnel BFF `src/app/api/proxy/[...path]`;
    novas telas só entram nessa árvore).
  Added sections: (none)
  Removed sections: (none)
  Follow-up TODOs: (none)
  Motivo da emenda: re-visão da constituição contra a estrutura real de src/ e o
    package.json em 2026-11-01 confirmou a emenda 1.2.0 (dependências e módulos
    auth/shared conferem); único elemento ausente era o mapa de rotas do App
    Router, acrescentado ao Princípio IV (esclarecimento → PATCH).
  Histórico: 1.1.0 → 1.2.0 (2026-11-01) — dependência `cn` sancionada na
    Constraint 1; utilitários transversais src/shared/lib (http.ts, cn.ts) no
    Princípio IV; princípios II e III detalhados com os módulos reais da feature
    auth (src/features/auth/{actions,api,components,guards,session,types}).
  Modified principles: IV (agora cita também utilitários transversais em
    src/shared/lib — cn.ts, http.ts); II e III detalhados com os módulos reais
    da feature auth (src/features/auth/{actions,api,components,guards,session,types}).
  Added sections: Constraint 1 — dependência `cn` (merge de class names, substituto
    de clsx + tailwind-merge) adicionada à lista de bibliotecas sancionadas.
  Removed sections: (none)
  Follow-up TODOs: (none)
  Motivo da emenda: alinhar a constituição à estrutura atual de src/ e às
    dependências reais do package.json em 2026-11-01 (dependência `cn` instalada
    sem sanção explícita; mapa de diretórios da feature auth desatualizado).
-->
# PassaNorte (Painel Administrativo) Constitution

Este documento governa o desenvolvimento do **Painel Administrativo PassaNorte**
(Next.js 16 / React 19), consumidor da API RESTful FastAPI. Fonte dos requisitos:
`docs/SYSTEM_REQUIREMENTS.md`; `docs/SPECS.md` é o índice das features (SPE-01..07)
e fixa a ordem de implementação; os artefatos Spec Kit da feature corrente ficam
em `specs/<NNN>-<nome>/` (spec.md, plan.md, tasks.md, contracts/, checklists/).

## Core Principles

### I. API como Contrato Único (Contract-First)

Toda informação exibida no painel provém exclusivamente da API
RESTful FastAPI (RNF03) por meio do contrato OpenAPI/Swagger. O frontend **NÃO
DEVE** inventar formatos de resposta divergentes do contrato, **NÃO DEVE** manter
dados mockados no lugar de endpoints reais (mocks temporários são permitidos
apenas enquanto o endpoint correspondente não existir, e devem estar marcados
como tal nos artefatos Spec Kit). Quando um endpoint ainda não existir no
backend, a spec DEVE registrar o "contrato esperado" (rotas, payloads, códigos
de resposta) a partir do Swagger, para que o backend o implemente ou o confirme
(padrão: `contracts/*.md` dentro do diretório da feature). Parse defensivo é
parte do contrato: payload fora do esperado vira erro explícito
(`ContractViolationError`), nunca dado silenciosamente aceito.

### II. Backend É a Autoridade (Backend-Authoritative)

Regras de negócio e de segurança pertencem ao backend. O frontend **NÃO** decide
autorização final (RF03), **NÃO** cria/valida credenciais (RF01, RF04), **NÃO**
efetua baixa de estoque (RF20/RF21) e **NÃO** gera ou invalida códigos de
resgate (RF36) — o backend faz; no hash de senhas (RNF10) a senha em texto plano
**NUNCA** chega ao frontend como dado persistido. O papel do painel é: prevenir
navegação por papel (RBAC de superfície implementado em
`src/features/auth/guards` — `roleCanAccess`/`homePathForRole`, RF03/RNF09) e
**refletir fielmente o estado retornado pela API**. Regra de negócio duplicada
no cliente é defeito. O túnel BFF (`src/app/api/proxy/[...path]`) apenas
transporta requisições: **NUNCA** interpreta ou reescreve payload de negócio.

### III. Sessão Segura, Dados Mínimos (Secure-by-Default)

A sessão usa JWT com expiração e renovação controladas (RNF09). No estado atual
do projeto a sessão é cookie **httpOnly** gerido server-side
(`src/features/auth/session`): o access token **NUNCA** é exposto ao código que
roda no browser — chamadas client-side passam pelo túnel BFF, que anexa o token
no servidor. **NUNCA** dados sensíveis de turistas — CPF, passaporte, contato —
no localStorage ou em logs do frontend (RNF08). Chaves de integração (ex.:
Google Maps) **NUNCA** aparecem em código fonte: apenas via variáveis de
ambiente. Na escolha de bibliotecas e serviços, DEVE-se preferir opções
gratuitas ou open source (RNF15, caráter acadêmico).

### IV. Estrutura Feature-Based e Portabilidade

As rotas vivem em `src/app` sob o route group `(panel)` —
`(panel)/admin/{dashboard,attractions,events,tours,employees}` +
`(panel)/benefits` — além de `src/app/login` e do túnel BFF
`src/app/api/proxy/[...path]`; toda tela nova entra nessa árvore, sem rotas
fora dela. O código é organizado em `src/features/<módulo>` — por subpastas
convencionadas (`api/`, `components/`, `guards/`, `session/`, `actions/`,
`types/`), como em `src/features/auth` — com componentes transversais em
`src/shared/components` (RNF20; Button, DataTable, EmptyState, ErrorState,
LoadingState, PlaceholderSection são reusados antes que novos sejam criados)
e utilitários transversais em `src/shared/lib` (`http.ts`, `cn.ts` — nenhum
utilitário duplicado por feature). Nenhum dado da cidade (nome,
coordenadas padrão, textos de apresentação, lista de categorias de pontos)
**NUNCA** é fixado no código: tudo provém da API, garantindo que a adaptação do
sistema a outras localidades exija apenas configuração de dados (RNF06).

### V. Estados de UI Explícitos e Feedback ao Operador

Toda interação com a API expõe, de forma visível e distinta, os estados de
carregamento, vazio e erro, com mensagens acionáveis (RNF13, adaptado ao
operador do painel). Ações destrutivas (remoção de ponto/evento/rota, revogação
de funcionário) DEVEM exigir confirmação explícita. Credenciais geradas pelo
backend são exibidas uma única vez, com aviso claro de não-reexibição (SPE-02).

## Constraints de Stack e Qualidade

1. **Stack obrigatória:** Next.js 16 (App Router) + React 19 + TypeScript +
   Tailwind CSS 4, gerenciado com pnpm. Bibliotecas sancionadas e já instaladas:
   TanStack Query (dados assíncronos), TanStack Table (tabelas), Base UI
   (primitivos de UI), React Hook Form + Zod (formulários e validação), Zustand
   (estado de cliente), lucide-react (ícones), class-variance-authority
   (variantes de componente), react-error-boundary, `cn` (merge de class names
   Tailwind, substituto de clsx + tailwind-merge, reexposto em
   `src/shared/lib/cn.ts`), `react-leaflet` + `leaflet` (mapas OSM, Constraint 3).
   Versões do `package.json`
   são a referência; nova dependência exige justificativa no artefato Spec Kit e
   preferência por opção gratuita/open source (Princípio III).
2. **Documentação vigente:** antes de escrever código Next.js/React, ler os
   guias em `node_modules/next/dist/docs/` (`AGENTS.md`): APIs e convenções
   divergem de versões antigas do framework; APIs marcadas como deprecated
   **NÃO** devem ser usadas.
3. **Mapas:** integração **OpenStreetMap via `react-leaflet` + `leaflet`**
   (RNF18 — "Google Maps ou OSM"), definida uma única vez (SPE-03,
   `SpotMapPicker`) e reusada pelo Dashboard (SPE-07); bibliotecas
   gratuitas e open source, **sem chave de API nem billing** (RNF15 —
   decisão do owner em 2026-11-06 em detrimento do pré-pago do Google
   Maps); assets de ícone/marker do pacote servidos pelo próprio bundle,
   sem CDN. Nenhuma segunda integração de mapa, nenhuma fonte de tiles
   paga por chave, e nenhuma reversão ao Google Maps sem emenda desta
   constituição.
4. **Gráficos:** restritos ao Dashboard (SPE-07). Nenhuma biblioteca de gráficos
   está instalada; a escolha (client-side, compatível com React 19) é feita uma
   única vez no plan da SPE-07 e sancionada aqui por emenda, se necessário.
5. **Acesso à API por caminho único:** chamadas server-side passam
   exclusivamente por `src/shared/lib/http.ts` (`apiFetch`/`apiJson`); chamadas
   client-side passam exclusivamente pelo túnel BFF
   `src/app/api/proxy/[...path]`. O token `Authorization` é anexado **apenas**
   nesses dois pontos, com política única de renovação em 401 com replay da
   requisição original. Nenhuma feature monta `fetch` à API por conta própria.
6. **Qualidade:** `pnpm build` e `pnpm lint` (eslint) sem erros é pré-condição
   para encerrar qualquer task; acessibilidade mínima (navegação por teclado,
   labels em formulários) faz parte da definição de pronto.

## Governança de Desenvolvimento (Spec Kit)

1. Toda feature nasce de uma spec em `docs/SPECS.md`, executa o ciclo
   `/speckit.specify` → `/speckit.clarify` (recomendado) → `/speckit.plan` →
   `/speckit.tasks` → `/speckit.analyze` → `/speckit.implement`, e materializa
   seus artefatos em `specs/<NNN>-<nome>/`.
2. `/speckit.analyze` é **gate obrigatório** antes de `/speckit.implement`;
   inconsistências entre spec, plan e tasks são resolvidas antes do código.
3. A ordem de implementação e as dependências declaradas em `docs/SPECS.md`
   (Seção 3) são obrigatórias. Implementar fora de ordem exige atualizar
   `docs/SPECS.md` **antes**, com justificativa.
4. Cada princípio desta constituição é verificado no review dos artefatos Spec
   Kit e do código (code review por task); divergência com princípio reprova o
   gate, independentemente de a funcionalidade "funcionar".
5. **Compare de contrato obrigatório** (follow-up da SPE-01, registrado em
   `docs/SPECS.md`): enquanto o Swagger real não for acessível, o contrato
   esperado de `contracts/*.md` é baseline com mocks; antes de declarar uma
   feature encerrada, o contrato é comparado campo a campo contra o Swagger
   `/docs` e divergências atualizam spec + contrato antes de reexecutar tasks.

## Governance

- Esta constituição **supersedes** preferências locais de implementação e
  práticas ad hoc: em conflito, a constituição vence ou é formalmente emendada.
- **Emendas:** editar este documento, atualizar `Last Amended`, incrementar a
  versão (SemVer — MAJOR: princípio removido/redefinido incompatívelmente;
  MINOR: novo princípio ou seção; PATCH: esclarecimentos) e registrar o resumo
  da mudança no Sync Impact Report. Cópia legível em `docs/CONSTITUTION.md`
  deve ser mantida em sincronia.
- **Compliance review:** a cada ciclo Spec Kit, os princípios I–V e as
  Constraints 1–6 são checados contra os artefatos (spec.md, plan.md,
  tasks.md) e contra o código entregue.

**Version**: 2.0.0 | **Ratified**: 2026-10-30 | **Last Amended**: 2026-11-06