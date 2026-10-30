# SPECS — PassaNorte (Painel Administrativo)

> Especificações de features para construção com **Spec Kit**. Fonte dos requisitos: [`docs/SYSTEM_REQUIREMENTS.md`](./SYSTEM_REQUIREMENTS.md).

## 1. Contexto e Escopo

- **Este repositório é o Painel Administrativo em React** (RNF04): aplicação **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4**, com estrutura feature-based em `src/features/<modulo>` e `src/shared`.
- **Backend fora deste repositório:** API RESTful Python/FastAPI + Pydantic (RNF03), consumida via contrato OpenAPI/Swagger (`/docs`).
- **Aplicação Passaporte (turista) fora de escopo** deste repositório: é o app mobile em Kotlin/Jetpack Compose (RNF05). Requisitos turista (RF22–RF39) **não** geram specs aqui — mas o dashboard consome os dados que eles produzem (visitações, acessos, perfis).

### Requisitos atribuídos a este repositório

| RF | Requisito | Spec |
| --- | --- | --- |
| RF02 | Login do painel | SPE-01 |
| RF03 | RBAC (admin total, funcionário restrito) | SPE-01 |
| RF04 | Cadastro de funcionário | SPE-02 |
| RF05 | Edição/remoção de funcionário | SPE-02 |
| RF06 | Dashboard — mapa de calor | SPE-07 |
| RF07 | Dashboard — contador de acessos | SPE-07 |
| RF08 | Dashboard — ranking de pontos | SPE-07 |
| RF09 | Dashboard — países de origem | SPE-07 |
| RF10 | Dashboard — interesses | SPE-07 |
| RF11 | Cadastro de ponto turístico | SPE-03 |
| RF12 | Edição/remoção de ponto | SPE-03 |
| RF13 | Categorização | SPE-03 |
| RF14 | Cronograma de funcionamento | SPE-03 |
| RF15 | Status do ponto | SPE-03 |
| RF16 | Cadastro de evento | SPE-04 |
| RF17 | Edição/remoção de evento | SPE-04 |
| RF18 | Cadastro de rota turística | SPE-05 |
| RF19 | Edição/remoção de rota | SPE-05 |
| RF20 | Estoque de brindes | SPE-05 |
| RF21 | Escaneamento para concessão de brinde | SPE-06 |

**Fora de escopo (não geram spec aqui):** RF01 (script de credenciais — roda no backend), RF22–RF39 (app do turista), RNF02/RNF03/RNF05 (microsserviços, API FastAPI, mobile Kotlin).

---

## 2. Como usar com Spec Kit

Para **cada spec da lista**, na ordem de implementação da Seção 3, executar o ciclo completo do Spec Kit — o comando `/speckit.specify` abaixo é o prompt de entrada; os demais comandos usam a feature atual do spec-kit:

```
/speckit.specify <prompt da spec>   # cria specs/<feature>/spec.md
/speckit.clarify                    # opcional e recomendado: encoda ambiguidades pendentes na spec
/speckit.checklist                  # opcional: checklist customizado antes de planejar
/speckit.plan <stack/detalhes>      # gera plan.md (design e artefatos)
/speckit.tasks                      # gera tasks.md ordenado por dependências
/speckit.analyze                    # checagem de consistência spec ↔ plan ↔ tasks
/speckit.implement                  # executa as tasks
/speckit.converge                   # opcional: reconcile codebase vs specs e adiciona tasks faltantes
```

**Convenções que valem para todas as specs** (repetir sempre que forem citadas): a API FastAPI é o contrato em Swagger/OpenAPI; nenhum dado sensível é armazenado no frontend além do JWT de sessão; ações administrativas devem refletir estados de carregamento/erro de API com feedback claro ao operador.

---

## 3. Ordem de implementação

| Ordem | Spec | Nome | Complexidade | Depende de |
| --- | --- | --- | --- | --- |
| 1 | SPE-01 | Fundações e Autenticação do Painel | Média | — |
| 2 | SPE-02 | Gerenciamento de Funcionários | Baixa | SPE-01 |
| 3 | SPE-03 | Gerenciamento de Pontos Turísticos | Média | SPE-01 |
| 4 | SPE-04 | Gerenciamento de Eventos | Baixa | SPE-03 |
| 5 | SPE-05 | Rotas Turísticas e Estoque de Brindes | Média | SPE-03 |
| 6 | SPE-06 | Concessão de Brindes (Funcionário) | Média | SPE-01, SPE-05 |
| 7 | SPE-07 | Dashboard e Insights | Alta | SPE-03 (dados de visita via API) |

