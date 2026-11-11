# Constituição — PassaNorte (Painel Administrativo)

> Documento de governança gerado via Spec Kit (`/speckit.constitution`). Fonte dos requisitos:
> [`docs/SYSTEM_REQUIREMENTS.md`](./SYSTEM_REQUIREMENTS.md) · Especificações: [`docs/SPECS.md`](./SPECS.md).
>
> **Cópia canônica** do Spec Kit: `.specify/memory/constitution.md` (a que os comandos consomem em runtime).
> Este arquivo em `docs/` é a versão legível/distribuível para a equipe.

## Prompt usado com o Spec Kit

Executar a partir da raiz do repositório:

```text
/speckit.constitution Crie a constituição do projeto PassaNorte (painel administrativo React/Next.js) a partir de docs/SYSTEM_REQUIREMENTS.md e docs/SPECS.md. Principios: (1) API como contrato único — todo dado exibido no painel provém da API RESTful FastAPI conforme o contrato OpenAPI/Swagger (RNF03); mocks apenas temporários, marcados nos artefatos; endpoint inexistente tem o "contrato esperado" registrado na spec. (2) Backend é a autoridade final — autorização (RF03), credenciais (RF01/RF04), baixa de estoque (RF20/RF21) e geração/invalidação de códigos de resgate (RF36) acontecem no backend; o frontend apenas previne navegação por papel e reflete o estado retornado pela API (regra de negócio duplicada no cliente é defeito). (3) Sessão segura e dados mínimos — JWT com expiração e renovação (RNF09), nenhum dado sensível de turista (CPF, passaporte, contato) no frontend (RNF08), chaves de integração só via variáveis de ambiente, preferência por ferramentas gratuitas/open source (RNF15). (4) Estrutura feature-based e portabilidade — código em src/features/<modulo> com componentes transversais em src/shared (RNF20), nenhum dado de cidade fixado no código: adaptação a outras localidades exige apenas config de dados (RNF06). (5) Estados de UI explícitos — loading, vazio e erro visíveis em toda interação com a API, confirmação obrigatória em ações destrutivas, credenciais exibidas uma única vez (RNF13 aplicado ao operador). Constraints de stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + pnpm; ler os guias em node_modules/next/dist/docs/ (AGENTS.md) e não usar APIs deprecated; integração de mapas (Google Maps ou OSM, RNF18) definida uma única vez na SPE-03 e reusada pela SPE-07; gráficos restritos ao Dashboard; pnpm build e lint sem erros como pré-condição; acessibilidade mínima (teclado, labels). Governança de desenvolvimento (Spec Kit): toda feature nasce de docs/SPECS.md e executa o ciclo specify → clarify → plan → tasks → analyze → implement; /speckit.analyze é gate obrigatório antes do implement; a ordem da Seção 3 de docs/SPECS.md é obrigatória fora de ordem só com o doc atualizado antes; princípios verificados no review de cada task.
```

