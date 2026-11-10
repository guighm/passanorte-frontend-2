# Feature Specification: Rotas Turísticas e Estoque de Brindes (SPE-05)

**Feature Branch**: `006-routes-gifts-inventory`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "Rotas turísticas e controle de estoque de brindes do painel PassaNorte, cobrindo RF18, RF19 e RF20 de docs/SYSTEM_REQUIREMENTS.md (acesso administrador). Cadastro de rota com lista ordenada de pontos turísticos (selecionados da funcionalidade de pontos, SPE-03 — permitir reordenar) e brinde associado à conclusão da rota (RF18). Edição e remoção de rotas (RF19). Cadastro de brindes e controle da quantidade disponível em estoque de cada brinde vinculado a uma rota (RF20), com indicação clara de saldo na UI; esclarecer na spec que a baixa em estoque é efetuada pelo backend quando o funcionário concede o brinde (RF21), o frontend apenas reflete o saldo. Consumir os endpoints de rotas e brindes conforme o contrato OpenAPI da API FastAPI."

> **Nota de escopo (constituição):** conforme Princípio I da
> `../../.specify/memory/constitution.md`, a seção "Contrato da API" abaixo é
> conteúdo obrigatório de spec do projeto PassaNorte — aqui ela já foi
> **verificada contra o Swagger real** da API FastAPI (acessível em
> `API_BASE_URL`, tag `Gamification`), não é um contrato especulado. Os
> componentes de `src/shared/components` (DataTable, estados de UI) e o
> seletor alimentado pela listagem de pontos da SPE-03 são reuso sancionado
> pelo Princípio IV. Demais requisitos e critérios de sucesso permanecem
> agnósticos de tecnologia.

## Clarifications

### Session 2026-11-10

- Q: O formulário de cadastro e edição de rota (nome, descrição, lista
  ordenada de pontos com reordenação e brinde embutido) deve ser apresentado
  em página dedicada com URL própria ou em diálogo/modal sobre a listagem?
  → A: **Página dedicada com rota própria** (Opção A) — preferência do owner
  reafirmada da clarificação da SPE-04 (mais recente que o wizard em diálogo
  da SPE-03); o formulário de rota carrega uma lista reordenável, que pede
  espaço e navegação por teclado confortáveis.
- Q: Além do destaque para estoque esgotado (saldo zero), a indicação de
  saldo na listagem deve também destacar um estado de "estoque baixo" (saldo
  pequeno, ainda positivo)? → A: **Apenas esgotado (saldo 0)** (Opção A) —
  saldo positivo aparece como número normal; concessão é do backend/SPE-06 e
  um limiar extra não agrega decisão operacional ao administrador. Um estado
  "baixo" pode ser acrescentado no futuro sem mudar o contrato.
- Q: Como o administrador reordena os pontos turísticos na lista do
  formulário de rota: apenas botões mover para cima/baixo, ou também
  arrastar-e-soltar? → A: **Apenas botões subir/descer**, operáveis por
  teclado e ponteiro (Opção A) — atende à acessibilidade mínima
  (FR-016/Constraint 6) sem dependência nova (nova biblioteca exigiria
  justificativa na constituição); drag-and-drop é refinamento futuro.
- Q: A área de rotas deve ter uma página de detalhe da rota em leitura, ou o
  "detalhe" é apenas a linha da listagem somada à página de edição? → A:
  **Sem página de detalhe separada** (Opção B) — listagem + página de edição
  são as únicas superfícies de leitura; a página de edição exibe a lista
  ordenada, brinde e saldo quando o administrador decide revisar. Consequência
  direta: o ajuste de estoque (RF20) acontece via **ação na linha da
  listagem** (mesmo padrão da remoção), não em página própria.
