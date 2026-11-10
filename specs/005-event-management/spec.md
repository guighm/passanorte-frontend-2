# Feature Specification: Gerenciamento de Eventos (SPE-04)

**Feature Branch**: `005-event-management`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "Gerenciamento de eventos do painel PassaNorte, cobrindo RF16 e RF17 de docs/SYSTEM_REQUIREMENTS.md (acesso administrador). Cadastro de evento sempre associado a um ponto turístico existente (seletor alimentado pela feature de pontos, SPE-03), com data de ocorrência, descrição e preço do ingresso. Edição e remoção com confirmação (RF17). Listagem de eventos, opcionalmente filtrada por ponto turístico. Consumir os endpoints de eventos conforme o contrato OpenAPI da API FastAPI, seguindo os padrões de UI e estrutura estabelecidos nas SPE-01 e SPE-03."

> **Nota de escopo (constituição):** conforme Princípio I da
> `../../.specify/memory/constitution.md`, a seção "Contrato da API" abaixo é
> conteúdo obrigatório de spec do projeto PassaNorte e substitui a diretriz
> genérica de ausência de detalhes técnicos; os componentes de
> `src/shared/components` (DataTable, estados de UI) são reuso sancionado pelo
> Princípio IV, e o seletor de pontos turísticos é alimentado pela listagem de
> pontos da SPE-03. Demais requisitos e critérios de sucesso permanecem
> agnósticos de tecnologia.

## Clarifications

### Session 2026-11-10

- Q: O formulário de cadastro deve permitir informar datas de ocorrência no
  passado, ou restringe a eventos futuros? → A: **Permitir qualquer data**
  (passada, presente ou futura) — sem validação de período no cliente (Opção
  A): o contrato do backend não impõe restrição temporal e o backend é a
  autoridade de regras de negócio (Princípio II); o painel pode precisar
  registrar eventos passados retrospectivamente.
- Q: O formulário de cadastro e edição de evento deve ser exibido em uma
  página dedicada com rota própria, ou em um diálogo/modal aberto sobre a
  listagem? → A: **Página dedicada com rota própria** para cadastro e edição
  (Opção A) — navegação por teclado/URL mais simples de tornar acessível, e
  a edição (que carrega o evento existente) casa bem com uma rota. Nota de
  correção (plan 2026-11-10): a SPE-03 na prática usa diálogos
  (`SpotFormDialog`); páginas dedicadas são um padrão novo no projeto,
  preferido pelo owner nesta clarificação.
- Q: Quando um evento na listagem referencia um ponto turístico que foi
  removido (remoção de pontos é física na SPE-03), como a listagem de
  eventos deve exibir esse vínculo? → A: **Rótulo de fallback identificável
  ("ponto turístico não encontrado") + probe obrigatório** do comportamento
  real do DELETE de pontos com eventos pendentes (Opção B): o comportamento
  do backend é desconhecido até o probe; exibir rótulo identificável
  preserva a integridade da lista, e o resultado do probe atualiza o
  contrato. Ocultar eventos não resolvidos localmente é proibido (FR-011).
- Q: Se o catálogo de pontos turísticos crescer além do que cabe em uma
  página da listagem paginada de pontos (padrão da SPE-03), como o seletor
  de pontos do formulário de evento deve garantir que todos os pontos
  estejam disponíveis para seleção? → A: **Carregar todas as páginas do
  catálogo** (laço com `pageSize` máximo) antes de habilitar o seletor
  (Opção A) — uso administrativo com volume acadêmico (poucas dezenas de
  pontos); garante completude sem depender de endpoint novo no backend.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Listar eventos com filtro por ponto turístico (Priority: P1)

O administrador acessa a área de eventos do painel e visualiza a lista completa
de eventos cadastrados, em ordem ascendente de data de ocorrência. Ao
selecionar um ponto turístico no filtro, a lista passa a exibir somente os
eventos daquele ponto; ao limpar o filtro, a lista volta ao estado completo.