> O comando acima é a entrada que `docs/CONSTITUTION.md` e `.specify/memory/constitution.md` documentam. Emendas futuras seguem o fluxo de **Governance** (abaixo) e devem manter os dois arquivos sincronizados, incluindo este prompt.
>
> **Emenda v1.1.0 (2026-11-01)** — alinhamento à estrutura real do repo pós-SPE-01: novo constraint de acesso à API por caminho único (`src/shared/lib/http.ts` server-side + túnel BFF `src/app/api/proxy`), decisão de mapas fechada (Google Maps via `@vis.gl/react-google-maps`), stack cliente sancionada (TanStack Query/Table, Base UI, React Hook Form + Zod, Zustand), lista de componentes compartilhados ampliada e compare de contrato registrado como obrigação de encerramento de feature.
>
> **Emenda v1.2.0 (2026-11-01)** — alinhamento à estrutura atual de `src/` e às dependências reais do `package.json`: dependência `cn` (merge de class names, substituto de clsx + tailwind-merge) sancionada na Constraint 1; utilitários transversais `src/shared/lib` (`http.ts`, `cn.ts`) incorporados ao Princípio IV; RBAC de superfície referenciado a `src/features/auth/guards` no Princípio II.
>
> **Emenda v1.2.1 (2026-11-01)** — Princípio IV passa a citar também o mapa de rotas do App Router (`(panel)/admin/{dashboard,attractions,events,tours,employees}`, `(panel)/benefits`, `login/`, túnel BFF `src/app/api/proxy/[...path]`); toda tela nova entra nessa árvore. Re-visão confirmou dependências e módulos já cobertos pela 1.2.0.
>
> **Emenda v2.0.0 (2026-11-06, MAJOR)** — Constraint 3 (Mapas) REDEFINIDA INCOMPATIVELMENTE: a integração de mapa migra de Google Maps para **OpenStreetMap via `react-leaflet`/`leaflet`** (decisão do owner — o Google exige billing com pré-pago, conflitando com RNF15; OSM é gratuito/open source, e o RNF18 já previa "Google Maps ou OSM"). `@vis.gl/react-google-maps` removida da lista sancionada; `SpotMapPicker` (SPE-03) migrou com a mesma interface de props e SPE-07 consome a integração OSM.
>
> **Emenda v2.1.0 (2026-11-10, MINOR)** — Constraint 1: `@zxing/browser` + peer `@zxing/library` sancionadas para o scanner de câmera da concessão de brindes (SPE-06/RF21) — única opção mantida ativamente, com MIT e controles de pausa exigidos pelo FR-009 (research D1 da SPE-06).
>
> **Emenda v2.2.0 (2026-11-10, MINOR)** — Constraint 4: `recharts` 3.x sancionada como biblioteca de gráficos do Dashboard (SPE-07) — 3.10.1 já instalada no `package.json`, MIT, peer-deps oficiais `react ^19.0.0` (`LineChart` para a série diária do RF07; `BarChart` horizontal para RF09/RF10 — research D1 da SPE-07). Nenhuma segunda biblioteca de gráficos sem emenda.

---

## Constituição (conteúdo aprovado — v2.2.0)

Este documento governa o desenvolvimento do **Painel Administrativo PassaNorte** (Next.js 16 / React 19), consumidor da API RESTful FastAPI. `docs/SPECS.md` é o índice das features (SPE-01..07) e fixa a ordem de implementação; os artefatos Spec Kit da feature corrente ficam em `specs/<NNN>-<nome>/` (spec.md, plan.md, tasks.md, contracts/, checklists/).

### Core Principles

**I. API como Contrato Único (Contract-First)**
Toda informação exibida no painel provém exclusivamente da API RESTful FastAPI (RNF03) por meio do contrato OpenAPI/Swagger. O frontend **NÃO DEVE** inventar formatos de resposta divergentes do contrato, **NÃO DEVE** manter dados mockados no lugar de endpoints reais (mocks temporários são permitidos apenas enquanto o endpoint correspondente não existir, e devem estar marcados como tal nos artefatos Spec Kit). Quando um endpoint ainda não existir no backend, a spec DEVE registrar o "contrato esperado" (rotas, payloads, códigos de resposta) a partir do Swagger, para que o backend o implemente ou o confirme (padrão: `contracts/*.md` dentro do diretório da feature). Parse defensivo é parte do contrato: payload fora do esperado vira erro explícito (`ContractViolationError`), nunca dado silenciosamente aceito.

**II. Backend É a Autoridade (Backend-Authoritative)**
Regras de negócio e de segurança pertencem ao backend. O frontend **NÃO** decide autorização final (RF03), **NÃO** cria/valida credenciais (RF01, RF04), **NÃO** efetua baixa de estoque (RF20/RF21) e **NÃO** gera ou invalida códigos de resgate (RF36) — o backend faz; no hash de senhas (RNF10) a senha em texto plano **NUNCA** chega ao frontend como dado persistido. O papel do painel é: prevenir navegação por papel (RBAC de superfície implementado em `src/features/auth/guards` — `roleCanAccess`/`homePathForRole`, RF03/RNF09) e **refletir fielmente o estado retornado pela API**. Regra de negócio duplicada no cliente é defeito. O túnel BFF (`src/app/api/proxy/[...path]`) apenas transporta requisições: **NUNCA** interpreta ou reescreve payload de negócio.

