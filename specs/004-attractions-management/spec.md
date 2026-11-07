# Feature Specification: Gerenciamento de Pontos Turísticos (SPE-03)

**Feature Branch**: `004-attractions-management`

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "Gerenciamento de pontos turísticos do painel PassaNorte, cobrindo RF11, RF12, RF13, RF14 e RF15 de docs/SYSTEM_REQUIREMENTS.md (acesso administrador, reforçando RBAC da SPE-01). Cadastro com nome, descrição, categoria(s) múltiplas de uma lista pré-definida (lazer, cultura, gastronomia, natureza, arte, cinema etc.), coordenadas latitude/longitude selecionáveis em mapa integrado ao Google Maps ou OpenStreetMap (RNF18), cronograma de funcionamento por dia da semana com horários de abertura/fechamento e status (aberto ao público, temporariamente fechado, fechado permanentemente). Edição e remoção com validações e confirmação (RF12). Listagem com filtros por categoria e status. Consumir os endpoints de pontos turísticos conforme o contrato OpenAPI da API FastAPI. Estrutura em src/features/<modulo> seguindo os padrões da SPE-01 (cliente HTTP compartilhado, DataTable para listagem)."

> **Nota de escopo (constituição):** conforme Princípio I da
> `../../.specify/memory/constitution.md`, a seção "Contrato da API" abaixo é
> conteúdo obrigatório de spec do projeto PassaNorte e substitui a diretriz
> genérica de ausência de detalhes técnicos; a referência ao integração de
> mapa Google Maps segue a Constraint 3 da constituição (definida uma única
> vez nesta spec, reusada pela SPE-07), e `DataTable`/componentes de estado
> > (mapa OpenStreetMap segue a Constraint 3 — emenda 2.0.0 de 2026-11-06;
> definida uma única vez nesta spec, reusada pela SPE-07), e `DataTable`/componentes de estado
> de `src/shared/components` são reuso sancionado pelo Princípio IV. Demais
> requisitos e critérios de sucesso permanecem agnósticos de tecnologia.

## Clarifications

### Session 2026-11-06

- A API FastAPI real ("Passanorte API") está acessível em
  `http://localhost:8010` (estabelecido pela SPE-01 em 2026-11-06) e o
  OpenAPI (`GET /openapi.json`) **já contém os endpoints de pontos
  turísticos** (`/api/v1/tourist-spots`): listagem paginada, cadastro,
  detalhe, edição parcial e **remoção física** (`DELETE` → 204). O contrato
  registrado em "Contrato da API" foi extraído diretamente do OpenAPI real
  nesta data. Pendências pontuais (catálogo de categorias, vocabulário de
  dias da semana, `errorCode`s de erro) estão ao fim da seção, com
  resolução definida por probe — mesmo padrão da SPE-02 (T005).
- Q: Como o seletor de categorias do cadastro/edição deve obter a lista
  pré-definida, visto que a API em execução não expõe um catálogo dedicado
  de categorias de pontos turísticos (a única lista de categorias
  disponível é a de interesses do turista)? → A: Option A — usar o catálogo
  de **interesses do turista** (`GET /api/v1/tourists/interest-categories`)
  como **fonte do seletor** desde já, com **probe obrigatório** na
  implementação (antes das tasks de formulário) confirmando se as chaves de
  categoria dos spots correspondem às do catálogo (e aos rótulos em
  português); se divergirem, registra-se a divergência e alinha-se com o
  backend ANTES da UI — nada hard-coded nem no interim.
- Q: O raio de tolerância para validação de presença no ponto
  (`toleranceRadiusM` do contrato, usado pela verificação de GPS do app do
  turista) deve aparecer no formulário de cadastro/edição, ou fica fora da
  interface nesta fase? → A: Option A — campo opcional numérico em metros
  no formulário (cadastro e edição), com orientação de uso: é dado do
  contrato e o RF32 do produto (geofencing por ponto) depende dele.
- Q: Ao abrir o mapa para escolher a posição de um ponto NOVO (sem
  localização prévia), em que região o mapa deve estar centralizado
  inicialmente? → A: Option B — centrar na localização de um ponto já
  cadastrado (o primeiro da listagem vigente) quando houver; só quando o
  catálogo ainda estiver vazio cair na visão padrão da própria biblioteca
  de mapa. Nenhum centro é fixado no código (RNF06): o mapa "aprende" a
  região a partir dos dados da API; a coordenada exata é sempre definida
  pelo administrador (marcador ou digitação).