>
> **Decisões já resolvidas pelo contrato real** (não são suposições):
> (i) o brinde **nasce com a rota** — é criado embutido no cadastro da rota
> (nome + estoque inicial) e não existe catálogo de brindes independente no
> painel; (ii) o brinde **não é editável** após a criação da rota (nome fica
> fixo; apenas a quantidade em estoque é ajustável); (iii) remover uma rota é
> **arquivamento** com histórico preservado, não exclusão física; (iv) a baixa
> de estoque acontece no backend na concessão ao turista (RF21 — SPE-06, fora
> desta spec), e o painel apenas reflete o saldo retornado pela API
> (Princípio II).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar rota turística com pontos ordenados e brinde de conclusão (Priority: P1)

O administrador acessa a área de rotas do painel e inicia o cadastro de uma
nova rota. Informa nome e descrição, monta a lista ordenada de pontos
turísticos (selecionando pontos do catálogo cadastrado na SPE-03), podendo
adicionar, remover e **reordenar** os pontos livremente, e cria o brinde que o
turista recebe ao concluir a rota (nome do brinde e quantidade inicial em
estoque). Ao salvar, a rota aparece na listagem com o brinde e o saldo de
estoque exibidos.

**Why this priority**: é o núcleo da gamificação (RF18) — sem rota cadastrada
não existe rota para editar/remover, não existe brinde para controlar estoque
nem concessão ao turista (SPE-06 depende desta spec).

**Independent Test**: Pode ser testada criando uma rota com ao menos dois
pontos reordenados e um brinde com estoque inicial, e verificando que a rota
aparece na listagem com os pontos na ordem definida, o brinde e o saldo
informado. Entrega valor sozinha: o cadastro de rotas fica utilizável.

**Acceptance Scenarios**:

1. **Given** administrador autenticado com ao menos um ponto turístico
   cadastrado, **When** preenche nome, descrição, adiciona pontos do catálogo,
   reordena a lista e informa brinde (nome + estoque inicial), **Then** a
   rota é criada e aparece na listagem com a ordem de pontos exatamente como
   definida, com o brinde e o saldo inicial visíveis.
2. **Given** administrador sem pontos cadastrados, **When** abre o formulário
   de cadastro de rota, **Then** a lista de seleção de pontos fica vazia com
   estado de vazio e orientação clara para cadastrar pontos primeiro
   (dependência explícita da SPE-03).
3. **Given** formulário de cadastro aberto, **When** o administrador tenta
   salvar sem nome, sem descrição, sem nenhum ponto na lista ou sem brinde,
   **Then** o salvamento é bloqueado com indicação dos campos inválidos
   (validação por etapa/formulário, coerente com o padrão da SPE-03).
4. **Given** administrador tenta salvar um nome com mais de 200 caracteres ou
   descrição com mais de 2000, **When** envia, **Then** o limite é sinalizado
   antes do envio (o backend pode reforçar; a mensagem final é acionável).

---

### User Story 2 - Visualizar rotas com brinde e saldo de estoque em destaque (Priority: P1)

O administrador acessa a listagem de rotas e vê, para cada rota: nome,
descrição, quantidade de pontos turísticos, o brinde associado e o saldo
disponível em estoque desse brinde, e o status (ativa ou arquivada). O saldo
tem indicação visual inequívoca — quando o estoque está esgotado (zero), o
destaque é imediatamente perceptível. Rotas arquivadas só aparecem quando o
administrador ativa explicitamente a exibição de arquivadas.

**Why this priority**: a listagem é a superfície onde RF20 se materializa para
o operador ("indicação clara de saldo na UI") e o ponto de partida de todas as
ações (editar, ajustar estoque, remover). Sem ela as histórias seguintes não
têm porta de entrada.

**Independent Test**: Pode ser testada com dados de backend reais ou
pré-cadastrados: ver que cada linha distingue ativa × arquivada e que um
brinde com saldo zerado é reconhecido como esgotado sem ler tooltips ou
detalhes. O saldo refletido é o retornado pela API (o painel nunca o calcula).

**Acceptance Scenarios**:

1. **Given** ao menos uma rota ativa cadastrada, **When** o administrador
   abre a listagem de rotas, **Then** cada linha exibe nome, descrição
   (ou resumo ajustado ao espaço), contagem de pontos, brinde, saldo em
   estoque e status.