**III. Sessão Segura, Dados Mínimos (Secure-by-Default)**
A sessão usa JWT com expiração e renovação controladas (RNF09). No estado atual do projeto a sessão é cookie **httpOnly** gerido server-side (`src/features/auth/session`): o access token **NUNCA** é exposto ao código que roda no browser — chamadas client-side passam pelo túnel BFF, que anexa o token no servidor. **NUNCA** dados sensíveis de turistas — CPF, passaporte, contato — no localStorage ou em logs do frontend (RNF08). Chaves de integração (ex.: Google Maps) **NUNCA** aparecem em código fonte: apenas via variáveis de ambiente. Na escolha de bibliotecas e serviços, DEVE-se preferir opções gratuitas ou open source (RNF15, caráter acadêmico).

**IV. Estrutura Feature-Based e Portabilidade**
As rotas vivem em `src/app` sob o route group `(panel)` — `(panel)/admin/{dashboard,attractions,events,tours,employees}` + `(panel)/benefits` — além de `src/app/login` e do túnel BFF `src/app/api/proxy/[...path]`; toda tela nova entra nessa árvore, sem rotas fora dela. O código é organizado em `src/features/<módulo>` — por subpastas convencionadas (`api/`, `components/`, `guards/`, `session/`, `actions/`, `types/`), como em `src/features/auth` — com componentes transversais em `src/shared/components` (RNF20; Button, DataTable, EmptyState, ErrorState, LoadingState, PlaceholderSection são reusados antes que novos sejam criados) e utilitários transversais em `src/shared/lib` (`http.ts`, `cn.ts` — nenhum utilitário duplicado por feature). Nenhum dado da cidade (nome, coordenadas padrão, textos de apresentação, lista de categorias de pontos) **NUNCA** é fixado no código: tudo provém da API, garantindo que a adaptação do sistema a outras localidades exija apenas configuração de dados (RNF06).

**V. Estados de UI Explícitos e Feedback ao Operador**
Toda interação com a API expõe, de forma visível e distinta, os estados de carregamento, vazio e erro, com mensagens acionáveis (RNF13, adaptado ao operador do painel). Ações destrutivas (remoção de ponto/evento/rota, revogação de funcionário) DEVEM exigir confirmação explícita. Credenciais geradas pelo backend são exibidas uma única vez, com aviso claro de não-reexibição (SPE-02).

### Constraints de Stack e Qualidade