> SPE-02, SPE-03 (e derivadas) podem ser construídas **em paralelo** depois de SPE-01.

---

## 4. Especificações

### SPE-01 — Fundações e Autenticação do Painel

**Requisitos:** RF02, RF03 · **Cross (RNF):** RNF09 (JWT com expiração/renovação); RNF10 (hash de senhas) e a autorização final são do backend
**Módulos:** Autenticação · Fundação da aplicação

**Objetivo:** infraestrutura transversal do painel + autenticação: tela de login, sessão JWT, guardas de rota por papel e `layout shell` reutilizado por todas as features seguintes.

**Inclui:**
- Tela de login (RF02) autenticando contra `/auth/login` (contrato OpenAPI), persistindo token e dados do usuário de forma segura (expiração e refresh conforme RNF09).
- RBAC no frontend (RF03): rotas admin (`admin/*`) bloqueadas para funcionário; `/beneficios` (concessão) acessível a funcionário; redirecionamento pós-login por papel. A decisão final de autorização é sempre do backend — o frontend apenas previne navegação.
- Layout shell: navegação lateral/topbar com itens condicionais ao papel, estado de sessão, logout.
- Features subsequentes seguem a estrutura feature-based existente (`src/features/<modulo>`, `src/shared/components`) — a fundação formaliza isso.

**Prompt:**

```text
/speckit.specify Fundações e autenticação do painel administrativo PassaNorte. Aplicação React 19 / Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, com estrutura feature-based em src/features/<modulo> e componentes em src/shared/components (Button e DataTable já existem como referência de padrão). Deve cobrir os requisitos RF02 e RF03 de docs/SYSTEM_REQUIREMENTS.md: (1) tela de login para administradores e funcionários, autenticando contra a API FastAPI conforme o contrato OpenAPI (RNF03), com gerenciamento de sessão JWT incluindo expiração, refresh e logout (RNF09); o frontend não cria nem valida credenciais (RF01 é um script de backend, fora de escopo). (2) Controle de acesso RBAC no frontend: administrador tem acesso completo ao painel; funcionário acessa apenas a área de concessão de benefícios — guardas de rota por papel, navegação condicional no layout e redirecionamento pós-login por papel, deixando claro que a autorização final é responsabilidade do backend. (3) Fundações: shell de layout (barra de navegação, cabeçalho com estado da sessão, logout), cliente HTTP compartilhado com tratamento de 401/refresh e página inicial com placeholders para as seções do painel. O backend não está neste repositório; a spec deve definir o contrato esperado dos endpoints de autenticação a partir do Swagger da API.
```

---

### SPE-02 — Gerenciamento de Funcionários

**Requisitos:** RF04, RF05 · **Módulo:** Controle de Funcionários

**Objetivo:** CRUD administrativo de funcionários com geração de credenciais de acesso restrito.

**Inclui:**
- Cadastro de funcionário pelo administrador (RF04), com credenciais de acesso restrito geradas pelo backend (funcionário não pode criar pontos turísticos nem ver o dashboard — alinhamento com RF03).
- Edição de dados e revogação de acesso (RF05) — desativar/remover credencial.
- Uso de `DataTable` de `src/shared/components` para a listagem.

**Prompt:**

```text
/speckit.specify Gerenciamento de funcionários do painel PassaNorte, cobrindo RF04 e RF05 de docs/SYSTEM_REQUIREMENTS.md. Somente o administrador acessa esta área (RBAC já implementado pela SPE-01, deve ser reforçado aqui). Listagem em tabela (reusar o componente DataTable de src/shared/components), formulário de cadastro com geração de credenciais de acesso restrito pelo backend (credenciais exibidas uma única vez na UI, após criação), edição dos dados cadastrais e revogação de acesso (desativação da credencial). Deixar explícito na spec: o funcionário criado deve receber papel restrito sem acesso a cadastro de pontos turísticos e ao dashboard (RF03). Consumir os endpoints de funcionários conforme o contrato OpenAPI da API FastAPI, com estados de carregamento, erro e confirmações para ações destrutivas.
```

---

### SPE-03 — Gerenciamento de Pontos Turísticos

**Requisitos:** RF11–RF15 · **Módulo:** Gerenciamento de Pontos Turísticos

**Objetivo:** CRUD de pontos turísticos com categorias, cronograma de funcionamento, status e integração com Google Maps.

