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

---

## Constituição (conteúdo aprovado — v1.0.0)

Este documento governa o desenvolvimento do **Painel Administrativo PassaNorte** (Next.js 16 / React 19), consumidor da API RESTful FastAPI.

### Core Principles

**I. API como Contrato Único (Contract-First)**
Toda informação exibida no painel provém exclusivamente da API RESTful FastAPI (RNF03) por meio do contrato OpenAPI/Swagger. O frontend **NÃO DEVE** inventar formatos de resposta divergentes do contrato, **NÃO DEVE** manter dados mockados no lugar de endpoints reais (mocks temporários são permitidos apenas enquanto o endpoint correspondente não existir, e devem estar marcados como tal nos artefatos Spec Kit). Quando um endpoint ainda não existir no backend, a spec DEVE registrar o "contrato esperado" (rotas, payloads, códigos de resposta) a partir do Swagger, para que o backend o implemente ou o confirme.

**II. Backend É a Autoridade (Backend-Authoritative)**
Regras de negócio e de segurança pertencem ao backend. O frontend **NÃO** decide autorização final (RF03), **NÃO** cria/valida credenciais (RF01, RF04), **NÃO** efetua baixa de estoque (RF20/RF21) e **NÃO** gera ou invalida códigos de resgate (RF36) — o backend faz; no hash de senhas (RNF10) a senha em texto plano **NUNCA** chega ao frontend como dado persistido. O papel do painel é: prevenir navegação por papel (RBAC de superfície, RF03/RNF09) e **refletir fielmente o estado retornado pela API**. Regra de negócio duplicada no cliente é defeito.

**III. Sessão Segura, Dados Mínimos (Secure-by-Default)**
A sessão usa JWT com expiração e renovação controladas (RNF09) e é armazenada de forma segura (cookie httpOnly quando viável; **NUNCA** dados sensíveis de turistas — CPF, passaporte, contato — no localStorage ou em logs do frontend, RNF08). Chaves de integração (ex.: Google Maps) **NUNCA** aparecem em código fonte: apenas via variáveis de ambiente. Na escolha de bibliotecas e serviços, DEVE-se preferir opções gratuitas ou open source (RNF15, caráter acadêmico).

**IV. Estrutura Feature-Based e Portabilidade**
O código é organizado em `src/features/<módulo>` com componentes transversais em `src/shared/components` (RNF20); componentes compartilhados existentes (Button, DataTable) são reusados antes que novos sejam criados. Nenhum dado da cidade (nome, coordenadas padrão, textos de apresentação, lista de categorias de pontos) **NUNCA** é fixado no código: tudo provém da API, garantindo que a adaptação do sistema a outras localidades exija apenas configuração de dados (RNF06).

**V. Estados de UI Explícitos e Feedback ao Operador**
Toda interação com a API expõe, de forma visível e distinta, os estados de carregamento, vazio e erro, com mensagens acionáveis (RNF13, adaptado ao operador do painel). Ações destrutivas (remoção de ponto/evento/rota, revogação de funcionário) DEVEM exigir confirmação explícita. Credenciais geradas pelo backend são exibidas uma única vez, com aviso claro de não-reexibição (SPE-02).

### Constraints de Stack e Qualidade

1. **Stack obrigatória:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4, gerenciado com pnpm. Versões do `package.json` são a referência.
2. **Documentação vigente:** antes de escrever código Next.js/React, ler os guias em `node_modules/next/dist/docs/` (`AGENTS.md`): APIs e convenções divergem de versões antigas do framework; APIs marcadas como deprecated **NÃO** devem ser usadas.
3. **Mapas:** a integração com Google Maps ou OSM (RNF18) é definida uma única vez (SPE-03) e reusada pelo Dashboard (SPE-07). Não há segunda integração.
4. **Gráficos:** restritos ao Dashboard (SPE-07), com biblioteca client-side compatível com React 19 (ex.: Recharts).
5. **Qualidade:** `pnpm build` e `pnpm lint` (eslint-config-next) sem erros é pré-condição para encerrar qualquer task; acessibilidade mínima (navegação por teclado, labels em formulários) faz parte da definição de pronto.

### Governança de Desenvolvimento (Spec Kit)

1. Toda feature nasce de uma spec em `docs/SPECS.md` e executa o ciclo `/speckit.specify` → `/speckit.clarify` (recomendado) → `/speckit.plan` → `/speckit.tasks` → `/speckit.analyze` → `/speckit.implement`.
2. `/speckit.analyze` é **gate obrigatório** antes de `/speckit.implement`; inconsistências entre spec, plan e tasks são resolvidas antes do código.
3. A ordem de implementação e as dependências declaradas em `docs/SPECS.md` (Seção 3) são obrigatórias. Implementar fora de ordem exige atualizar `docs/SPECS.md` **antes**, com justificativa.
4. Cada princípio desta constituição é verificado no review dos artefatos Spec Kit e do código (code review por task); divergência com princípio reprova o gate, independentemente de a funcionalidade "funcionar".

### Governance

- Esta constituição **supersedes** preferências locais de implementação e práticas ad hoc: em conflito, a constituição vence ou é formalmente emendada.
- **Emendas:** editar o documento, atualizar `Last Amended`, incrementar a versão (SemVer — MAJOR: princípio removido/redefinido incompativelmente; MINOR: novo princípio ou seção; PATCH: esclarecimentos) e registrar o resumo da mudança no Sync Impact Report.
- **Compliance review:** a cada ciclo Spec Kit, os princípios I–V e as Constraints 1–5 são checados contra os artefatos (spec.md, plan.md, tasks.md) e contra o código entregue.

**Version**: 1.0.0 | **Ratified**: 2026-10-30 | **Last Amended**: 2026-10-30