2. **Given** uma rota cujo brinde tem saldo zero, **When** a listagem é
   exibida, **Then** o saldo zero é sinalizado visualmente como esgotado
   (estado não confundível com saldo positivo).
3. **Given** uma rota removida (arquivada) pelo próprio administrador,
   **When** a listagem é aberta sem exibição de arquivadas, **Then** a rota
   não aparece; **Given** o administrador ativa a exibição de arquivadas,
   **Then** a rota arquivada aparece com sua identificação inequívoca.
4. **Given** a listagem aberta, **When** um funcionário (papel restrito)
   tenta acessar a área de rotas, **Then** a navegação é impedida de forma
   consistente com o RBAC de superfície da SPE-01 (a autorização final é do
   backend, que nega 403).

---

### User Story 3 - Editar rota e reordenar seus pontos (Priority: P2)

O administrador abre uma rota ativa para edição e pode alterar nome,
descrição, adicionar/remover pontos do catálogo e **reordenar** os pontos da
rota. O brinde da rota não é editável (nascido com a rota) — mas o estoque dele
é ajustável pelo controle de estoque (User Story 4). Ao salvar, a nova
ordem e os novos dados ficam visíveis na listagem e na página de edição —
única superfície de leitura da lista ordenada (ver Clarifications; não há
página de detalhe separada).

**Why this priority**: essencial à manutenção do sistema (RF19) — pontos mudam,
horários e percurso são revisados — mas existem rotas para listar e conceder
brindes mesmo sem edição refinada; por isso segue o cadastro.

**Independent Test**: Pode ser testada editando o nome de uma rota,
invertendo a ordem de dois pontos e removendo um ponto, salvando e
confirmando na listagem que a edição foi persistida e que a ordem passou a ser
a nova. Entrega valor sozinha: manutenção de rotas destrava revisões de
percurso.

**Acceptance Scenarios**:

1. **Given** uma rota ativa com pelo menos dois pontos, **When** o
   administrador reordena dois pontos e salva, **Then** a listagem e a
   leitura da rota refletem a nova ordem (ordem 1..n, sem lacunas).
2. **Given** um formulário de edição em que o administrador remove todos os
   pontos da lista, **When** tenta salvar, **Then** salvamento é bloqueado
   (rota exige ao menos um ponto).
3. **Given** o formulário de edição aberto, **When** o administrador busca
   alterar o nome ou o estoque inicial do brinde, **Then** o brinde aparece
   como apenas-leitura com indicação de que alterações de estoque são feitas
   no controle de estoque (histórico: o brinde nasce com a rota).
4. **Given** uma rota arquivada, **When** o administrador tenta editá-la,
   **Then** a ação de edição não é oferecida para rotas arquivadas
   (o backend rejeita edição de rota arquivada; a UI não expõe o caminho que
   levaria ao erro).

---

### User Story 4 - Ajustar o estoque do brinde de uma rota (Priority: P2)

O administrador acessa o controle de estoque do brinde vinculado a uma rota
por uma ação na linha da listagem de rotas (ver Clarifications — não há
página de detalhe) e atualiza a quantidade disponível —
por exemplo, após uma reposição física de brindes. O novo saldo informado é
validado (não pode ser negativo) e a UI passa a exibir o novo saldo retornado
pela API. A baixa automática de estoque durante a concessão ao turista é
executada pelo backend e **não** por este painel — o painel só reflete.

**Why this priority**: RF20 é a metade "estoque" da spec e alimenta RF21
(concessão pelo funcionário). É prioridade 2 porque depende de existirem
rotas com brindes (US1) e é útil por si só, mas o valor imediato do
operador começa no cadastro e na listagem.

**Independent Test**: Pode ser testada ajustando o estoque de um brinde
existente para um valor válido e confirmando que o saldo exibido na listagem
é o novo valor retornado pela API; e tentando ajustar para valor negativo,
recebendo erro acionável.