**Inclui:**
- Cadastro (RF11): nome, descrição, latitude/longitude e categoria; **seletor de localização em mapa** (Google Maps ou OSM — RNF18) com coordenadas e preview.
- Edição/remoção (RF12).
- Categorização (RF13): associação a uma ou mais categorias pré-definidas (lazer, cultura, gastronomia, natureza, arte, cinema, …).
- Cronograma de funcionamento (RF14): grade de dias da semana com horários de abertura/fechamento.
- Status (RF15): aberto ao público / temporariamente fechado / fechado permanentemente, visível na listagem e editável.

**Prompt:**

```text
/speckit.specify Gerenciamento de pontos turísticos do painel PassaNorte, cobrindo RF11, RF12, RF13, RF14 e RF15 de docs/SYSTEM_REQUIREMENTS.md (acesso administrador, reforçando RBAC da SPE-01). Cadastro com nome, descrição, categoria(s) múltiplas de uma lista pré-definida (lazer, cultura, gastronomia, natureza, arte, cinema etc.), coordenadas latitude/longitude selecionáveis em mapa integrado ao Google Maps ou OpenStreetMap (RNF18), cronograma de funcionamento por dia da semana com horários de abertura/fechamento e status (aberto ao público, temporariamente fechado, fechado permanentemente). Edição e remoção com validações e confirmação (RF12). Listagem com filtros por categoria e status. Consumir os endpoints de pontos turísticos conforme o contrato OpenAPI da API FastAPI. Estrutura em src/features/<modulo> seguindo os padrões da SPE-01 (cliente HTTP compartilhado, DataTable para listagem).
```

---

### SPE-04 — Gerenciamento de Eventos

**Requisitos:** RF16, RF17 · **Módulo:** Gerenciamento de Eventos

**Objetivo:** CRUD de eventos vinculados a pontos turísticos.

**Inclui:**
- Cadastro (RF16): evento associado a um ponto turístico, com data de ocorrência, descrição e preço do ingresso.
- Edição/remoção (RF17) e listagem de eventos por ponto turístico.
- Considerações: dados usados pelo app do turista e pelo chatbot (RF26, RF38) — a qualidade do cadastro influencia o backend.

**Prompt:**

```text
/speckit.specify Gerenciamento de eventos do painel PassaNorte, cobrindo RF16 e RF17 de docs/SYSTEM_REQUIREMENTS.md (acesso administrador). Cadastro de evento sempre associado a um ponto turístico existente (seletor alimentado pela feature de pontos, SPE-03), com data de ocorrência, descrição e preço do ingresso. Edição e remoção com confirmação (RF17). Listagem de eventos, opcionalmente filtrada por ponto turístico. Consumir os endpoints de eventos conforme o contrato OpenAPI da API FastAPI, seguindo os padrões de UI e estrutura estabelecidos nas SPE-01 e SPE-03.
```

---

### SPE-05 — Rotas Turísticas e Estoque de Brindes

**Requisitos:** RF18–RF20 · **Módulo:** Gamificação e Benefícios

**Objetivo:** administração de rotas (gamificação) e controle de estoque dos brindes vinculados.

**Inclui:**
- Cadastro (RF18): rota composta por lista ordenada de pontos turísticos + brinde associado à conclusão.
- Edição/remoção (RF19), incluindo reordenação dos pontos da rota.
- Estoque (RF20): cadastro e controle da quantidade disponível de cada brinde, com baixa automática no estoque efetuada pelo backend quando o funcionário concede o brinde (RF21 — a UI reflete o saldo).

**Prompt:**

```text
/speckit.specify Rotas turísticas e controle de estoque de brindes do painel PassaNorte, cobrindo RF18, RF19 e RF20 de docs/SYSTEM_REQUIREMENTS.md (acesso administrador). Cadastro de rota com lista ordenada de pontos turísticos (selecionados da funcionalidade de pontos, SPE-03 — permitir reordenar) e brinde associado à conclusão da rota (RF18). Edição e remoção de rotas (RF19). Cadastro de brindes e controle da quantidade disponível em estoque de cada brinde vinculado a uma rota (RF20), com indicação clara de saldo na UI; esclarecer na spec que a baixa em estoque é efetuada pelo backend quando o funcionário concede o brinde (RF21), o frontend apenas reflete o saldo. Consumir os endpoints de rotas e brindes conforme o contrato OpenAPI da API FastAPI.
```

---

### SPE-06 — Concessão de Brindes (Funcionário)

**Requisitos:** RF21 · **Módulo:** Gamificação e Benefícios (área do funcionário)

**Objetivo:** interface do funcionário para validar e conceder brindes a partir do código único gerado pelo turista (RF36, no app), com baixa automática no estoque.