**Why this priority**: a listagem é o ponto de entrada do módulo — sem ela não
há acesso aos eventos existentes, e é dela que derivam as ações de criação,
edição e remoção. Também valida a leitura do contrato de listagem antes de
qualquer escrita.

**Independent Test**: pode ser testada abrindo a listagem com eventos
pré-existentes no backend e verificando ordenação, colunas e comportamento do
filtro — sem implementar cadastro ou edição.

**Acceptance Scenarios**:

1. **Given** há eventos cadastrados no backend, **When** o administrador abre a
   listagem de eventos, **Then** todos os eventos são exibidos com ponto
   turístico (nome), data de ocorrência, descrição e preço do ingresso,
   ordenados pela data de ocorrência.
2. **Given** a listagem está aberta, **When** o administrador seleciona um
   ponto turístico no filtro, **Then** apenas os eventos vinculados a esse
   ponto são exibidos.
3. **Given** um filtro por ponto está ativo, **When** o administrador limpa o
   filtro, **Then** a listagem volta a exibir todos os eventos.
4. **Given** nenhum evento corresponde ao filtro aplicado, **When** a resposta
   da API retorna lista vazia, **Then** o painel exibe um estado de vazio
   acionável (e não uma tela em branco ou erro).
5. **Given** o carregamento da listagem, **When** a requisição está em curso,
   **Then** um estado de carregamento distinto é exibido; se a API falhar, um
   estado de erro com ação de tentar novamente é exibido.

---

### User Story 2 - Cadastrar evento vinculado a um ponto turístico (Priority: P1)

O administrador inicia o cadastro de um novo evento, escolhe o ponto turístico
de ocorrência em um seletor alimentado pela lista de pontos da SPE-03, informa
a data de ocorrência, a descrição e o preço do ingresso e confirma. O evento é
criado no backend e aparece imediatamente na listagem.

**Why this priority**: o cadastro (RF16) é o valor central da feature — sem
eventos registrados, edição e remoção não teriam objeto. Integra o módulo de
eventos ao de pontos turísticos (SPE-03).

**Independent Test**: pode ser testada preenchendo o formulário com dados
válidos e verificando que o evento criado aparece na listagem com os dados
informados — sem depender de edição ou remoção.

**Acceptance Scenarios**:

1. **Given** o administrador está no formulário de novo evento, **When**
   preenche ponto turístico, data de ocorrência, descrição e preço do ingresso
   com valores válidos e confirma, **Then** o evento é criado no backend e a
   listagem passa a exibi-lo com seus dados.
2. **Given** o formulário de novo evento aberto, **When** o administrador abre
   o seletor de pontos turísticos, **Then** o seletor apresenta os pontos
   turísticos existentes vindos da API (nenhuma lista fixada no código).
3. **Given** campos obrigatórios do formulário vazios ou inválidos (data sem
   formato válido, preço negativo, descrição vazia, ponto não selecionado),
   **When** o administrador tenta submeter, **Then** o formulário não envia a
   requisição e sinaliza, campo a campo, o que precisa ser corrigido.
4. **Given** o administrador escolhe um ponto turístico com status "fechado
   permanentemente" e confirma, **When** o backend rejeita a criação (409),
   **Then** uma mensagem acionável explica que eventos não podem ser
   vinculados a um ponto fechado permanentemente, preservando os dados
   preenchidos.
5. **Given** o preço do ingresso informado em reais, **When** o evento criado é
   exibido na listagem, **Then** o valor aparece formatado como moeda
   correspondendo ao valor informado (inclusive preço zero para evento
   gratuito).

---

### User Story 3 - Editar um evento (Priority: P2)

O administrador, a partir da listagem, abre a edição de um evento existente,
altera qualquer combinação de campos (inclusive re-vinculando o evento a outro
ponto turístico) e confirma. As alterações são persistidas no backend e
refletidas na listagem.