**Acceptance Scenarios**:

1. **Given** uma rota ativa com brinde, **When** o administrador define um
   novo valor de estoque (inteiro ≥ 0, por exemplo 25) e confirma, **Then** o
   saldo exibido na listagem passa a ser o valor retornado pela
   API.
2. **Given** o ajuste de estoque aberto, **When** o administrador informa
   valor negativo ou não numérico, **Then** a validação bloqueia o envio com
   mensagem clara.
3. **Given** um backend que rejeita o ajuste porque o valor ficaria abaixo
   das reservas já comprometidas em concessões em andamento, **When** a API
   devolve erro de validação, **Then** a UI exibe mensagem acionável
   explicando o porquê, preservando o valor anterior até novo ajuste.
4. **Given** que um funcionário concedeu um brinde a um turista (RF21,
   backend), **When** a listagem de rotas é recarregada, **Then** o saldo
   exibido reflete a baixa efetuada pelo backend — o painel não efetua,
   calcula nem desfaz a baixa.

---

### User Story 5 - Remover (arquivar) uma rota (Priority: P3)

O administrador remove uma rota previamente cadastrada, com confirmação
explícita. A remoção é um arquivamento: a rota deixa de aparecer na listagem
padrão, o histórico é preservado no backend e ela volta a aparecer quando o
administrador lista rotas arquivadas (User Story 2). Rotas arquivadas não
podem ser editadas.

**Why this priority**: RF19 na parte de remoção; valor real (limpar a listagem
de rotas descontinuadas), mas é a operação menos frequente e o sistema já
entrega valor sem ela.

**Independent Test**: Pode ser testada removendo uma rota com confirmação e
verificando que ela desaparece da listagem padrão e reaparece (identificada
como arquivada) com a exibição de arquivadas.

**Acceptance Scenarios**:

1. **Given** uma rota ativa listada, **When** o administrador aciona
   "remover" e confirma explicitamente, **Then** a rota sai da listagem
   padrão e passa a constar como arquivada quando arquivadas são exibidas.
2. **Given** o acionamento de remoção, **When** a confirmação é cancelada,
   **Then** nada muda e a rota permanece listada.
3. **Given** o diálogo de confirmação, **When** o administrador lê a
   mensagem, **Then** ela dá conta do efeito real (arquivamento com histórico
   preservado — não exclusão física de dados usados em concessões).

---

### Edge Cases

- **Ponto turístico da rota foi removido** (remoção de pontos é física na
  SPE-03 e o contrato mantém na rota só o `spotId`): a rota exibe um rótulo
  de fallback identificável ("ponto turístico não encontrado") no lugar do
  nome, sem propagar erro nem ocultar a rota — mesmo padrão consagrado na
  SPE-04. Comportamento real do DELETE de pontos frente a rotas pendentes é
  objeto de **probe obrigatório** do contrato (ver Contrato da API).
- **Estoque esgotado**: a rota continua listada e válida (a concessão ao
  turista é assunto do backend/RF21 — SPE-06); a UI sinaliza esgotado e não
  bloqueia a rota.
- **Ajuste de estoque concorrente com concessão**: o backend garante que o
  ajuste não desça abaixo das reservas comprometidas; a UI exibe erro
  acionável e preserva o valor anterior.
- **Rota arquivada e leitura via API**: administrador lê qualquer estado;
  o backend nega leitura de rota arquivada a não-administradores (404 para
  funcionários) — o painel aplica RBAC de superfície e não oferece a rota a
  funcionários.
- **Erro de rede / API indisponível**: estados de erro distintos e acionáveis
  em listagem, formulário e ajustes de estoque (Princípio V) — nunca tela em
  branco nem spinner infinito.
- **Payload fora do contrato**: dado que não corresponde ao esperado na
  resposta vira erro explícito (parse defensivo, `ContractViolationError`),
  nunca dado silenciosamente aceito (Princípio I).