- Q: - Q: O formulário de cadastro/edição de ponto deve ser dividido em etapas
  (wizard/slides) em vez de um formulário único longo? → A: Option A (decisão
  do owner, 2026-11-06) — **sim: wizard de 4 etapas** no `SpotFormDialog`
  (cadastro E edição, mesmo componente): 1) Identificação (nome/descrição);
  2) Categorias (≥1, catálogo); 3) Localização (mapa + lat/lng + raio de
  tolerância); 4) Funcionamento (cronograma + status). Validação POR ETAPA
  antes de avançar (Zod parcial); "Voltar"/"Continuar"; indicador de etapa
  acessível (aria); erros de backend aparecem na etapa corrente; nada muda
  no contrato (submit único no fim).
O Google exige billing habilitada (pré-pago de R$200 na billing
  brasileira) para carregar o mapa — como seguir, dado o RNF15 (caráter
  acadêmico, sem orçamento)? → A: **Manter o fallback manual agora
  (custo zero)**: o mapa permanece integrado (com estado de erro distinto
  e acionável quando billing/auth falham) e a feature funciona 100% com
  digitação manual de coordenadas (FR-009 dá os dois caminhos como
  equivalentes). Não há troca para OSM nesta fase (Constraint 3 exige
  emenda formal). A DECISÃO DEFINITIVA do mapa ficou para antes da SPE-07 e foi TOMADA no mesmo dia:
  **emenda 2.0.0 da constituição — migração para OpenStreetMap via
  `react-leaflet`/`leaflet`** (zero custo, sem chave/billing, RNF15;
  `@vis.gl/react-google-maps` desinstalada). O SpotMapPicker migrou com
  interface de props PRESERVADA — SPE-07 (heatmap RF06) já nasce OSM.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Listagem com filtros e paginação (Priority: P1)

O administrador abre a área de pontos turísticos e vê a tabela dos pontos
cadastrados (nome, categorias, status, coordenadas, datas) com o total e a
paginação da API. Pode filtrar por **status** (aberto ao público /
temporariamente fechado / fechado permanentemente) e por **categoria**,
recarregando a fonte de dados conforme o filtro aplicado. Estados de
carregamento, vazio e erro são distintos e acionáveis.

**Why this priority**: a listagem é a base da área (cadastro/edição/remoção
são ancorados nela) e entrega valor sozinho — visibilidade do catálogo da
cidade.

**Independent Test**: autenticar como administrador, abrir `/admin/attractions`,
aplicar cada filtro e cada página, e forçar os três estados — cenários
1.1–1.5 do quickstart.

**Acceptance Scenarios**:

1. **Given** administrador autenticado com pontos cadastrados, **When**
   abre a área, **Then** vê a tabela com todos os campos retornados, o
   total e os controles de paginação (avançar/voltar página) refletindo o
   que a API retorna.
2. **Given** filtro por status selecionado, **When** aplicado, **Then** a
   consulta recarrega apenas pontos daquele status (filtro transmitido à
   API) e o total/controles refletem o resultado filtrado.
3. **Given** filtro por categoria selecionado, **When** aplicado, **Then**
   apenas pontos com aquela categoria são exibidos (comportamento de filtro
   conforme contrato vigente; ver Pendências — fonte do catálogo e suporte
   server-side).
4. **Given** nenhum ponto no filtro aplicado, **When** a consulta conclui,
   **Then** o estado vazio é acionável (cta para o cadastro e sugestão de
   limpar o filtro).
5. **Given** a consulta falha (API indisponível/payload divergente),
   **When** a resposta chega, **Then** o estado de erro é explícito e
   acionável (nova tentativa), sem tela travada nem dado silenciosamente
   aceito.

---

### User Story 2 - Cadastro com localização no mapa, categorias e cronograma (Priority: P1)

O administrador aciona o cadastro e informa: nome e descrição; **uma ou
mais categorias** escolhidas da lista pré-definida (catálogo da API);
**coordenadas de localização escolhidas em mapa integrado** (marcador na
posição; a escolha preenche latitude/longitude — e é sempre possível
digitar as coordenadas manualmente); **cronograma de funcionamento por dia
da semana** com horários de abertura e fechamento (ao menos um dia); e o
status (padrão: aberto ao público). Após salvar, o ponto aparece na
listagem.