**Why this priority**: a edição (parte de RF17) depende da existência da
listagem, mas não do fluxo de criação — pode ser testada sobre eventos
pré-existentes no backend.

**Independent Test**: pode ser testada alterando um ou mais campos de um
evento pré-existente e verificando a persistência na listagem.

**Acceptance Scenarios**:

1. **Given** um evento pré-existente, **When** o administrador abre a edição,
   **Then** o formulário é apresentado preenchido com os valores atuais do
   evento.
2. **Given** a edição de um evento, **When** o administrador altera somente a
   descrição e confirma, **Then** apenas a descrição muda e os demais campos
   permanecem os registrados no backend.
3. **Given** a edição de um evento, **When** o administrador re-vincula o
   evento a outro ponto turístico e confirma, **Then** o evento passa a
   pertencer ao novo ponto na listagem.
4. **Given** a edição com re-vinculação a um ponto fechado permanentemente,
   **When** o backend rejeita (409), **Then** uma mensagem acionável explica
   o motivo e os dados preenchidos são preservados.
5. **Given** o administrador aborta a edição, **When** descarta o
   formulário, **Then** o evento permanece inalterado no backend.

---

### User Story 4 - Remover um evento com confirmação (Priority: P2)

O administrador, a partir da listagem, aciona a remoção de um evento. Antes de
qualquer chamada destrutiva ao backend, uma confirmação explícita apresenta o
que será removido; somente após confirmação o evento é removido.

**Why this priority**: completa RF17 e fecha o ciclo do CRUD, mas depende de
menos detalhes de contrato que cadastro e edição (uma chamada única sem
payload).

**Independent Test**: pode ser testada removendo um evento pré-existente após
confirmar, e também cancelando a confirmação e verificando que o evento
permanece.

**Acceptance Scenarios**:

1. **Given** um evento pré-existente, **When** o administrador aciona a
   remoção e confirma na confirmação explícita, **Then** o evento é removido
   do backend e deixa de aparecer na listagem.
2. **Given** a confirmação de remoção aberta, **When** o administrador
   cancela, **Then** nenhuma chamada de remoção acontece e o evento permanece
   na listagem.
3. **Given** a confirmação de remoção aberta, **When** ela é exibida, **Then**
   identifica inequivocamente o evento alvo (vinculação ao ponto e data de
   ocorrência), evitando remoção errada.
4. **Given** um evento já removido (em outra sessão) sobre o qual o
   administrador aciona a remoção, **When** o backend responde recurso não
   encontrado (404), **Then** uma mensagem acionável informa que o evento não
   existe mais e a listagem é atualizada sem ele.

### Edge Cases

- O que acontece quando a listagem de pontos turísticos está vazia? O seletor
  do cadastro fica sem opções, com mensagem orientando a cadastrar um ponto
  primeiro (evento sempre é criado vinculado a um ponto existente).
- O que acontece enquanto o catálogo de pontos (todas as páginas) é carregado
  para o seletor? O seletor permanece desabilitado com estado de carregamento
  visível — nunca habilitado com conjunto parcial (FR-006).
- O que acontece quando a requisição demora ou falha durante o submit do
  formulário? O botão entra em estado de progresso, impede duplo envio e a
  falha é sinalizada com mensagem acionável preservando os dados.
- O que acontece com eventos duplicados (mesmo ponto, mesma data, descrição
  semelhante)? O backend não impõe unicidade pelo contrato; o painel permite,
  refletindo o comportamento da API (decisão do administrador).
- O que acontece quando um evento é removido em outra sessão? A próxima
  interação que o tocar recebe 404 tratado como mensagem acionável (cenário 4
  da US4).
- O que acontece na listagem quando o ponto turístico de um evento foi
  removido? O evento permanece visível com o rótulo de fallback "ponto
  turístico não encontrado" (FR-012); o comportamento do backend (erro,
  cascata ou órfão) é confirmado por probe (pendência 4 do Contrato da API).