- **Rota sem pontos válidos no backend** (ponto desconhecido/removido no
  create/edit): a API devolve 404; a UI traduz para mensagem acionável
  indicando qual referência está inválida.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST restringir toda a área de rotas e brindes ao
  papel Administrador na navegação do painel (RBAC de superfície da SPE-01),
  deixando explícito que a autorização final é do backend (403 é traduzido em
  mensagem acionável).
- **FR-002**: O sistema MUST listar as rotas turísticas a partir da API,
  exibindo para cada rota: nome, descrição, quantidade de pontos, brinde
  associado, saldo do brinde em estoque e status (ativa/arquivada).
- **FR-003**: O sistema MUST exibir o saldo de estoque do brinde com indicação
  clara e não ambígua, destacando visualmente o estado esgotado (saldo zero).
- **FR-004**: O sistema MUST refletir o saldo de estoque **exatamente** como
  retornado pela API — o painel NÃO calcula, simula, desfaz ou antecipa a
  baixa de estoque; a baixa na concessão ao turista (RF21) é executada pelo
  backend quando o funcionário concede o brinde.
- **FR-005**: O sistema MUST permitir cadastrar rota informando nome,
  descrição, lista de pontos turísticos (do catálogo da SPE-03) e o brinde
  embutido (nome + estoque inicial), com todos os campos obrigatórios e
  validados no cliente.
- **FR-006**: O sistema MUST permitir montar a lista de pontos da rota —
  adicionar/remover pontos do catálogo e **reordenar** a lista via botões
  subir/descer por item, operáveis com teclado e ponteiro (decisão do owner
  em Clarifications; sem arrastar-e-soltar, sem dependência nova) —
  serializando a ordem final sem lacunas (1..n, mínimo 1 ponto).
- **FR-007**: O sistema MUST aplicar no cliente os limites do contrato:
  nome da rota 1–200 caracteres, descrição 1–2000 caracteres, estoque inicial
  inteiro ≥ 0 — o backend permanece a autoridade (422 traduzido em mensagem
  acionável).
- **FR-008**: O sistema MUST tratar o brinde como nascido com a rota e não
  editável após a criação (nome apenas-leitura na edição da rota; estoque
  ajustável apenas pelo controle de estoque, FR-010).
- **FR-009**: O sistema MUST permitir editar rota ativa: nome, descrição,
  adicionar/remover e reordenar pontos — com o brinde exibido como
  apenas-leitura.
- **FR-010**: O sistema MUST permitir que o administrador ajuste a quantidade
  em estoque do brinde de uma rota (valor inteiro ≥ 0), tratando erro do
  backend (por exemplo, valor abaixo de reservas comprometidas) como mensagem
  acionável com preservação do valor anterior.
- **FR-011**: O sistema MUST exigir confirmação explícita para a remoção de
  rota, com mensagem que descreve o efeito real (arquivamento com histórico
  preservado), e MUST tornar rotas arquivadas não-editáveis na UI.
- **FR-012**: O sistema MUST exibir rotas arquivadas somente quando o
  administrador ativar explicitamente a exibição de arquivadas, identificando
  inequivocamente o status na listagem.
- **FR-013**: O sistema MUST exibir rótulo de fallback identificável
  ("ponto turístico não encontrado") quando um `spotId` de rota não resolver
  no catálogo de pontos, sem propagar erro nem ocultar a rota.
- **FR-014**: O sistema MUST expor estados de carregamento, vazio e erro
  distintos e acionáveis em toda interação com a API (listagem, formulário,
  ajuste de estoque, remoção), com feedback de sucesso nas mutações
  (Princípio V).
- **FR-015**: O sistema MUST tratar payload fora do contrato como erro
  explícito (parse defensivo — `ContractViolationError`), nunca aceitando
  dado silenciosamente (Princípio I).
- **FR-016**: O sistema MUST oferecer acesso por teclado a todas as ações da
  área de rotas — inclusão/remoção de pontos no formulário, reordenação da
  lista de pontos, ajuste de estoque e ações da listagem.

### Key Entities *(include if feature involves data)*