**Why this priority**: é o coração do RF11/RF13/RF14/RF15 — sem cadastro,
não há dados de catálogo para painel, app do turista e dashboard; a
qualidade destes dados alimenta RF26/RF27/RF38 do produto.

**Independent Test**: cadastrar um ponto completo escolhendo o local no
mapa, categorias e cronograma, verificar resposta e reflexo na listagem;
tentar salvar sem categoria ou sem cronograma e ver validação acionável.

**Acceptance Scenarios**:

1. **Given** formulário preenchido com nome, descrição, ao menos uma
   categoria, localização escolhida no mapa (ou digitada) e ao menos um dia
   do cronograma com horários válidos, **When** confirmado, **Then** vê
   carregamento e, ao sucesso, o novo ponto na listagem refletindo o
   retorno da API.
2. **Given** o mapa aberto, **When** o administrador marca a posição (ou
   arrasta o marcador), **Then** latitude/longitude se preenchem e vice-versa
   (digitar coordenadas posiciona o marcador); a localização escolhida é
   visível antes de salvar.
3. **Given** envio sem categoria, sem cronograma, com horário inválido ou
   coordenada fora da faixa, **When** validado, **Then** recusa com erro
   acionável junto ao campo correspondente antes do envio — e, se o backend
   recusar, o erro vem acionável sem perder os dados digitados.
4. **Given** todas as categorias do catálogo expostas pela API, **When** o
   formulário abre, **Then** o seletor mostra as opções do catálogo (nada
   fixado no código do painel — portabilidade RNF06) em português.

---

### User Story 3 - Edição de ponto turístico (Priority: P2)

O administrador abre a edição de um ponto da listagem e altera quaisquer
dados — nome, descrição, categorias, localização (novamente via mapa),
cronograma e **status de operação** (aberto ao público / temporariamente
fechado / fechado permanentemente). A alteração de status reflete o ciclo
declarado no RF15 e é enviada como parte da edição.

**Why this priority**: mantém o catálogo correto ao longo do tempo (RF12)
e dá execução operacional ao RF15; depende da listagem, não do cadastro.

**Independent Test**: editar um ponto (mudança de nome, de categorias, de
posição no mapa, de horário e de status), confirmar reflexo na listagem e
recusas de validação acionáveis.

**Acceptance Scenarios**:

1. **Given** ponto existente selecionado, **When** o administrador altera
   quaisquer campos e confirma, **Then** o painel envia a edição e, ao
   sucesso, a listagem reflete o retorno da API sem recarregar a página
   inteira.
2. **Given** alteração de posição no mapa em edição, **When** o
   administrador reposiciona o marcador (ou digita coordenadas), **Then** a
   nova localização é enviada na edição e refletida.
3. **Given** envio recusado pelo backend (validação/conflito), **When** a
   resposta chega, **Then** erro acionável junto ao formulário, dados
   preservados, listagem inalterada.
4. **Given** ponto fechado permanentemente, **When** listado, **Then** o
   status é exibido de forma distinta (e o administrador pode mudá-lo na
   edição — o efeito ao turista é decisão do backend).

---

### User Story 4 - Remoção de ponto turístico (Priority: P2)

O administrador remove um ponto da listagem: confirmação explícita nomeia
o ponto e o efeito — **a remoção é permanente** (operação destrutiva
irreversível, RF12). Após confirmar, o ponto sai da listagem refletindo o
resultado da API, com erros acionáveis se a remoção falhar.

**Why this priority**: completa o RF12 (remoção); depende apenas da
listagem, mas é a operação mais sensível da área — o fluxo inteiro é
guardado por confirmação.

**Independent Test**: remover um ponto com confirmação, verificar saída da
listagem; cancelar o diálogo e nada mudar; remover com API em falha e ver
erro acionável sem mudança.

**Acceptance Scenarios**:

1. **Given** ponto selecionado, **When** o administrador aciona remoção e
   confirma o diálogo (que nomeia o ponto e avisa que é permanente),
   **Then** o painel envia a operação e, ao sucesso, o ponto sai da
   listagem.