- O que acontece com a formatação do preço? Valores com mais de duas casas
  decimais são normalizados para duas casas (padrão monetário do contrato)
  antes do envio.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O painel MUST restringir toda a área de eventos ao papel
  Administrador, bloqueando navegação de papéis sem permissão (RBAC de
  superfície, padrão da SPE-01).
- **FR-002**: A listagem de eventos MUST exibir todos os eventos retornados
  pela API, com ponto turístico, data de ocorrência, descrição e preço do
  ingresso, ordenados pela data de ocorrência conforme o retorno da API.
- **FR-003**: A listagem MUST permitir filtrar os eventos por ponto turístico,
  aplicando o filtro no lado do backend (parâmetro de filtragem do contrato de
  listagem) e não por recorte local da página já carregada.
- **FR-004**: A listagem MUST exibir estados de carregamento, vazio e erro
  distintos e acionáveis (Princípio V da constituição).
- **FR-005**: O cadastro de evento MUST exigir, todos como obrigatórios: ponto
  turístico, data de ocorrência, descrição e preço do ingresso (RF16).
- **FR-006**: O seletor de ponto turístico do cadastro/edição MUST ser
  alimentado pela listagem de pontos turísticos da API (feature SPE-03) —
  nenhuma lista de pontos fixada no código (RNF06). Como a listagem de
  pontos é paginada (contrato da SPE-03, `pageSize` limitado), o seletor
  MUST carregar TODAS as páginas do catálogo antes de habilitar a seleção —
  nenhum ponto existente pode ficar ausente do seletor (clarificação
  2026-11-10).
- **FR-007**: O formulário de cadastro/edição MUST validar os campos no
  cliente antes do envio (campo obrigatório, formato de data, preço não
  negativo, limite de tamanho da descrição) e sinalizar erros campo a campo
  sem enviar a requisição. Datas de ocorrência PASSADAS são permitidas —
  nenhuma restrição de período é imposta no cliente (clarificação
  2026-11-10); validação de período, se um dia existir, é regra do backend.
- **FR-008**: A edição de evento MUST permitir alterar qualquer campo
  (inclusive re-vincular o ponto turístico), enviando ao backend apenas os
  campos efetivamente alterados, conforme o contrato de edição parcial (RF17).
- **FR-009**: A remoção de evento MUST exigir confirmação explícita que
  identifique o evento alvo, e nenhuma chamada destrutiva pode ocorrer antes
  dela (RF17; Princípio V).
- **FR-010**: Toda falha da API nos fluxos de evento (não autenticado, sem
  permissão, recurso não encontrado, ponto fechado permanentemente, validação
  do backend) MUST ser apresentada como mensagem acionável distinta, mapeando
  os códigos do contrato — dados preenchidos pelo operador não podem ser
  perdidos nessas falhas.
- **FR-011**: O painel MUST refletir fielmente o estado retornado pela API
  após criação, edição ou remoção (dados mockados substituídos por endpoints
  reais; nenhum estado local divergente do backend).
- **FR-012**: A listagem MUST apresentar o nome do ponto turístico de cada
  evento resolvendo o vínculo por identificador com a listagem de pontos da
  SPE-03, já que o registro de evento do contrato carrega apenas o
  identificador do ponto (sem nome embutido). Quando o ponto não pode ser
  resolvido (removido fisicamente na SPE-03), a listagem MUST exibir rótulo
  identificável de fallback ("ponto turístico não encontrado") em vez de
  identificador bruto — e NUNCA ocultar o evento (clarificação 2026-11-10).
- **FR-013**: O cadastro e a edição de evento MUST ocorrer em páginas
  dedicadas com rotas próprias na árvore do painel (clarificação
  2026-11-10; padrão novo no projeto — SPE-03 usa diálogos); nenhuma tela
  de CRUD de evento fora dessa árvore (Princípio IV).

### Key Entities *(include if feature involves data)*