- **Rota turística (TouristRoute)**: identificador, nome (1–200), descrição
  (1–2000), status (ativa/arquivada) e lista **ordenada** de pontos
  (`spotId` + posição `displayOrder` 1..n). Referencia pontos do catálogo da
  SPE-03 apenas por identificador — nomes são resolvidos pela listagem de
  pontos. Criada/editada/arquivada via API; brinde embutido.
- **Brinde (Prize)**: identificador, nome (1–200) e quantidade em estoque
  (inteiro ≥ 0). Nasce **embutido na criação da rota** (nome + estoque
  inicial); após a criação, é apenas-leitura, com alteração apenas da
  quantidade via controle de estoque. O saldo é diminuído pelo backend na
  concessão ao turista (RF21/SPE-06) e pode também estar reservado por
  concessões em andamento — o painel reflete, não gerencia as reservas.
- **Concessão (Redemption)** — fora de escopo desta spec (RF21/SPE-06):
  citada apenas porque o backend executa a baixa de estoque devida a ela; o
  saldo exibido no painel reflete essas baixas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O administrador cadastra uma rota completa — com pelo menos
  três pontos turísticos reordenados e um brinde com estoque inicial — em
  menos de 3 minutos, sem erro de validação ao submeter dados válidos.
- **SC-002**: Um operador identifica o saldo em estoque do brinde de
  qualquer rota listada em menos de 5 segundos, e distingue estoque esgotado
  (zero) de estoque positivo na listagem sem ler mensagens auxiliares, em
  100% dos casos.
- **SC-003**: Após qualquer cadastro ou edição que altera a ordem de pontos,
  a ordem exibida na página de edição (única superfície de leitura da lista
  ordenada — ver Clarifications) é exatamente a ordem definida pelo
  administrador, em 100% dos casos.
- **SC-004**: Após um ajuste de estoque confirmado, o novo saldo é exibido na
  listagem em menos de 2 segundos (refletindo o valor retornado pela API).
- **SC-005**: 100% das remoções de rota passam por confirmação explícita e
  tornam a rota arquivada (reaparecendo somente com arquivadas exibidas),
  nunca exclusão física silenciosa.
- **SC-006**: Todo estado de carregamento, vazio e erro é distinto e
  apresentado com mensagem acionável em 100% das interações de listagem e
  formulário da área (Princípio V).
- **SC-007**: A ordem de implementação declarada em `docs/SPECS.md` (SPE-05
  depende da SPE-03) é respeitada: o seletor de pontos consome o catálogo da
  SPE-03 e o compare de contrato contra o Swagger é executado antes de
  encerrar a feature (Governança 5).

## Contrato da API *(obrigatório pela Constituição — Princípio I)*

Verificado contra o OpenAPI real da API FastAPI (tag `Gamification`),
disponível no servidor definido em `API_BASE_URL` (ex.: `http://localhost:8010`,
prefixo `/api/v1`). O arquivo detalhado que materializa este resumo em
`contracts/gamification-api.md` pode ser gerado/atualizado no plan.

**1. Rotas** — base `/gamification/routes`:

- `POST /gamification/routes` (RF18) — corpo
  `RouteCreateRequest`: `{ name, description, spots: [{ spotId, displayOrder }], prize: { name, initialStock } }`,
  todos obrigatórios; `spots` não pode ser vazio (mínimo 1). Respostas:
  201 + `TouristRouteView`; 403/401 (não administrador); 404 (ponto
  desconhecido/removido); 422 (payload inválido).
- `GET /gamification/routes` — lista de rotas
  `{ items: [RouteSummaryView: { id, name, description, spotCount, prize: { id, name, stockQuantity }, status }] }`,
  sem paginação nesta versão (YAGNI). Query `includeArchived` (padrão
  `false`), admin-only. RF19 arquivamento fica visível por aqui.
