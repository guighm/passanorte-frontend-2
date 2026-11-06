# Feature Specification: Fundações e Autenticação do Painel

**Feature Branch**: `001-panel-foundation-auth`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "Fundações e autenticação do painel administrativo PassaNorte. Deve cobrir RF02 e RF03 de docs/SYSTEM_REQUIREMENTS.md: (1) tela de login para administradores e funcionários, autenticando contra a API FastAPI com sessão JWT (expiração, refresh, logout); o frontend não cria nem valida credenciais. (2) RBAC no frontend: administrador tem acesso completo; funcionário acessa apenas a concessão de benefícios — guardas de rota por papel, navegação condicional e redirecionamento pós-login por papel; autorização final é do backend. (3) Fundações: shell de layout, cliente HTTP compartilhado com tratamento de 401/refresh e página inicial com placeholders. A spec define o contrato esperado dos endpoints de autenticação a partir do Swagger."

> **Nota de escopo (constituição):** conforme Princípio I da
> `../.specify/memory/constitution.md`, a seção "Contrato da API" abaixo é
> conteúdo obrigatório de spec do projeto PassaNorte e substitui a
> diretriz genérica de ausência de detalhes técnicos — é um contrato de
> negócio consumido pelo backend, não uma decisão de implementação do
> frontend. Demais requisitos e critérios de sucesso permanecem
> agnósticos de tecnologia.

## Clarifications

### Session 2026-10-30

- Q: Onde o painel deve guardar o token da sessão do operador? → A: Option A — cookie httpOnly gravado por handler de servidor; o JavaScript do navegador nunca vê o token (Princípio III, RNF08).
- Q: A API FastAPI com o Swagger já está rodando e acessível neste momento para validar o contrato da spec? → A: Option B — não; o contrato esperado desta spec é o baseline, com mocks temporários permitidos apenas enquanto marcados como tal (Princípio I).

### Session 2026-11-01

- Q: A API FastAPI já está rodando e acessível para o compare de contrato previsto na governança da constituição? → A: **Sim** — API ativa em `http://localhost:8000` (OpenAPI 3.1, `GET /openapi.json`). Esta resposta **supersedes** a opção B da sessão de 2026-10-30. O compare campo a campo foi executado e as divergências estão registradas em "Contrato da API" e aplicadas a `contracts/auth-api.md` (governança 5 da constituição). Pendências restantes: valores exatos de `role` (string livre no OpenAPI) e credenciais de seed reais — confirmar com um login de operador real antes de encerrar a SPE-01.

### Session 2026-11-06

- Q: Como resolver as pendências de `role` (valores exatos) e credenciais de seed, dado que a API já roda em `http://localhost:8000`? → A: Option A — realizar login real contra a API em execução: os valores retornados de `role` são registrados nesta spec e em `contracts/auth-api.md`; credenciais NUNCA ficam registradas em artefatos (só são usadas localmente no teste). **Resultado do teste (2026-11-06):** (1) o serviço em `http://localhost:8000` é o **"ADA Backend"** — sistema alheio ao PassaNorte; (2) a API real do Passanorte roda em `http://localhost:8010` (`GET /openapi.json`, título "Passanorte API", HTTPBearer): login real executado com credenciais de seed fornecidas pelo owner — **`role` = `"admin"` para administrador e `"employee"` para funcionário**, `expiresIn` = `3600` s (1 h), `/auth/me` devolve `{username, role}`, refresh devolve a mesma `SessionResponse` e **ROTACIONA** o token de renovação (string opaca, não-JWT, de uso único); 401 de credenciais usa o `ApiError` registrado. Pendência de `role` **RESOLVIDA**; credenciais permanecem fora de artefatos.
- Q: Quando um operador sem sessão (ou sem papel permitido) é bloqueado por um guarda de rota e enviado ao login, o painel deve devolvê-lo à rota que pretendia após o login, ou sempre levá-lo à área inicial do papel? → A: Option A — o guarda lembra o destino pretendido e o login devolve a ele, clampado ao papel: funcionário que tentou uma rota administrativa cai na sua área permitida, nunca na rota administrativa.
- Q: Um operador com sessão ativa que abre a página de login deve ser redirecionado à sua área inicial do papel, ou pode ver o formulário de novo e refazer o login? → A: Option A — com sessão ativa, `/login` redireciona imediatamente à área inicial do papel, sem mostrar o formulário; troca de operador exige logout explícito primeiro.
- Q: Ao acionar o botão de logout no cabeçalho, o painel deve exigir confirmação explícita antes de encerrar a sessão, ou encerra imediatamente no primeiro clique? → A: Option A — logout em um clique, sem confirmação: é reversível com um login novo e a re-autenticação é barata; confirmação extra adicionaria atrito diário sem proteção real (Princípio V lista ações destrutivas de dados, e logout não é uma delas).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Login do operador (Priority: P1)