- **Evento**: ocorrência única vinculada a um ponto turístico, com data de
  ocorrência, descrição (até o limite do contrato) e preço do ingresso (valor
  monetário não negativo, duas casas decimais). Identificador numérico
  atribuído pelo backend.
- **Ponto Turístico (referência)**: alvo obrigatório do vínculo do evento.
  O evento referencia o ponto por identificador; o nome exibido vem da
  feature de pontos (SPE-03). Um ponto "fechado permanentemente" não aceita
  eventos novos nem re-vinculação — regra aplicada pelo backend.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O administrador visualiza a listagem de eventos em menos de 10
  segundos após abrir a área de eventos, com carregamento percebido e sem
  erros.
- **SC-002**: O administrador conclui o cadastro de um evento em menos de 2
  minutos, e o evento criado aparece na listagem sem recarregar manualmente a
  página.
- **SC-003**: 100% das tentativas de submeter o formulário com dados inválidos
  são interceptadas no cliente, com indicação campo a campo do que corrigir —
  nenhuma requisição malformada parte do painel.
- **SC-004**: 100% das remoções passam pela confirmação explícita; nenhuma
  remoção ocorre sem ela.
- **SC-005**: Todas as falhas previstas do contrato (401/403, 404, 409, 422)
  produzem mensagens acionáveis distintas e preservam os dados do formulário —
  verificáveis por probe contra a API real.
- **SC-006**: Um filtro por ponto turístico retorna somente eventos daquele
  ponto em 100% dos casos testados, sem recorte local.

## Assumptions

- A sessão administrativa e o RBAC de superfície da SPE-01 estão operacionais;
  a feature reusa o mesmo padrão de guardas, sem novo mecanismo de autenticação.
- O formulário de cadastro/edição é único (não em etapas): o contrato de
  evento tem apenas 4 campos, sem complexidade que justifique wizard —
  diferente de SPE-03, que seguiu decisão de owner para formulário longo.
  É exibido em página dedicada com rota própria (clarificação 2026-11-10,
  FR-013).
- O filtro de lista por faixa de datas (`startDate`/`endDate`), suportado pelo
  contrato de listagem fica FORA do escopo desta fase (o pedido foi filtro por
  ponto turístico); pode entrar em evolução futura sem quebra de contrato.
- Não há paginação na listagem de eventos nesta versão do contrato (a API
  retorna todos os eventos correspondentes ao filtro, ordenados por data de
  ocorrência e identificador); o painel exibe a lista completa sem paginação.
- O catálogo de pontos turísticos já pode conter registros (dependência
  SPE-03); eventos sempre existem vinculados a um ponto existente.
- A área de eventos não expõe ações para dados ausentes na API (ex.: status
  do evento, imagens) — apenas os campos do contrato.
- Datas de ocorrência sem horário são aceitas: o contrato trata apenas data
  (sem fuso/timestamp), alinhado à representação da API. Datas passadas são
  permitidas (clarificação 2026-11-10): eventos retrospectivos podem ser
  registrados pelo administrador.

## Contrato da API *(obrigatório pela constituição — Princípio I)*

Fonte: OpenAPI real da API FastAPI ("Passanorte API") em `http://localhost:8010`
(`GET /openapi.json`), extraído em 2026-11-10. Tag `Events`. Autenticação:
HTTP Bearer via túnel BFF (padrão SPE-01/03). Formato de erro unificado
(`ApiError`, com código de erro e mensagem), conforme probes das SPE-01/02/03.

### Endpoints

| Método   | Rota                        | Descrição (sumário do OpenAPI)                                                                  |
| -------- | --------------------------- | ------------------------------------------------------------------------------------------------ |
| `POST`   | `/api/v1/events`            | Post Event — cria evento (201; 401/403 não-admin; 404 ponto inexistente; 409 ponto fechado permanentemente; 422 inválido) |
| `GET`    | `/api/v1/events`            | Get Event List — listagem administrativa com filtros combináveis (200)                           |
| `PATCH`  | `/api/v1/events/{event_id}` | Patch Event — edição parcial de qualquer atributo, inclusive re-vínculo do ponto (200; 404 evento/ponto inexistente; 409 ponto fechado permanentemente) |
| `DELETE` | `/api/v1/events/{event_id}` | Delete Event Route — remove evento (204; 404 inexistente)                                        |