2. **Given** o diálogo aberto, **When** o administrador cancela, **Then**
   nada é enviado e a listagem permanece inalterada — remoção nunca
   acontece em um clique.
3. **Given** falha na remoção (API indisponível ou ponto já removido),
   **When** a resposta chega, **Then** erro explícito acionável, listagem
   permanece como estava e o diálogo não reabre sozinho.

---

### Edge Cases

- Coordenadas fora do intervalo do contrato (latitude ±90, longitude ±180):
  recusa cliente antes do envio; recusa do backend também apresentada
  claramente.
- Horários inválidos no cronograma (formato ou fechamento antes da
  abertura): erro junto ao campo; o formato do contrato é HH:MM puro.
- Sem categorias selecionadas ou sem dias de cronograma: recusa antes do
  envio (o contrato exige ao menos uma categoria e um dia).
- Remoção de ponto já removido (ou removido em outra sessão): erro do
  backend tratado como desfecho da ação, listagem revalidada refletindo o
  estado real.
- Ponto removido/alterado por outra pessoa durante a edição: o desfecho
  vem do backend; a listagem reflete o estado retornado (nada otimista não
  confirmado).
- Resposta divergente do contrato (campo ausente, tipo inesperado, status
  desconhecido): falha explícita de contrato, nunca dado silenciosamente
  aceito ou status inventado (Princípio I).
- Filtro por categoria ativo durante paginação/manutenção do filtro:
  a paginação aplica o filtro vigente, sem perder a seleção.
- Catálogo de categorias indisponível na abertura do formulário: estado de
  erro acionável no seletor (com nova tentativa), sem inventar categorias
  no painel (RNF06/Princípio I).
- Funcionário acessando a área por endereço: guardas da SPE-01 redirecionam
  antes de renderizar; 403 de qualquer chamada é estado de erro da ação
  (Princípio II).
- Sessão do administrador expira no meio de uma operação: renovação
  transparente cobre; se encerrada, retorno ao login com aviso — nenhuma
  operação é considerada concluída sem resposta de sucesso.

## Requirements *(mandatory)*

### Functional Requirements

**Acesso e proteção da área (RF03/RF11)**

- **FR-001**: a área de pontos turísticos MUST estar sob as rotas
  administrativas, com os guardas de papel da SPE-01 reforçados (operador
  funcionário é redirecionado antes de qualquer renderização; o item de
  navegação só aparece para administrador) — a autorização final é sempre
  do backend (Princípio II); 403 ⇒ estado de erro da ação.
- **FR-002**: o painel NÃO DEVE fixar dados da cidade no código — o
  catálogo de categorias e qualquer dado exibido provêm da API (Princípio
  IV, RNF06); nenhuma categoria, nome de cidade ou lista padrão é
  hard-coded.

**Listagem com filtros e paginação (RF11/RF15)**

- **FR-003**: o painel MUST listar os pontos em tabela reusando o
  `DataTable` transversal, exibindo ao menos: nome, categorias do ponto,
  status de operação e datas de criação/atualização, com o total e a
  paginação retornados pela API (Princípio IV).
- **FR-004**: o painel MUST oferecer filtro por **status** transmitido à
  API (os três estados do RF15) e filtro por **categoria** conforme o
  suporte do contrato vigente — com o filtro preservado durante a
  paginação (FR-003); se o contrato não suportar filtro server-side por
  categoria, o filtro por categoria é aplicado na exibição sobre os dados
  carregados e registrado como limitação/pendência de contrato (nunca
  inventado como se fosse server-side).
- **FR-005**: o painel MUST exibir de forma distinta e visível os estados
  de carregamento, vazio (com cta para cadastro e sugestão de limpar
  filtro) e erro (com nova tentativa) da listagem (Princípio V).
- **FR-006**: o painel MUST oferecer paginação refletindo a paginação da
  API (avançar/recuar página com tamanho exibido), nunca "inventar"
  paginação client-side quando a API pagina server-side.
- **FR-007**: a listagem MUST revalidar a fonte de dados após toda
  operação bem-sucedida (cadastro/edição/remoção), refletindo sempre o
  estado retornado pela API.

**Cadastro (RF11/RF13/RF14/RF15)**