**Inclui:**
- Escaneamento/leitura do código único (RF21): leitura via câmera (scanner de QR/código) **e** entrada manual como fallback — o formato do código vem do contrato da API.
- Validação: API retorna rota concluída, brinde correspondente e disponibilidade em estoque; conferência na tela antes de confirmar.
- Confirmação da concessão (backend faz baixa no estoque e invalida o código); feedback de sucesso, código já utilizado/inválido ou sem estoque.
- **Reforço de RBAC:** esta é a única área acessível ao funcionário (RF03).

**Prompt:**

```text
/speckit.specify Fluxo de concessão de brindes para funcionários do painel PassaNorte, cobrindo RF21 de docs/SYSTEM_REQUIREMENTS.md. Deve ser a área de acesso exclusivo do funcionário (RBAC da SPE-01 — o funcionário não vê dashboard nem gestão de pontos/eventos/rotas). Funcionalidade: leitura do código único de resgate gerado pelo turista ao concluir uma rota (RF36, no app do turista) — suporte a leitura por câmera (scanner de QR code/barra) e entrada manual do código como alternativa. Ao ler o código, a API valida e retorna rota concluída, brinde correspondente e disponibilidade em estoque; a UI apresenta esses dados para conferência antes da confirmação do funcionário. Após confirmar, o backend concede o brinde, aplica a baixa automática no estoque e invalida o código — tratar na UI os desfechos: sucesso, código inválido/já utilizado, rota não concluída e brinde sem estoque. Definir o contrato esperado dos endpoints de validação/concessão a partir do Swagger da API FastAPI.
```

---

### SPE-07 — Dashboard e Insights

**Requisitos:** RF06–RF10 · **Módulo:** Dashboard e Insights

**Objetivo:** visões analíticas para o administrador sobre dados de uso coletados pelo backend.

**Inclui:**
- **Mapa de calor** (RF06): concentração de visitas por região/ponto turístico sobre o mapa da cidade.
- **Contador de acessos** (RF07): total de acessos ao app Passaporte em períodos configuráveis (seletor de período).
- **Ranking de pontos** (RF08): mais visitados, segmentado por dia/mês/ano.
- **Distribuição por país de origem** (RF09) e **por interesses** (RF10): gráficos de proporção.
- Características técnicas: gráficos client-side com componentes de gráficos adequados a React (ex.: Recharts) e o mapa de calor sobre a mesma base de mapas de SPE-03 (Google Maps ou OSM). Períodos configuráveis via query params e estados de carregamento/vazio/erro em todos os cards.

**Prompt:**

```text
/speckit.specify Dashboard e insights do painel administrativo PassaNorte, cobrindo RF06, RF07, RF08, RF09 e RF10 de docs/SYSTEM_REQUIREMENTS.md (acesso exclusivo do administrador). Seções: (1) mapa de calor da cidade de Manaus com intensidade de visitas por região/ponto turístico, reusando a base de mapas (Google Maps ou OSM) estabelecida na SPE-03; (2) contador total de acessos ao aplicativo Passaporte (app do turista, dados vindos do backend) com períodos configuráveis pelo usuário; (3) ranking de pontos turísticos mais visitados com segmentação por dia, mês e ano; (4) distribuição proporcional de visitantes por país de origem; (5) distribuição proporcional por interesses cadastrados no perfil dos turistas. Implementar em React 19 com biblioteca de gráficos adequada, seletor global de período quando aplicável, e estados de carregamento, vazio e erro em cada card. Consumir os endpoints analíticos conforme o contrato OpenAPI da API FastAPI (aggregations/dashboard). Deixar registrado na spec que os dados brutos (visitações, acessos, perfis) são coletados pelo backend a partir do uso do app do turista.
```

---

## 5. Rastreabilidade

- Requisitos detalhados: [`docs/SYSTEM_REQUIREMENTS.md`](./SYSTEM_REQUIREMENTS.md).
- Princípios do projeto: [`docs/CONSTITUTION.md`](./CONSTITUTION.md) (v1.0.0, ratificada em 2026-10-30) — regra: `/speckit.analyze` é gate obrigatório antes de implementar, e a ordem da Seção 3 não é abandonada sem atualizar este documento antes.
- Modelos de artefatos: `.specify/templates/`.
- Atenção às diretrizes em `AGENTS.md`: ler os guias relevantes em `node_modules/next/dist/docs/` antes de escrever código Next.js — APIs e convenções podem divergir de versões antigas do framework.