1. **Stack obrigatória:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4, gerenciado com pnpm. Bibliotecas sancionadas e já instaladas: TanStack Query (dados assíncronos), TanStack Table (tabelas), Base UI (primitivos de UI), React Hook Form + Zod (formulários e validação), Zustand (estado de cliente), lucide-react (ícones), class-variance-authority (variantes de componente), react-error-boundary, `cn` (merge de class names Tailwind, substituto de clsx + tailwind-merge, reexposto em `src/shared/lib/cn.ts`), `react-leaflet` + `leaflet` (mapas OSM, Constraint 3), `@zxing/browser` + peer `@zxing/library` (scanner de câmera da concessão de brindes — SPE-06, RF21; MIT, controles de pausa exigidos pelo FR-009). Versões do `package.json` são a referência; nova dependência exige justificativa no artefato Spec Kit e preferência por opção gratuita/open source (Princípio III).
2. **Documentação vigente:** antes de escrever código Next.js/React, ler os guias em `node_modules/next/dist/docs/` (`AGENTS.md`): APIs e convenções divergem de versões antigas do framework; APIs marcadas como deprecated **NÃO** devem ser usadas.
3. **Mapas:** integração **OpenStreetMap via `react-leaflet` + `leaflet`** (RNF18 — "Google Maps ou OSM"), definida uma única vez (SPE-03, `SpotMapPicker`) e reusada pelo Dashboard (SPE-07); bibliotecas gratuitas e open source, **sem chave de API nem billing** (RNF15 — decisão do owner em 2026-11-06 em detrimento do pré-pago do Google Maps); assets de ícone/marker do pacote servidos pelo próprio bundle, sem CDN. Nenhuma segunda integração de mapa, nenhuma fonte de tiles paga por chave, e nenhuma reversão ao Google Maps sem emenda desta constituição.
4. **Gráficos:** restritos ao Dashboard (SPE-07). `recharts` 3.x sancionada — já instalada (3.10.1 no `package.json`, MIT, peer-deps oficiais `react ^19.0.0`) e escolhida no plan da SPE-07 (research D1, 2026-11-10): `LineChart` para a série diária do contador (RF07) e `BarChart` em barras horizontais para as distribuições (RF09/RF10). Nenhuma segunda biblioteca de gráficos sem emenda.
5. **Acesso à API por caminho único:** chamadas server-side passam exclusivamente por `src/shared/lib/http.ts` (`apiFetch`/`apiJson`); chamadas client-side passam exclusivamente pelo túnel BFF `src/app/api/proxy/[...path]`. O token `Authorization` é anexado **apenas** nesses dois pontos, com política única de renovação em 401 com replay da requisição original. Nenhuma feature monta `fetch` à API por conta própria.
6. **Qualidade:** `pnpm build` e `pnpm lint` (eslint) sem erros é pré-condição para encerrar qualquer task; acessibilidade mínima (navegação por teclado, labels em formulários) faz parte da definição de pronto.

### Governança de Desenvolvimento (Spec Kit)

1. Toda feature nasce de uma spec em `docs/SPECS.md`, executa o ciclo `/speckit.specify` → `/speckit.clarify` (recomendado) → `/speckit.plan` → `/speckit.tasks` → `/speckit.analyze` → `/speckit.implement`, e materializa seus artefatos em `specs/<NNN>-<nome>/`.
2. `/speckit.analyze` é **gate obrigatório** antes de `/speckit.implement`; inconsistências entre spec, plan e tasks são resolvidas antes do código.
3. A ordem de implementação e as dependências declaradas em `docs/SPECS.md` (Seção 3) são obrigatórias. Implementar fora de ordem exige atualizar `docs/SPECS.md` **antes**, com justificativa.
4. Cada princípio desta constituição é verificado no review dos artefatos Spec Kit e do código (code review por task); divergência com princípio reprova o gate, independentemente de a funcionalidade "funcionar".
5. **Compare de contrato obrigatório** (follow-up da SPE-01, registrado em `docs/SPECS.md`): enquanto o Swagger real não for acessível, o contrato esperado de `contracts/*.md` é baseline com mocks; antes de declarar uma feature encerrada, o contrato é comparado campo a campo contra o Swagger `/docs` e divergências atualizam spec + contrato antes de reexecutar tasks.

### Governance

- Esta constituição **supersedes** preferências locais de implementação e práticas ad hoc: em conflito, a constituição vence ou é formalmente emendada.
- **Emendas:** editar o documento, atualizar `Last Amended`, incrementar a versão (SemVer — MAJOR: princípio removido/redefinido incompativelmente; MINOR: novo princípio ou seção; PATCH: esclarecimentos) e registrar o resumo da mudança no Sync Impact Report. Cópia legível em `docs/CONSTITUTION.md` deve ser mantida em sincronia.
- **Compliance review:** a cada ciclo Spec Kit, os princípios I–V e as Constraints 1–6 são checados contra os artefatos (spec.md, plan.md, tasks.md) e contra o código entregue.

**Version**: 2.2.0 | **Ratified**: 2026-10-30 | **Last Amended**: 2026-11-10