- **FR-008**: o formulário de cadastro MUST coletar: nome, descrição,
  uma ou mais categorias do catálogo da API, coordenadas de localização,
  **raio de tolerância opcional em metros** (decisão da clarificação
  2026-11-06), cronograma por dia da semana com horários de
  abertura/fechamento (ao menos um dia) e status de operação (padrão
  aberto ao público) — apresentado em **wizard de 4 etapas com validação
  por etapa** (decisão do owner, clarificação 2026-11-06: 1) Identificação;
  2) Categorias; 3) Localização; 4) Funcionamento; cadastro e edição); a
  UI valida contra as regras do contrato (limites de
  tamanho, faixas de coordenadas, formato HH:MM, mínimos de
  categorias/dias) antes do envio (FR-014 sobre erros de backend).
- **FR-009**: a escolha de localização MUST ser possível em **mapa
  integrado** (definindo o marcador na posição desejada, preenchendo
  latitude/longitude) **e** por digitação manual das coordenadas (cada um
  alimenta o outro). Em cadastro de ponto novo, o mapa MUST abrir centrado
  na localização de um ponto já cadastrado (quando a listagem vigente
  tiver; sem dados, visão padrão da biblioteca) — nenhum centro fixado no
  código (RNF06, clarificação 2026-11-06). Esta spec define a integração
  de mapa UMA ÚNICA VEZ para o painel (Constraint 3 da constituição),
  reusada pela SPE-07.
- **FR-010**: o seletor de categorias MUST apresentar as opções do
  catálogo retornado pela API com rótulos em português, com estado de
  carregamento e de erro próprios (nova tentativa) — nunca categorias
  hardcoded no painel. **Fonte decidida (clarificação 2026-11-06):**
  catálogo de interesses do turista (`GET /api/v1/tourists/interest-
  categories`), com probe obrigatório confirmando a correspondência das
  chaves de categoria dos spots antes das tasks de formulário.
- **FR-011**: o cronograma MUST ser apresentado por dia da semana com
  horários de abertura/fechamento por dia, permitindo múltiplos dias, com
  validação de formato e coerência dos horários no cliente.

**Edição (RF12/RF15)**

- **FR-012**: o painel MUST permitir editar todos os campos do cadastro
  (incl. reposicionar no mapa e redefinir o cronograma) com envio parcial
  — apenas os campos alterados — e refletir o retorno da API na listagem;
  o status de operação é alterável pela própria edição (RF15).

**Remoção (RF12)**

- **FR-013**: a remoção MUST ser precedida de confirmação explícita
  nomeando o ponto e o efeito (remoção permanente — irreversível);
  remoção nunca acontece em um clique direto (Princípio V). Após o
  desfecho do backend, a listagem reflete o estado real; erros são
  acionáveis e não silenciosos.

**Estados de erro e contrato (transversal)**

- **FR-014**: toda operação MUST apresentar carregamento e erro de forma
  distinta e visível; erros do backend seguem o payload unificado e são
  apresentados com mensagem acionável — nunca mensagens técnicas brutas.
- **FR-015**: resposta divergente do contrato MUST virar erro explícito
  registrado como divergência (Princípio I).
- **FR-016**: o painel MUST funcionar por teclado, com rótulos acessíveis
  (incl. o mapa operável por teclado com alternativa de digitação manual
  das coordenadas) e textos da UI em português (convenção; Constraint 6).

### Key Entities *(include if feature involves data)*

- **Ponto Turístico**: registro do catálogo da cidade — identificador,
  nome, descrição, localização (latitude/longitude), raio de tolerância
  opcional para validação de presença, status de operação (aberto ao
  público / temporariamente fechado / fechado permanentemente), categorias
  (uma ou mais, do catálogo da API) e cronograma de funcionamento (por dia
  da semana, com intervalos de abertura/fechamento HH:MM). Datas de
  criação/atualização para auditoria de exibição.
- **Status de operação**: os três estados do RF15, valores contratais;
  alterável pela edição; o efeito ao turista é decisão do backend.
- **Categoria**: chave do catálogo pré-definido administrado pela API
  (rótulos em português para exibição); cada ponto tem uma ou mais.
- **Cronograma**: pares dia da semana + intervalo HH:MM por dia;
  ao menos um dia por ponto (contrato).
- **Remoção**: operação permanente e irreversível (distinta da revogação
  de funcionários da SPE-02 — aqui não há desativação).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: um administrador conclui o cadastro completo de um ponto
  turístico (da abertura do formulário ao ponto visível na listagem),
  incluindo escolha da posição no mapa, categorias e cronograma, em menos
  de 3 minutos.