- `GET /gamification/routes/{route_id}` — detalhe (leitura da API)
  `TouristRouteView`: `{ id, name, description, spots: [{ spotId, displayOrder }], prize: { id, name, stockQuantity }, status }`.
  O painel consome este retorno para carregar a página de edição — não há
  página de detalhe na UI (ver Clarifications). Observação: os pontos do
  retorno trazem apenas `spotId` + `displayOrder` —
  os nomes devem ser resolvidos pelo catálogo de pontos (SPE-03), com rótulo
  de fallback quando o ponto não existir mais (FR-013).
- `PATCH /gamification/routes/{route_id}` (RF19, edição) — corpo
  `RouteUpdateRequest` com **todos os campos opcionais**:
  `{ name?, description?, spots? }`; `spots` informada é revalidada (mín. 1).
  O **brinde não é editável** aqui (nasce com a rota; estoque muda
  exclusivamente pelo endpoint de ajuste de estoque). Respostas: 200 +
  `TouristRouteView`; 404 (rota desconhecida/**arquivada** ou ponto
  inválido); 422.
- `DELETE /gamification/routes/{route_id}` (RF19, remoção) — **arquivamento**
  com histórico preservado (não exclusão física). 204; 404 (desconhecida).
- `PATCH /gamification/prizes/{prize_id}` (RF20, ajuste de estoque) — corpo
  `PrizeStockUpdateRequest`: `{ stockQuantity }` (inteiro ≥ 0). Respostas:
  200 + `RoutePrizeView`; 404; 422 (negativo **ou abaixo das reservas
  comprometidas** — guarda no backend).
- Não há `POST /prizes` nem `GET /prizes` no contrato: o brinde é criado
  embutido na rota e lido embutido nas rotas — não existe catálogo
  independente de brindes no painel.

**2. Concessão (fora do escopo desta spec — RF21/SPE-06)** —
`POST /gamification/redemptions` (funcionário): o backend valida o código e
**efetua a baixa no estoque**; 409 quando código já usado ou estoque
insuficiente. O painel administrativo apenas reflete os saldos resultantes
(FR-004).

**3. Estados e probes pendentes** — `status` da rota (valores exatos ativa ×
arquivada) e mensagens de erro do backend ainda devem ser confirmados por
**probe em sessão administrador real** durante o plan/implement (padrão
adotado desde a SPE-02/SPE-03/SPE-04), atualizando este contrato e as
mensagens da UI antes de encerrar a feature. Comportamento do DELETE de
pontos (SPE-03) frente a rotas que referenciam pontos também entra nesse
probe (Edge Case 1).

## Assumptions

- **Formato do formulário**: cadastro e edição de rota em **página dedicada
  com rota própria** do App Router — decidido pelo owner na clarificação
  desta sessão (ver Clarifications), reafirmando o padrão da SPE-04 que é
  mais recente que o wizard em diálogo da SPE-03.
- **Brinde nasce com a rota**: "cadastro de brindes" (RF20) acontece embutido
  no cadastro da rota (nome + estoque inicial), conforme o contrato real —
  não há cadastro de brindes independente na UI.
- **Catálogo de pontos completo**: para alimentar o seletor de pontos do
  formulário, o painel carrega todas as páginas do catálogo da SPE-03
  (mesma solução da SPE-04 para o seletor de eventos — volumes acadêmicos).
- **Esgotado vs baixo**: a indicação visual obrigatória cobre apenas o
  estado esgotado (saldo 0) — decidido pelo owner nesta sessão (ver
  Clarifications); saldo positivo aparece como número normal, e um estado
  "estoque baixo" fica para um refinamento futuro, sem impacto no contrato.
- **Sessão e infraestrutura**: autenticação, RBAC de superfície, túnel BFF e
  componentes de `src/shared/components` herdados de SPE-01–03 são reusados
  sem recriação (Princípio IV); `pnpm build` e `pnpm lint` sem erros fazem
  parte do pronto (Constraint 6).
- **Dependência de dados**: a listagem de rotas sem nenhum ponto cadastrado
  ainda funciona (rotas existentes continuam listadas); apenas o cadastro de
  novas rotas depende do catálogo de pontos (SPE-03).
