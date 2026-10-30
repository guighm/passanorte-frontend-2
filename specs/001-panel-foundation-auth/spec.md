# Feature Specification: Fundações e Autenticação do Painel

**Feature Branch**: `001-panel-foundation-auth`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "Fundações e autenticação do painel administrativo PassaNorte. Deve cobrir RF02 e RF03 de docs/SYSTEM_REQUIREMENTS.md: (1) tela de login para administradores e funcionários, autenticando contra a API FastAPI com sessão JWT (expiração, refresh, logout); o frontend não cria nem valida credenciais. (2) RBAC no frontend: administrador tem acesso completo; funcionário acessa apenas a concessão de benefícios — guardas de rota por papel, navegação condicional e redirecionamento pós-login por papel; autorização final é do backend. (3) Fundações: shell de layout, cliente HTTP compartilhado com tratamento de 401/refresh e página inicial com placeholders. A spec define o contrato esperado dos endpoints de autenticação a partir do Swagger."

> **Nota de escopo (constituição):** conforme Princípio I da
> `../.specify/memory/constitution.md`, a seção "Contrato Esperado da API"
> abaixo é conteúdo obrigatório de spec do projeto PassaNorte e substitui a
> diretriz genérica de ausência de detalhes técnicos — é um contrato de
> negócio consumido pelo backend, não uma decisão de implementação do
> frontend. Demais requisitos e critérios de sucesso permanecem
> agnósticos de tecnologia.

## Clarifications

### Session 2026-10-30

- Q: Onde o painel deve guardar o token da sessão do operador? → A: Option A — cookie httpOnly gravado por handler de servidor; o JavaScript do navegador nunca vê o token (Princípio III, RNF08).
- Q: A API FastAPI com o Swagger já está rodando e acessível neste momento para validar o contrato da spec? → A: Option B — não; o contrato esperado desta spec é o baseline, com mocks temporários permitidos apenas enquanto marcados como tal (Princípio I).

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
3. **Given** operador autenticado, **When** aciona o logout no cabeçalho,
   **Then** a sessão é encerrada junto ao backend (quando o contrato o
   previr) e o operador volta ao login; voltar atrás no histórico não
   recarrega dados protegidos da sessão anterior.
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
  ficam inacessíveis.
- **FR-002**: o painel MUST enviar as credenciais exclusivamente à API de
  autenticação (contrato em "Contrato Esperado da API") e NÃO DEVE criar,
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
  "Contrato Esperado da API" (uma única troca por ciclo de expiração).
- **FR-007**: quando a renovação falhar (token de renovação inválido, expirado
  ou recusado), o painel MUST encerrar a sessão local e direcionar ao login
  com aviso de sessão encerrada; NÃO DEVE retratar renovação indefinidamente.
- **FR-008**: o painel MUST oferecer logout explícito, que encerra a sessão
  local e, se previsto no contrato, a sessão no backend.
- **FR-009**: qualquer chamada à API com resposta de sessão expirada (401)
  NÃO DEVE ser apresentada ao operador como erro da ação: DEVE disparar o
  fluxo de renovação (FR-006/FR-007).

**RBAC no frontend (RF03)**

- **FR-010**: o painel MUST bloquear, por guarda de rota, o acesso a rotas
  administrativas quando o operador autenticado for funcionário,
  redirecionando-o à área permitida, sem renderizar a página bloqueada.
- **FR-011**: o painel MUST bloquear acesso a qualquer rota protegida para
  operador sem sessão, levando-o ao login.
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
  benefícios). No painel, controla apenas navegação e guardas de rota.

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
- O backend FastAPI ainda não está acessível (confirmado em 2026-10-30):
  enquanto o Swagger real não existir, a autenticação opera com mocks
  temporários, cada um marcado como tal nos artefatos Spec Kit e removido
  assim que o endpoint real for confirmado (Princípio I). A conferência do
  contrato contra o Swagger real NÃO PODE ficar indefinidamente pendente —
  é pré-condição para dar a SPE-01 por concluída.
- O backend expõe endpoints de autenticação compatíveis com o contrato
  registrado em "Contrato Esperado da API"; quando o Swagger real estiver
  disponível, o contrato desta spec é conferido contra ele e ajustado
  ANTES do `/speckit-plan` finalizar (Princípio I).
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

## Contrato Esperado da API *(conteúdo obrigatório — Princípio I da constituição)*

> Este contrato é o esperado a partir dos requisitos (RF02, RF03, RNF09) e
> das convenções da API FastAPI/Swagger do projeto. **Baseline confirmado na
> clarificação de 2026-10-30:** o backend ainda não está acessível — este
> contrato é o baseline do projeto. Quando o Swagger real ficar disponível,
> o compare de campo a campo DEVE ser registrado (divergências editam esta
> spec ANTES das tasks correspondentes). Até lá, mocks temporários são
> permitidos apenas enquanto marcados como tal nos artefatos (Princípio I).
>
> **Sessão local (decisão da clarificação 2026-10-30):** o par de tokens
> devolvido pelo `/auth/login` NÃO é exposto ao JavaScript do navegador —
> um handler do lado do servidor do painel o troca por um cookie httpOnly
> local ao painel; as chamadas à API FastAPI anexam o token de autorização
> a partir dessa sessão do lado do servidor. O `/auth/refresh` segue o
> mesmo caminho (renovação server-side); 401/renovação continuam sendo
> disparados pelo cliente HTTP compartilhado (FR-006/FR-009/FR-015).

**POST `/auth/login`** — autentica operador e devolve a sessão.

- Request: `{ "username": "<identificação do operador>", "password": "<senha>" }`
- 200 Response: `{ "access_token": "<JWT>", "refresh_token": "<JWT>",
  "token_type": "bearer", "expires_in": <segundos>, "user": { "id",
  "username", "name", "role": "administrador" | "funcionário" } }`
- 401: credenciais inválidas (`{ "detail": "..." }`)
- 503/5xx: serviço indisponível
- O painel não deve assumir nome exato do campo de papel: será confirmado no
  Swagger; divergências alteram esta spec antes do plan.

**POST `/auth/refresh`** — troca token de renovação por nova sessão.

- Request: `{ "refresh_token": "<JWT de renovação>" }` (ou autenticação por
  cookie httpOnly, a confirmar no Swagger)
- 200: mesmo formato da resposta de login
- 401: token de renovação inválido/expirado → encerra sessão (FR-007)

**POST `/auth/logout`** — encerra a sessão no backend, se previsto.

- Request: sessão vigente (token); Response 204
- O painel trata inexistência deste endpoint como: logout apenas local
  (registro de divergência anotado nos artefatos da spec).

**GET `/auth/me`** *(opcional, a confirmar no Swagger)* — dados do operador
da sessão vigente (id, username, name, role); usado para renovar moldura
após recarga de página.

**Autorização para o resto da API (efeito do RBAC)**

- Toda rota protegida que o funcionário não pode usar responde 403 quando
  chamada com sessão de funcionário. O painel trata 403 como estado de erro
  da ação (dados/área não autorizada), nunca como exceção silenciosa.