Um operador (administrador ou funcionário) abre o painel, informa suas
credenciais geradas pelo backend e é autenticado. Após o sucesso, é
direcionado à área correspondente ao seu papel: o administrador às seções
gerenciais do painel; o funcionário à área de concessão de benefícios. Se as
credenciais forem inválidas, ele vê uma mensagem de erro clara e volta ao
formulário — nada de dados sensíveis é revelado.

**Why this priority**: sem autenticação nenhuma área do painel é utilizável;
é o pré-requisito declarado de todas as specs seguintes (SPE-02 a SPE-07).

**Independent Test**: submeter credenciais válidas e inválidas contra a API de
autenticação e observar a redireção por papel ou a mensagem de erro. Entrega
valor sozinho: acesso controlado ao sistema.

**Acceptance Scenarios**:

1. **Given** operador administrador com credenciais válidas, **When** envia o
   formulário de login, **Then** vê feedback de carregamento imediato e, ao
   concluir, é direcionado à página inicial do painel com a sessão ativa.
2. **Given** operador funcionário com credenciais válidas, **When** envia o
   formulário, **Then** é direcionado à área de concessão de benefícios,
   nunca às seções administrativas.
3. **Given** credenciais inválidas ou usuário inexistente, **When** envia o
   formulário, **Then** recebe mensagem de erro genérica e acionável ("credenciais
   inválidas"), os campos permanecem preenchidos e o processo não trava.
4. **Given** API de autenticação indisponível, **When** envia o formulário,
   **Then** recebe mensagem de erro explícita de falha de comunicação e pode
   tentar novamente; nenhum estado de "carregando" infinito.

---

### User Story 2 - Acesso às áreas por papel (RBAC de superfície) (Priority: P1)

O painel mostra a cada operador apenas o que seu papel permite, tanto na
navegação quanto nas rotas acessíveis diretamente por endereço.

**Why this priority**: o objetivo de negócio do RF03 é que o funcionário não
alcance seções administrativas; sem os guardas, o login do US1 liberaria
demais, violando o requisito.

**Independent Test**: com sessão de funcionário, tentar acessar por endereço
cada rota administrativa e cada rota permitida; observar bloqueio/redireção e
conteúdo da navegação.

**Acceptance Scenarios**:

1. **Given** funcionário autenticado, **When** tenta abrir diretamente uma
   rota administrativa (pelo endereço), **Then** é redirecionado à sua área
   permitida sem ver nenhum dado administrativo renderizado.
2. **Given** funcionário autenticado, **When** navega pelo menu do painel,
   **Then** só vê itens da área permitida (concessão de benefícios).
3. **Given** administrador autenticado, **When** navega pelo menu, **Then** vê
   todos os itens do painel (dashboard, pontos, eventos, rotas, funcionários).
4. **Given** operador sem sessão ativa que entra em qualquer rota protegida,
   **When** a rota avalia a sessão, **Then** é levado ao login; nenhuma tela
   protegida pisca na página (flash de conteúdo).

---

### User Story 3 - Ciclo da sessão (expiração, renovação e logout) (Priority: P2)

Durante o uso, a sessão se mantém válida de forma invisível ao operador até
seu fim legítimo: enquanto o token vigente expira dentro do período de uso, o
sistema o renova sem interromper o que o operador está fazendo; ao final do
período de renovabilidade, ou a pedido do operador (logout), a navegação
protegida volta ao login.

**Why this priority**: garante que o painel não derrube o operador à toa
(usabilidade) nem mantenha sessão viva para sempre (segurança, RNF09); depende
de US1, mas não de US2.

**Independent Test**: operar com token a ponto de expirar em segundos;
observar renovação transparente nas chamadas seguintes; após expirar a
janela de renovação (ou clicar em logout), confirmar voltar ao login na
próxima navegação/ação.

**Acceptance Scenarios**:

1. **Given** operador autenticado com token a expirar durante o uso, **When**
   uma chamada de dados retorna resposta de sessão expirada (401), **Then** o
   sistema renova a sessão de forma transparente e a requisição original é
   concluída; o operador não vê falha nem tela de login.
2. **Given** renovação indisponível (token de renovação também expirado ou
   recusado pelo backend), **When** qualquer chamada de dados falha por
   sessão, **Then** o operador é levado ao login com aviso de sessão
   encerrada e nenhuma chamada de dados entra em loop infinito de tentativas.
3. **Given** operador autenticado, **When** aciona o logout no cabeçalho
   (um clique, sem confirmação), **Then** a sessão é encerrada junto ao
   backend (confirmado no contrato) e o operador volta ao login; voltar
   atrás no histórico não recarrega dados protegidos da sessão anterior.
4. **Given** múltiplas requisições simultâneas encontram sessão expirada,
   **When** todas precisam de renovação, **Then** apenas uma renovação é
   feita e todas as chamadas continuam com o mesmo novo token.

---

### User Story 4 - Shell de layout e página inicial (Priority: P2)

Com a sessão ativa, o operador vê a moldura do painel: navegação
lateral/topbar condicional ao papel, cabeçalho com identificação da sessão
(usuário e papel) e ação de logout. A página inicial apresenta placeholders
visíveis das seções do painel (dashboard, pontos turísticos, eventos, rotas e
benefícios, funcionários), sinalizando o que virá nas specs seguintes, com
estados de carregamento e erro quando consultam a API.

**Why this priority**: é o esqueleto reutilizado por todas as features
seguintes, mas sozinho não substitui login nem guardas; é o segundo bloco
de fundação.

**Independent Test**: autenticar cada papel e observar a moldura correta e os
placeholders; simular API indisponível para ver estado de erro nos
placeholders que consultam dados.

**Acceptance Scenarios**:

1. **Given** administrador autenticado, **When** acessa a página inicial,
   **Then** vê a moldura completa (navegação com todos os itens, cabeçalho
   com seu nome e papel, botão de logout) e placeholders das seções do painel.
2. **Given** funcionário autenticado, **When** acessa a área inicial dele,
   **Then** vê a moldura apenas com os itens permitidos e o placeholder da
   área de concessão de benefícios.
3. **Given** a fundação concluída, **Then** os placeholders das seções são
   estáticos (nenhum endpoint de seção existe no contrato) e os componentes
   de estado de carregamento, vazio e erro estão disponíveis e distintos
   para as features seguintes consumirem (Princípio V da constituição).

---

### Edge Cases

- Credenciais válidas, mas sem papel reconhecível na resposta (contrato
  divergente): deve tratar como falha de sessão (erro explícito), nunca
  liberar acesso por omissão.
- Sessão expirada enquanto o operador preenche um formulário longo: a
  renovação transparente cobre; se indisponível, o operador deve ser
  informado de que a ação não será concluída, sem perda silenciosa.
- Operador abre múltiplas abas do painel: renovação em uma aba não deve
  inválidar a outra (mesma sessão é reutilizada; sem estado de sessão
  duplicado por aba).
- Token de renovação inválido durante a troca: tratar como sessão expirada
  (volta ao login), sem mensagens técnicas internas.
- Falha intermitente de rede durante o login: mensagem de erro de
  comunicação, com nova tentativa; não deve sugerir que o operador errou a
  senha.
- Resposta do backend em formato divergente do contrato registrado nesta
  spec: trata como falha explícita e registra a divergência (defeito, nunca
  tolerância silenciosa — Princípio I).

## Requirements *(mandatory)*

### Functional Requirements

**Autenticação (RF02)**

- **FR-001**: o painel MUST apresentar uma tela de login com campos de
  usuário e senha e ação de envio, a partir da qual todas as rotas protegidas
  ficam inacessíveis. Com sessão ativa, a página de login MUST redirecionar
  imediatamente à área inicial do papel (sem exibir o formulário): troca de
  operador exige logout explícito primeiro.
- **FR-002**: o painel MUST enviar as credenciais exclusivamente à API de
  autenticação (contrato em "Contrato da API") e NÃO DEVE criar,
  validar, comparar ou armazenar credenciais localmente (RF01 é executado no
  backend e está fora de escopo do painel).
- **FR-003**: o painel MUST exibir os três estados de interação com a API na
  tela de login (carregamento, erro, sucesso) de forma distinta e visível
  (Princípio V).
- **FR-004**: após login bem-sucedido, o painel MUST direcionar o operador à
  área inicial correspondente ao papel retornado pela API.

**Sessão (RNF09)**

- **FR-005**: o painel MUST manter a sessão persistente entre navegações e
  recargas do painel durante a validade do token, armazenada EXCLUSIVAMENTE
  em cookie httpOnly gravado por handler de servidor (Princípio III, RNF08):
  o JavaScript do navegador NÃO DEVE ler o token em momento algum (nada de
  `localStorage`/`sessionStorage` para o token).
- **FR-006**: o painel MUST renovar a sessão automaticamente pelo endpoint de
  renovação quando o token vigente expirar, de forma transparente ao
  operador, com o comportamento de concorrência definido em
  "Contrato da API" (uma única troca por ciclo de expiração).
- **FR-007**: quando a renovação falhar (token de renovação inválido, expirado
  ou recusado), o painel MUST encerrar a sessão local e direcionar ao login
  com aviso de sessão encerrada; NÃO DEVE retratar renovação indefinidamente.
- **FR-008**: o painel MUST oferecer logout explícito em um clique, sem
  diálogo de confirmação (ação reversível com novo login; Princípio V
  aplica-se a ações destrutivas de dados, não ao logout), que encerra a
  sessão local e a sessão no backend (contrato: `POST /api/v1/auth/logout`,
  204).
- **FR-009**: qualquer chamada à API com resposta de sessão expirada (401)
  NÃO DEVE ser apresentada ao operador como erro da ação: DEVE disparar o
  fluxo de renovação (FR-006/FR-007).

**RBAC no frontend (RF03)**

- **FR-010**: o painel MUST bloquear, por guarda de rota, o acesso a rotas
  administrativas quando o operador autenticado for funcionário,
  redirecionando-o à área permitida, sem renderizar a página bloqueada.
- **FR-011**: o painel MUST bloquear acesso a qualquer rota protegida para
  operador sem sessão, levando-o ao login. O guarda lembra o destino
  pretendido e, após login bem-sucedido, devolve o operador a ele, clampado
  ao papel: funcionário que tentou uma rota administrativa é devolvido à
  sua área permitida, nunca à rota administrativa tentada.
- **FR-012**: o painel MUST condicionar os itens de navegação da moldura ao
  papel do operador: administrador vê todos os itens; funcionário vê apenas o
  item de concessão de benefícios.
- **FR-013**: o painel NÃO DEVE fazer decisão final de autorização nem
  fundamentar exibição de dados administrativos apenas em papel declarado
  no cliente: a decisão é sempre do backend (Princípio II).
- **FR-014**: o papel retornado pela API governa NO PAINEL APENAS navegação
  e guardas de rota (RBAC de superfície); todo conteúdo administrativo
  renderizado provém de requisições à API autorizadas pelo backend (403 ⇒
  estado de erro da ação).

**Fundações**

- **FR-015**: o painel MUST disponibilizar, para toda feature posterior, um
  cliente HTTP compartilhado que trate de forma uniforme: repasse da sessão
  do painel às chamadas (o token de autorização é anexado apenas pelo lado
  do servidor, a partir do cookie httpOnly — FR-005), resposta de sessão
  expirada (renovação, FR-006/007), divergência de
  contrato (erro explícito) e estados de carregamento/erro às telas.
- **FR-016**: o painel MUST estruturar o shell de layout (navegação
  condicional ao papel, cabeçalho com identificação da sessão e logout) como
  parte transversal reutilizável por todas as features seguintes
  (Princípio IV).
- **FR-017**: a página inicial do painel MUST apresentar placeholders das
  seções previstas (dashboard e insights, pontos turísticos, eventos, rotas e
  benefícios, funcionários, concessão de benefícios), usando os componentes
  de estado (Princípio V); NESTA fundação os placeholders são estáticos
  (nenhum endpoint de seção existe no contrato — SPE-02..07), e os estados
  loading/vazio/erro são exercidos de fato quando cada feature integrar sua
  API real — nunca com endpoints inventados no frontend (Princípio I).
- **FR-018**: o painel NÃO DEVE fixar dados da cidade (nome, textos,
  categorias) na interface: a página inicial e a moldura devem funcionar
  apenas com dados trazidos da API e identificação da sessão (Princípio IV,
  RNF06).
- **FR-019**: o painel MUST funcionar por teclado e com rótulos acessíveis no
  login, na navegação e no logout (constituição, Constraint 5).

### Key Entities *(include if feature involves data)*

- **Operador (sessão)**: administrador ou funcionário identificado pelo
  backend no momento do login; atributos relevantes ao painel: identificação
  (nome/exibição), papel. O painel não conhece hash de senha nem dados
  adicionais de perfil.
- **Sessão**: par de vigência (token vigente + token de renovação) e momento
  de validade, obtida no login e mantida pelo painel apenas pelo tempo do
  uso; sua única finalidade é autenticar chamadas à API.
- **Papel**: valor de autorização superficial administrado no backend
  ("administrador" com acesso total; "funcionário" restrito à concessão de
  benefícios). Valores na API (confirmados por login real, 2026-11-06):
  `"admin"` e `"employee"` — mapeados explicitamente e um a um no painel;
  qualquer outro valor ⇒ falha de sessão. No painel, controla apenas
  navegação e guardas de rota.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: um operador com credenciais válidas conclui o login e chega à
  sua área inicial em menos de 5 segundos em rede local, contado do envio do
  formulário.
- **SC-002**: 100% das tentativas de acesso por endereço a uma rota não
  permitida para o papel resultam no operador sem ver qualquer elemento da
  página bloqueada (verificado por inspeção dos cenários de US2).
- **SC-003**: em sessão ativa, chamadas de dados cujo token expira no meio do
  uso são renovadas e concluídas com sucesso sem interrupção visível ao
  operador em pelo menos 95% dos casos de uso testados (US3, cenário 1).
- **SC-004**: após logout (ou fim da janela de renovação), nenhuma chamada de
  dados subsequente é autorizada pelo token anterior (verificação por
  inspeção das requisições emitidas).
- **SC-005**: funcionário nunca vê, em navegação normal ou por endereço,
  qualquer seção administrativa (dashboard, gestão de pontos, eventos, rotas,
  funcionários) — confirmação do RF03.
- **SC-006**: toda interação da tela de login e da página inicial apresenta
  estado de carregamento, vazio ou erro visível quando aplicável; nenhuma
  requisição em curso deixa a tela "travada" sem indicação (US4, cenário 3).

## Assumptions

- A API FastAPI aceita autenticação por cabeçalho de autorização token a
  token (padrão JWT bearer); o painel repõe o token da sessão httpOnly ao
  repassar chamadas server-side.
- **Supersedes premissas de 2026-10-30 e 2026-11-01:** a API real do
  Passanorte ("Passanorte API", HTTPBearer) está acessível em
  `http://localhost:8010` — NÃO em `http://localhost:8000`, onde atende o
  "ADA Backend" (sistema alheio) na data de 2026-11-06. O compare campo a
  campo re-executado nesta data confirmou o contrato registrado; login real
  (owner) resolveu `role` e as credenciais de seed. Os endpoints reais
  existem — portanto os mocks temporários (`src/features/auth/api/mock.ts`,
  marcados MOCK (temporary), ativos apenas quando `API_BASE_URL` não está
  configurada) DEVEM ser removidos antes do encerramento da SPE-01 (Princípio
  I): nenhuma task nova pode depender deles.
- O papel retornado pela API é confiável para navegação (RBAC de superfície);
  a autorização definitiva do backend não depende dela.
- Os dois papéis do painel são exatamente dois: "administrador" (acesso
  total) e "funcionário" (apenas concessão de benefícios); nenhum terceiro
  papel é suportado nesta spec (RF03).
- A identificação do operador no cabeçalho (nome, papel) provém do retorno
  do login ou de endpoint de perfil da sessão; o painel não deduz o papel
  por heurística local.
- Nenhuma tela administrativa real é implementada nesta spec (specs
  seguintes): a página inicial é de placeholders.
- Ferramentas para scanner de QR/código e mapa não são desta spec (SPE-06,
  SPE-03).

## Contrato da API *(re-confirmado contra o Swagger real em 2026-11-06 — Princípio I da constituição)*

> Compare campo a campo re-executado em 2026-11-06 contra o OpenAPI real da
> API "Passanorte API" ativa em `http://localhost:8010` (`GET /openapi.json`)
> — supersedes o compare de 2026-11-01 atribuído a `localhost:8000`: o
> serviço lá em execução é o "ADA Backend", sistema alheio ao PassaNorte.
> Divergências do baseline estão listadas ao fim da seção; `contracts/auth-api.md`
> foi atualizado em conjunto (governança 5 da constituição). As pendências
> de 2026-11-01 foram **resolvidas** nesta sessão: valores exatos de `role`
> confirmados por login real (`"admin"`, `"employee"`) — credenciais de seed
> NÃO são registradas em artefatos.
>
> **Sessão local (decisão da clarificação 2026-10-30, mantida):** o par de
> tokens devolvido pelo login NÃO é exposto ao JavaScript do navegador —
> um handler do lado do servidor do painel o troca por um cookie httpOnly
> local ao painel; as chamadas à API FastAPI anexam o token de autorização
> a partir dessa sessão do lado do servidor. O refresh segue o
> mesmo caminho (renovação server-side); 401/renovação continuam sendo
> disparados pelo cliente HTTP compartilhado (FR-006/FR-009/FR-015).

**POST `/api/v1/auth/login`** — autentica operador e devolve a sessão.

- Request: `{ "username": "<string, 1–100>", "password": "<string, 1–200>" }`
  (ambos obrigatórios)
- 200 Response: `{ "accessToken": "<JWT>", "refreshToken": "<string opaca, não-JWT>",
  "tokenType": "bearer", "expiresIn": 3600, "role": <string> }` — `expiresIn`
  real observado: **3600 s (1 h)**; o token de renovação é string opaca de
  uso único (**rotacionado** em toda renovação: a resposta de refresh traz
  um novo `refreshToken`)
- 401: credenciais inválidas → payload unificado
  `{ "errorCode": "authentication_failed", "message": "invalid credentials",
  "details": [] }` (confirmado em login real — formato `ApiError` do backend,
  NÃO o `{ "detail": }` do FastAPI)
- 422: corpo inválido → `HTTPValidationError` padrão do FastAPI (exceção
  documentada ao payload unificado de erro)
- 503/5xx: serviço indisponível
- Papel/identidade: **não há objeto `user`** — `role` vem no nível raiz, e
  `id`/`name` não existem na resposta. A identificação do operador na moldura
  passa a ser `username` + `role` (via login ou `GET .../auth/me`).
- Valores de `role` (confirmados por login real, 2026-11-06):
  `"admin"` (administrador) e `"employee"` (funcionário). Qualquer outro
  valor ⇒ papel não reconhecível ⇒ falha de sessão (edge case — nunca
  liberar por omissão); mapeamento NO PAINEL é explícito: `admin` →
  administrador, `employee` → funcionário.

**POST `/api/v1/auth/refresh`** — troca token de renovação por nova sessão.

- Request: `{ "refreshToken": "<string opaca>" }` (corpo; **não** há
  variante por cookie httpOnly)
- 200: mesmo formato da resposta de login (inclui `role` renovado) — e
  **rotaciona** o token de renovação (novo `refreshToken` na resposta; o
  anterior deixa de valer; token de renovação é de **uso único**)
- 401/422: token de renovação inválido/expirado → encerra sessão (FR-007)
- Painel garante no máximo uma renovação em curso por ciclo de expiração
  (US3, cenário 4)

**POST `/api/v1/auth/logout`** — encerra a sessão no backend (confirmado —
não é mais "se previsto").

- Sem corpo de requisição; autenticação via
  `Authorization: Bearer <accessToken>` (security scheme **`HTTPBearer`** do
  OpenAPI)
- 204 sem corpo; 401 com sessão já encerrada → tratar como logout concluído

**GET `/api/v1/auth/me`** (confirmado — não é mais opcional) — identidade da
sessão vigente.

- Autenticação via `Authorization: Bearer`; sem corpo de requisição
- 200 → `{ "username": "<string>", "role": <string> }` — **não** há `id`
  nem `name`
- Usado para restaurar identificação/papel da moldura após recarga de página
  (FR-016); 401 → fluxo de renovação (FR-006/FR-007)

**Health (fora do escopo funcional):** `GET /health` →
`{ "status": "ok", "database": "ok" }`. O painel NÃO DEVE substituir os
estados de carregamento/erro por sondagens de health (Princípio V).

**Autorização para o resto da API (efeito do RBAC)**

- Security scheme global **`HTTPBearer`**: toda rota de negócio exige
  `Authorization: Bearer <accessToken>` anexado apenas server-side
  (`src/shared/lib/http.ts` / túnel BFF — Constraint 5 da constituição).
- Toda rota protegida que o funcionário não pode usar responde 403 quando
  chamada com sessão de funcionário. O painel trata 403 como estado de erro
  da ação (dados/área não autorizada), nunca como exceção silenciosa.

**Divergências do baseline (compare campo a campo, 2026-11-01)**

1. **Prefixo `/api/v1/`** em todas as rotas de autenticação — o baseline
   previa `/auth/...` sem prefixo de versão.
2. **Campos de sessão em camelCase** (`accessToken`, `refreshToken`,
   `tokenType`, `expiresIn`, `role`) — o baseline previa snake_case
   (`access_token`, `refresh_token`, `expires_in`). Convenção de API do
   backend (`camelcase-json`).
3. **Sem objeto `user`** no login/refresh e **sem `id`/`name`** em qualquer
   resposta de identidade: papel no nível raiz; identificação exibível é
   `username` + `role` (via login ou `/auth/me`).
4. **Erros unificados** `ApiError { errorCode, message, details }` (ex.:
   `errorCode: "authentication_failed"`) — o baseline previa
   `{ "detail": "..." }`. Exceção documentada: 422 usa
   `HTTPValidationError` padrão do FastAPI.
5. **`GET /api/v1/auth/me` existe** (baseline: opcional).
6. **`POST /api/v1/auth/logout` existe** (baseline: "se previsto" —
   logout apenas local se ausente).
7. **Refresh por corpo JSON `refreshToken`** — a alternativa "por cookie
   httpOnly, a confirmar" do baseline foi descartada pelo Swagger real.

**Pendências pós-compare: RESOLVIDAS (2026-11-06)**

- ~~Valores exatos de `role`~~ — **resolvido por login real** contra a
  API "Passanorte API" (`http://localhost:8010`): `"admin"` /
  `"employee"` (registrado acima).
- ~~Credenciais de seed reais~~ — **resolvido**: login real confirmado com
  credenciais de seed fornecidas pelo owner (usadas apenas no teste;
  credenciais NUNCA são registradas em artefatos). As fixtures do modo mock
  (`admin`/`admin`, `funcionario`/`funcionario`) respondem 401 na API real
  e DEVEM ser removidas junto com os mocks antes do encerramento da SPE-01.