Todos exigem papel Administrador (401/403 com token ausente/sem permissão).

### Listagem — `GET /api/v1/events`

Query parameters (todos opcionais, combináveis):

- `spotId` (integer) — filtra por ponto turístico.
- `startDate` (date) — limite inferior inclusivo por data de ocorrência.
- `endDate` (date) — limite superior inclusivo por data de ocorrência.

Resposta 200 — `EventListResponse`: `{ "items": EventView[] }`. Sem
paginação nesta versão: todas as linhas correspondentes, ordenadas por
`(occurrenceDate, id)` ascendente.

### Payloads

`EventCreateRequest` (POST, todos obrigatórios):

| Campo            | Tipo                          | Regras                                             |
| ---------------- | ----------------------------- | -------------------------------------------------- |
| `spotId`         | integer                       | mínimo 1; ponto turístico existente                |
| `occurrenceDate` | string (`date`)               | data de ocorrência (sem horário)                   |
| `description`    | string                        | 1 a 2000 caracteres                                |
| `ticketPrice`    | number ou string              | mínimo 0; duas casas decimais (preço zero = gratuito) |

`EventUpdateRequest` (PATCH — TODOS opcionais; campos omitidos permanecem;
patch vazio é no-op com 200):

Mesmos campos de `EventCreateRequest`, todos nulos-possíveis. Um `spotId`
informado é re-validado contra o novo ponto pelo backend (404/409).

### Registro de evento — `EventView`

Corpo de todas as leituras (respostas de criação/edição, listagens,
incorporação pública):

| Campo            | Tipo            | Notas                                              |
| ---------------- | --------------- | -------------------------------------------------- |
| `id`             | integer         | identificador do evento                            |
| `spotId`         | integer         | vínculo com o ponto turístico                      |
| `occurrenceDate` | string (`date`) | data de ocorrência                                 |
| `description`    | string          | 1–2000 caracteres                                  |
| `ticketPrice`    | number          | número JSON com duas casas decimais (exactness no armazenamento: centavos) |

**Nota de integração (resolução em planejamento):** `EventView` NÃO embute o
nome do ponto turístico — exibição da listagem resolve o nome a partir da
listagem de pontos da SPE-03 (`GET /api/v1/tourist-spots`), por `spotId`
(Princípio IV — nenhum nome de ponto fixado no código).

Respostas de escrita: 201 (POST) e 200 (PATCH) com `EventView`; 204 (DELETE)
sem corpo. Respostas 401/403/404/409/422 no formato de erro unificado da API.

### Pendências de contrato (resolução por probe na implementação)

O contrato foi extraído do OpenAPI real e não há divergências aparentes. Os
probes de implementação devem confirmar, contra a API real:

1. Códigos de erro unificado nos fluxos 401/403/404/409/422 (padrão de probe
   da SPE-02 T005 / SPE-03 T004 — contrato em `contracts/`).
2. Formato de `ticketPrice` aceito como string no envio (contrato permite
   número **ou** string) — padrão adotado pelo painel deve ser registrado no
   contrato após o probe.
3. Comportamento real do 409: mensagem/código devolvido quando o ponto-alvo
   está "fechado permanentemente" (usado nos cenários 4 das US2/US3 e na
   FR-010).
4. Comportamento do `DELETE /api/v1/tourist-spots` quando o ponto possui
   eventos pendentes (impede com erro, remove em cascata, mantém evento
   órfão): resultado do probe define como a listagem de eventos trata o
   vínculo não resolvido e atualiza o contrato (clarificação 2026-11-10,
   FR-012 — fallback "ponto turístico não encontrado" no interim).