- **SC-002**: um administrador localiza um ponto específico usando os
  filtros de status/categoria e a paginação em menos de 10 segundos, com
  o status legível a olho nu.
- **SC-003**: 100% das operações de remoção exigem confirmação nomeando o
  ponto e o efeito permanente; cancelamento no diálogo nunca produz
  qualquer alteração.
- **SC-004**: a coordenada escolhida no mapa e a digitada manualmente
  refletem-se uma na outra sem divergência em 100% dos testes da US2/US3
  (cenário 2.2/3.2) — nada de "marcador diz uma coisa, campo diz outra".
- **SC-005**: nenhuma cadeia de caracteres de categoria, nome de cidade ou
  lista pré-definida aparece no código do painel — as categorias vêm
  sempre do catálogo da API (verificação por inspeção e de código).
- **SC-006**: toda requisição da área tem estado de carregamento, erro ou
  sucesso visível e distinto; nenhuma resposta divergente do contrato é
  aceita silenciosamente (cenários 1.5/2.3/3.3/4.3).

## Assumptions

- **API real acessível (2026-11-06):** a "Passanorte API" em
  `http://localhost:8010` expõe os endpoints de pontos turísticos; o
  contrato desta spec foi extraído do OpenAPI real (não inventado,
  Princípio I); pendências abaixo são resolvidas por probe.
- **Padrões herdados da SPE-01/SPE-02**: camada de dados client-side via
  túnel BFF + TanStack Query (padrão estabelecido na SPE-02), componentes
  transversais (`DataTable`, estados, botões), classificador de erro
  `ApiError` compartilhado e guardas `/admin/*`.
- **Mapa**: integração de mapa definida nesta spec conforme Constraint 3 —
  **emenda 2.0.0 (2026-11-06): OpenStreetMap via `react-leaflet`/`leaflet`**
  (gratuitas/open source, sem chave nem billing); a digitação manual de
  coordenadas permanece como alternativa acessível e equivalente
  (FR-009). A troca do Google por OSM foi decisão do owner com emenda
  formal da constituição.
- **Remoção física**: o RF12 "remoção" é atendido pelo endpoint DELETE
  permanente (204) — não há desativação como em funcionários; a
  confirmação explícita compensa a irreversibilidade.
- **Filtro por categoria**: o contrato vigente não expõe parâmetro de
  filtro por categoria (apenas status) — o filtro é aplicado na exibição,
  registrado como limitação, e se o backend adicionar o parâmetro é
  enriquecimento pós-contrato (emenda, não invenção).
- **Raio de tolerância** (validação de presença GPS/Haversine, RF32) é
  campo do contrato (opcional); o formulário o expõe como campo opcional
  simples com orientação de uso — decisões de geofencing são do backend.
- **Vocabulários** (chaves de categoria, chaves de dia da semana,
  `errorCode`s de erro) dependem do probe — ver Pendências; nada
  hard-codificado de antemão.
- Textos da UI em português (convenção do projeto).

## Contrato da API *(extraído do OpenAPI real — "Passanorte API" em `http://localhost:8010`, 2026-11-06; Princípio I da constituição)*

> Autenticação: `Authorization: Bearer <accessToken>` (security scheme
> global `HTTPBearer`), anexado apenas server-side (túnel BFF — Constraint
> 5). Erros: payload unificado `ApiError { errorCode, message, details }`;
> exceção: 422 (`HTTPValidationError` padrão). Campos em **camelCase**.
> Sessão de funcionário nestas rotas ⇒ 403 (estado de erro, Princípio II).

**GET `/api/v1/tourist-spots`** — listagem administrativa paginada.

- Query params: `status` (filtro), `page`, `pageSize`.
- 200 → `SpotListResponse`:
  `{ items: [SpotView], total: <int>, page: <int>, pageSize: <int> }`
- `SpotView` (também corpo de PATCH):
  `{ id, name, description, latitude: <number>, longitude: <number>,
     toleranceRadiusM: <number|null>, status: <string>,
     categories: [string], schedule: [{ weekday, opensAt, closesAt }],
     createdAt, updatedAt }` — timestamps `date-time`; categorias são
  chaves do catálogo ("raw catalog keys").

**POST `/api/v1/tourist-spots`** — cadastro (RF11/RF13/RF14/RF15).

- Request: `{ name (1–200), description (1–2000), latitude (−90…90),
  longitude (−180…180), status?: SpotStatus, toleranceRadiusM?: >0,
  categories: [string] (mín. 1), schedule: [{ weekday, opensAt, closesAt
  (`HH:MM`) }] (mín. 1) }`
- **201** → `SpotView`.
- 422: `HTTPValidationError` (recusas de negócio: `errorCode` a confirmar
  no probe).

**GET `/api/v1/tourist-spots/{spot_id}`** — detalhe público do app
(`PublicSpotDetailView`, com categorias resolvidas `{key, label}`,
eventos e links de navegação mapLink/uberLink/99). **Uso no painel
opcional** (a listagem traz tudo do que esta área precisa); não é o corpo
de edição.

**PATCH `/api/v1/tourist-spots/{spot_id}`** — edição parcial (RF12/RF15).

- Request: todos os campos opcionais (mesmos limites); `status` aceita o
  enum `SpotStatus`.
- 200 → `SpotView` atualizado; 422: validação.

**DELETE `/api/v1/tourist-spots/{spot_id}`** — remoção permanente (RF12).

- **204** sem corpo. 422: path inválido; 404/`errorCode`: ponto
  inexistente (observar no probe).

**SpotStatus (enum contratal):** `"open"` | `"temporarilyClosed"` |
`"permanentlyClosed"` — mapeamento explícito no painel para os rótulos em
português ("Aberto ao público" / "Temporariamente fechado" / "Fechado
permanentemente"); valor desconhecido ⇒ violação de contrato explícita
(nunca badge inventado).

**Eventos vinculados (visão pública)**: pertencem à SPE-04; nesta área
aparecem apenas como dados do detalhe público, se consumido — nenhum CRUD
de eventos aqui.

**Segurança e privacidade**: dados do ponto não são sensíveis (sem dados
pessoais LGPD); auditoria de ações administrativas (RNF19) é do backend; o
painel apenas informa o desfecho das ações ao operador.

**Pendências (resolvidas por probe — padrão da SPE-02 T005; não bloqueiam
o plan, exceto onde indicado)**

- ~~Catálogo de categorias~~ — **RESOLVIDO por probe (2026-11-06, task
  T004)**: forma `{ "categories": [ { key, label } ] }`; chaves
  `gastronomy, nature, culture, leisure, art, cinema` (rótulos pt); a
  **correspondência é assegurada pelo backend** (categorias fora do
  catálogo → 422 `request_error`); seletor consome a fonte sem nenhum
  hard-code (parse em `contract.ts` ajustado ao formato real).
- ~~Vocabulário de `weekday`~~ — **RESOLVIDO**: lowercase inglês
  (`"monday"`…) — idêntico às `SPOT_SCHEDULE_WEEKDAY_KEYS` da UI; nenhum
  ajuste necessário.
- ~~`status` omitido~~ — **RESOLVIDO**: default do backend é `"open"` (o
  painel continua enviando `open` explícito).
- ~~`errorCode`s~~ — **RESOLVIDOS**: coordenada fora de faixa → 422
  `validation_error` (detalhes `[{key,message}]` — ATENÇÃO: o backend usa
  o payload unificado `ApiError` também no 422, NÃO o FastAPI
  `HTTPValidationError`); id inexistente → 404 `resource_not_found`;
  categoria fora do catálogo → 422 `request_error` (mensagem específica
  mapeada em `messages.ts`).
- ~~Formato de timestamps~~ — **RESOLVIDO**: ISO date-time `…Z`.
- Vocabulário exato de `weekday` no cronograma (chaves usadas pelo
  backend — ex.: inglês lowercase ou PT) — probe; parse exige string
  não-vazia e o formulário usa o vocabulário confirmado.
- `errorCode`s do `ApiError` para: coordenada fora de faixa, horário
  inválido, ponto inexistente (404) e conflitos — probe.
- Suporte server-side a filtro por **categoria** (query param) — hoje o
  contrato só expõe `status`; se adicionado, é enriquecimento de contrato
  (emenda desta spec antes de uso).
- Comportamento de GET de `spot_id` inexistente (404/formato) — probe.
