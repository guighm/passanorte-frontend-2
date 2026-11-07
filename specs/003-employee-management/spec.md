# Feature Specification: Gerenciamento de Funcionários (SPE-02)

**Feature Branch**: `003-employee-management`

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "Gerenciamento de funcionários do painel PassaNorte, cobrindo RF04 e RF05 de docs/SYSTEM_REQUIREMENTS.md. Somente o administrador acessa esta área (RBAC já implementado pela SPE-01, deve ser reforçado aqui). Listagem em tabela (reusar o componente DataTable de src/shared/components), formulário de cadastro com geração de credenciais de acesso restrito pelo backend (credenciais exibidas uma única vez na UI, após criação), edição dos dados cadastrais e revogação de acesso (desativação da credencial). Deixar explícito na spec: o funcionário criado deve receber papel restrito sem acesso a cadastro de pontos turísticos e ao dashboard (RF03). Consumir os endpoints de funcionários conforme o contrato OpenAPI da API FastAPI, com estados de carregamento, erro e confirmações para ações destrutivas."

> **Nota de escopo (constituição):** conforme Princípio I da
> `../../.specify/memory/constitution.md`, a seção "Contrato da API" abaixo é
> conteúdo obrigatório de spec do projeto PassaNorte e substitui a diretriz
> genérica de ausência de detalhes técnicos — é um contrato de negócio
> consumido pelo backend, não uma decisão de implementação do frontend
> (Princípio II). Do mesmo modo, a referência a `DataTable`
> (`src/shared/components`) é decisão já ratificada pela constituição
> (Princípio IV — reuso de componentes transversais antes de criar novos) e
> não uma escolha de implementação desta spec. Demais requisitos e critérios
> de sucesso permanecem agnósticos de tecnologia.

## Clarifications

### Session 2026-11-06

- A API FastAPI real ("Passanorte API") já está acessível em
  `http://localhost:8010` (established pela SPE-01 em 2026-11-06) e o
  OpenAPI (`GET /openapi.json`) **já contém os endpoints de funcionários**
  (`/api/v1/employees`). O contrato registrado em "Contrato da API" abaixo
  foi extraído diretamente do OpenAPI real nesta data — não há contrato
  "esperado" inventado nesta feature; pendências pontuais estão listadas ao
  fim da seção.
- Q: A reativação de funcionários revogados deve ficar disponível na
  interface desta feature, ou ela entra na spec mas é cortada da UI nesta
  fase? → A: Option A — manter na UI (como está no US4/FR-012): o backend já
  expõe a reativação no contrato (`status: "active"`) e ela completa o ciclo
  de vida do acesso; decisão final, sem corte de escopo desta fase.
- Q: Como resolver o valor exato que o campo `status` assume quando um
  funcionário é revogado (o OpenAPI tipa `status` como string livre e
  documenta apenas a constante `"active"`)? → A: Option A — confirmar por
  **probe na API real** (agendado para o início da implementação — task T005
  de `tasks.md`, antes das tasks de UI): revogar um funcionário de
  teste com sessão de administrador e observar o valor retornado (e o
  comportamento de re-revogação), no mesmo padrão com que a SPE-01
  confirmou os valores de `role` por login real. Registre o valor aqui e em
  `contracts/employees-api.md` quando confirmado.
- Q: Ao editar o nome de usuário de um funcionário, o painel deve avisar
  explicitamente que a credencial de login muda (o funcionário passa a
  autenticar com o novo nome de usuário)? → A: Option A — sim: aviso no
  diálogo de edição quando o valor do nome de usuário for alterado (pode ser
  uma linha de texto sob o campo), alinhando o operador com o efeito real —
  editar o nome de usuário é reemissão da credencial — antes de salvar.
- Q: Dado que a API retorna os funcionários sem parâmetro de ordenação e não
  define ordem garantida, como a tabela da listagem deve apresentar os
  itens? → A: Option C — ordem alfabética por nome, aplicada na exibição
  (client-side); estável entre revalidações (linhas não "pulam" enquanto o
  administrador lê/age) e a forma previsível de localizar um funcionário por
  nome — suporte direto ao SC-005.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Listagem de funcionários (Priority: P1)

O administrador abre a área de funcionários do painel e vê a tabela de todos
os funcionários cadastrados: nome, usuário (credencial de login), status do
acesso (ativo ou revogado) e datas de criação/atualização, com o total
exibido. Enquanto a consulta está em curso, vê um estado de carregamento
distinto; se nenhum funcionário existe, vê um estado de vazio acionável (com
indicação de cadastrar o primeiro); se a consulta falha, vê um estado de erro
explícito com possibilidade de tentar novamente.

**Why this priority**: a listagem é a base da área — administração (editar,
revogar) e percepção do resultado do cadastro dependem dela; é também o
menor pedaço de valor entregável da feature (visibilidade de quem tem acesso
ao sistema).

**Independent Test**: autenticar como administrador, abrir a área de
funcionários e observar a tabela, seus estados (carregando/vazio/erro,
forçando cada um) e o conteúdo refletido da API. Entrega valor sozinho: o
administrador passa a ver quem tem acesso.

**Acceptance Scenarios**:

1. **Given** administrador autenticado com funcionários cadastrados, **When**
   abre a área de funcionários, **Then** vê a tabela com todos os funcionários
   retornados pela API (nome, usuário, status, datas), o total correspondente
   e um indicador visual distinto para status ativo e status revogado.
2. **Given** a consulta está em curso, **When** a tabela ainda não tem dados,
   **Then** o estado de carregamento é visível e distinto (nenhum flash de
   "sem dados" antes da resposta).
3. **Given** a API não retorna nenhum funcionário, **When** a consulta
   conclui, **Then** o estado de vazio é exibido com chamada acionável para o
   cadastro do primeiro funcionário.
4. **Given** a consulta falha (API indisponível ou erro), **When** a
   resposta chega, **Then** o estado de erro é exibido com mensagem
   acionável e o administrador pode tentar a consulta novamente; a tela não
   fica travada sem indicação.

---

### User Story 2 - Cadastro de funcionário com credencial gerada pelo backend (Priority: P1)

O administrador aciona o cadastro, informa nome e nome de usuário (sem
qualquer campo de senha ou papel) e confirma. Após a criação, o painel exibe
**uma única vez** a credencial de acesso gerada pelo backend (nome de usuário
e senha inicial), em uma visualização clara e copiável, com aviso explícito
de que a senha não será exibida novamente — o administrador deve repassá-la
ao funcionário nesse momento. O novo funcionário recebe automaticamente o
papel restrito: acessa apenas a concessão de benefícios, sem cadastro de
pontos turísticos e sem dashboard (RF03/RF04) — atribuição feita pelo
backend, não pelo painel.

**Why this priority**: é o coração do RF04 — sem ele o sistema não admite
novos funcionários; a exibição única da senha é a parte sensível de
segurança (Princípio V, RNF10) e precisa ser testada com o mesmo rigor do
cadastro em si.

**Independent Test**: cadastrar um funcionário com nome e usuário válidos,
observar dados na listagem e a exibição única da credencial; recarregar a
página e confirmar que a senha não é visível em nenhum lugar. Entrega valor
sozinho: a criação de acesso restrito.

**Acceptance Scenarios**:

1. **Given** administrador com formulário preenchido (nome válido, nome de
   usuário válido), **When** confirma o cadastro, **Then** vê feedback de
   carregamento durante o envio e, ao sucesso, a visualização única da
   credencial (usuário + senha gerada pelo backend), com o botão/ação de
   copiar e o aviso de não-reexibição.
2. **Given** a visualização única está aberta, **When** o administrador a
   fecha (ou recarrega/navega), **Then** a senha inicial não é exibida de
   novo em nenhum ponto do painel — nem na listagem, nem em edição, nem em
   histórico; o aviso deixou isso claro antes de fechar.
3. **Given** o cadastro bem-sucedido, **When** a listagem é consultada,
   **Then** o novo funcionário aparece como ativo e o painel não ofereceu
   campo algum para escolher papel (o papel restrito foi atribuído pelo
   backend).
4. **Given** envio com nome de usuário inválido (fora das regras do
   contrato) ou já existente, **When** o backend recusa, **Then** erro
   explícito e acionável é exibido junto ao formulário, sem perder os dados
   digitados, e nenhuma credencial parcial é apresentada.

---

### User Story 3 - Edição dos dados cadastrais (Priority: P2)

O administrador abre a edição de um funcionário ativo da listagem, altera nome
e/ou nome de usuário e confirma. O painel envia a alteração para a API e a
listagem reflete o resultado imediatamente.

**Why this priority**: mantém os dados cadastrais corretos (RF05), mas não
bloqueia nem o cadastro nem a revogação; depende apenas da listagem.

**Independent Test**: editar nome e usuário de um funcionário existente,
confirmar, verificar resposta do backend e reflexo imediato na listagem;
tentar salvar um usuário inválido/duplicado e observar erro acionável.

**Acceptance Scenarios**:

1. **Given** funcionário ativo selecionado, **When** o administrador altera
   quaisquer dos campos editáveis e confirma, **Then** o painel envia apenas
   os campos alterados, mostra carregamento durante o envio e, ao sucesso, a
   listagem reflete os novos dados sem recarregar a página inteira.
2. **Given** envio recusado pelo backend (validação ou conflito), **When** a
   resposta chega, **Then** erro explícito e acionável é exibido junto ao
   formulário, os dados digitados permanecem e nada muda na listagem.
3. **Given** funcionário revogado, **When** o administrador abre a edição,
   **Then** os campos cadastrais permanecem editáveis (a revogação não é
   perda dos dados), com o estado de acesso claramente sinalizado.

---

### User Story 4 - Revogação e reativação de acesso (Priority: P2)

O administrador revoga (P2) o acesso de um funcionário da listagem (ou da
tela de detalhe/edição, se a estrutura da tela o favorecer): uma confirmação
explícita nomeia quem perderá o acesso e o efeito (a credencial deixa de
validar login). Após a confirmação, o status do funcionário muda para
revogado na listagem. O administrador também pode reativar um funcionário
revogado, também com confirmação explícita (devolver acesso é ação sensível),
restaurando o status ativo.

**Why this priority**: completa o RF05 — a desativação é a "remoção" do
requisito (a spec não contempla exclusão física de registro na API); depende
da listagem, mas não do cadastro nem da edição.

**Independent Test**: revogar um funcionário ativo com confirmação, observar
status na listagem e validação do efeito (sessões do funcionário passam a
ser recusadas pelo backend); reativar o mesmo funcionário e observar status
ativo.

**Acceptance Scenarios**:

1. **Given** funcionário ativo, **When** o administrador aciona revogação e
   confirma o diálogo (que nomeia nome/Usuário do funcionário e o efeito),
   **Then** o painel envia a operação, mostra carregamento e, ao sucesso, a
   listagem exibe o funcionário como revogado.
2. **Given** o diálogo de confirmação aberto, **When** o administrador
   cancela, **Then** nada muda (nenhuma operação é enviada, status permanece
   ativo) — revogação nunca acontece em um clique.
3. **Given** funcionário revogado, **When** o administrador aciona
   reativação e confirma, **Then** o painel envia a reativação e, ao
   sucesso, a listagem exibe o funcionário como ativo novamente.
4. **Given** a operação de revogação/reativação falha no backend, **When** a
   resposta chega, **Then** erro explícito é exibido, o status permanece
   como estava e o diálogo de confirmação não é reaberto sozinho.

---

### Edge Cases

- Nome de usuário duplicado no cadastro (ou conflito no PATCH): erro
  explícito do backend apresentado junto ao formulário; nenhuma resposta
  parcial é interpretada como sucesso.
- Nome de usuário fora das regras do contrato (menor que o mínimo ou acima
  do máximo): validação da UI reproduz as regras do contrato e recusa antes
  do envio; recusas do backend também são apresentadas claramente.
- Sessão do administrador expira no meio de uma operação (criação/PATCH/revogação):
  o fluxo de renovação da fundação (SPE-01) cobre de forma transparente; se
  indisponível, o operador é informado de que a ação não foi concluída,
  sem perda silenciosa — e nenhuma credencial é considerada "criada" sem
  resposta de sucesso, pois a senha gerada não pode ser reexibida.
- Funcionário alvo de nova revogação quando já está revogado: o backend decide o comportamento (204 idempotente ou erro);
  o painel apenas reflete o resultado e mantém a listagem consistente com a
  resposta (comportamento exato registrado como pendência em "Contrato da
  API").
- Resposta da API divergente do contrato registrado (campo faltante, tipo
  inesperado, status desconhecido): falha explícita de contrato na operação,
  nunca dado silenciosamente aceito ou status inventado (Princípio I).
- Listagem não filtra nem pagina no servidor (contrato não oferece
  parâmetros): o painel apresenta todos os itens retornados; volume
  grande demais para a tela é tratado como limite apresentado, não como
  falha silenciosa (ver Assumptions).
- Acesso de funcionário à área por endereço: os guardas da SPE-01 redirecionam
  antes de qualquer chamada; mesmo que o backend respondesse
  dados de funcionários a uma sessão de funcionário (divergência de
  autorização backend), o painel não renderiza a área — e 403 de qualquer
  chamada é tratado como estado de erro da ação, nunca como exceção
  silenciosa (Princípio II).
- Credencial perdida pelo funcionário (senha inicial não registrada por quem
  a recebeu): o contrato não oferece reset de senha — limitação conhecida,
  registrada em "Contrato da API" (pendência); o painel não inventa mecanismo
  de recuperação.

## Requirements *(mandatory)*

### Functional Requirements

**Acesso e proteção da área (RF03/RF04)**

- **FR-001**: a área de funcionários MUST estar sob as rotas
  administrativas do painel, com o reforço dos guardas de papel da
  SPE-01: operador funcionário é redirecionado à sua área permitida antes
  de qualquer renderização ou chamada, e o item da navegação só aparece
  para administrador (RBAC de superfície; a autorização final é sempre do
  backend — Princípio II).
- **FR-002**: o painel NÃO DEVE enviar campo algum de papel ou permissão
  em qualquer operação de funcionário: a atribuição do papel restrito
  (acesso apenas à concessão de benefícios; sem cadastro de pontos
  turísticos e sem dashboard — RF03/RF04) é exclusiva do backend, que o
  faz na criação conforme o contrato. O painel reflete o resultado; se o
  backend atribuir papel divergente, é defeito do backend — o painel não
  compensa nem decide autorização no cliente.

**Listagem (RF04/RF05, suporte)**

- **FR-003**: o painel MUST listar os funcionários em tabela reusando o
  componente transversal `DataTable` (`src/shared/components`), exibindo ao
  menos: nome, nome de usuário, status do acesso e datas de
  criação/atualização, com o total retornado pela API visível (Princípio
  IV — sem duplicar componente de tabela). A exibição MUST ordenar
  alfabeticamente por nome, de forma estável entre revalidações (a API não
  define ordem garantida — contrato sem parâmetro de ordenação).
- **FR-004**: o painel MUST exibir, de forma distinta e visível, os estados
  de carregamento, vazio e erro da listagem (Princípio V): carregamento
  durante a consulta; vazio acionável (cta para o cadastro) quando nada é
  retornado; erro com nova tentativa quando a consulta falha.
- **FR-005**: a listagem MUST revalidar (recarregar do backend) após toda
  operação bem-sucedida de criação, edição, revogação ou reativação — a
  tela reflete sempre o estado retornado pela API, nunca um estado
  otimista não confirmado.

**Cadastro (RF04)**

- **FR-006**: o painel MUST oferecer formulário de cadastro com exatamente
  dois campos: nome e nome de usuário — NÃO DEVE oferecer campo de senha
  (nem sugerir/validar senha), pois a senha é gerada pelo backend (Princípio
  II, RNF10: senha em texto plano nunca é criada pelo frontend).
- **FR-007**: a UI MUST validar os campos conforme as regras do contrato
  (limites de tamanho e mínimo do nome de usuário) antes do envio e
  apresentar erro explícito e acionável junto ao formulário quando o
  backend recusar (incluindo nome de usuário já existente), preservando os
  dados digitados.
- **FR-008**: após criação bem-sucedida, o painel MUST exibir a credencial
  (nome de usuário + senha inicial gerada pelo backend) em uma
  visualização de exibição única — com ação de copiar e aviso claro de que
  a senha não será exibida novamente — e NÃO DEVE exibi-la novamente em
  nenhum outro ponto (listagem, edição, histórico) nem mantê-la em
  qualquer armazenamento local (Princípios III e V).

**Edição (RF05)**

- **FR-009**: o painel MUST permitir editar os dados cadastrais de um
  funcionário (nome e/ou nome de usuário) com envio parcial — apenas os
  campos alterados — e refletir o retorno da API na listagem; nenhum outro
  campo (status, credenciais) é editável por essa operação. Quando o nome
  de usuário for alterado, o painel MUST avisar explicitamente no diálogo
  de edição que a credencial de login muda (o funcionário passará a
  autenticar com o novo nome de usuário) — editar o nome de usuário é
  reemissão da credencial.

**Revogação e reativação (RF05)**

- **FR-010**: o painel MUST oferecer revogação de acesso de um funcionário
  por operação dedicada, sempre precedida de diálogo de confirmação
  explícito que identifique o funcionário (nome e usuário) e o efeito (a
  credencial deixa de validar login); revogação NUNCA acontece em um clique
  direto (Princípio V).
- **FR-011**: o painel MUST indicar na listagem, de forma visualmente
  distinta, o status ativo e o status revogado de cada funcionário.
- **FR-012**: o painel MUST permitir reativar um funcionário revogado
  (restauração do status ativo, conforme contrato), também com confirmação
  explícita — devolver acesso é ação sensível à segurança.
- **FR-013**: a "remoção" do RF05 é a revogação de credencial: o painel
  NÃO DEVE expor exclusão física de registro de funcionário (o contrato
  não a oferece).

**Estados de erro e contrato (transversal)**

- **FR-014**: toda operação da área (consulta, criação, edição, revogação,
  reativação) MUST apresentar carregamento e erro de forma distinta e
  visível (Princípio V); erros do backend seguem o payload unificado
  registrado em "Contrato da API" e são apresentados com mensagem
  acionável — nunca mensagens técnicas internas brutas.
- **FR-015**: resposta em formato divergente do contrato registrado
  (campo ausente, tipo inesperado, status desconhecido) MUST virar erro
  explícito da operação, registrado como divergência a corrigir — nunca
  dado silenciosamente aceito (Princípio I).
- **FR-016**: o painel MUST funcionar por teclado, com rótulos acessíveis
  em formulários e diálogos de confirmação, e com textos da UI em
  português (convenção do projeto; constituição, Constraint 5).

### Key Entities *(include if feature involves data)*

- **Funcionário**: registro de acesso administrativo de nível restrito
  gerenciado pelo backend — identificador, nome, nome de usuário (credencial
  de login), status do acesso (ativo ou revogado) e datas de
  criação/atualização. A listagem e a edição tratam exatamente esses
  campos; a credencial de senha nunca faz parte dele no painel (só aparece
  uma vez, na criação).
- **Credencial gerada (efêmera)**: par usuário + senha inicial devolvido
  pelo backend **apenas na resposta de criação**; existe para ser
  repassado ao funcionário em uma única ocasião. O painel não armazena,
  não reexibe e não permite regenerar (contrato atual); perda da senha é
  limitação registrada em "Contrato da API".
- **Status do acesso**: ativo (credencial válida) ou revogado (credencial
  desativada); a revogação não apaga os dados cadastrais. Reativação é
  explícita e confirmada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: um administrador conclui o cadastro de um funcionário
  (abertura do formulário ao aviso de credencial exibida) em menos de 1
  minuto, e a listagem exibe o novo funcionário como ativo imediatamente
  após fechar a visualização única.
- **SC-002**: a senha inicial é exibida exatamente uma vez em 100% dos
  cadastros — verificado que nenhuma tela, listagem ou log do painel a
  reexibe ou persiste após o fechamento da visualização única (Princípio III).
- **SC-003**: 100% das operações de revogação e reativação exigem diálogo de
  confirmação que nomeia o funcionário e o efeito; nenhuma dessas ações é
  executada em um clique direto.
- **SC-004**: 100% das tentativas de um operador funcionário de alcançar a
  área de funcionários (navegação ou endereço) resultam em redirecionamento
  à área permitida, sem renderização da página bloqueada (RF03 reforçado).
- **SC-005**: um administrador localiza um funcionário específico na
  listagem em menos de 10 segundos, com status do acesso (ativo/revogado)
  legível a olho nu, sem recorrer à API manualmente.
- **SC-006**: toda requisição da área tem estado de carregamento, erro ou
  sucesso visível e distinto; nenhuma operação fica "travada" sem feedback,
  e nenhuma resposta divergente do contrato é aceita silenciosamente (amostra
  de todos os cenários de US1–US4 e bordas).

## Assumptions

- **API real acessível (2026-11-06):** a "Passanorte API" rodando em
  `http://localhost:8010` já expõe os endpoints de funcionários
  (`/api/v1/employees`) — o contrato registrado nesta spec foi extraído
  diretamente do OpenAPI real nesta data, não inventado (Princípio I). O
  compare campo a campo pendente na governança aplica-se a divergências
  futuras do backend, não ao baseline desta spec.
- **Volume:** funcionários são poucos (ordem de dezenas); o contrato não
  oferta filtro nem paginação no servidor e o painel exibe a lista completa.
  Volume que degrade a tela é tratado como limite conhecido, não motivo de
  inventar endpoints (Princípio I).
- **Sem exclusão física:** o RF05 ("remoção") é atendido pela revogação de
  credencial — nada da API ou da spec apaga o registro do funcionário.
- **Papel restrito automático:** toda criação via esta área produz
  funcionário de papel restrito (`employee`, valores de papel confirmados na
  SPE-01); o painel não cria administradores nesta feature (a credencial de
  administrador é do script de backend, RF01/RF02 — fora de escopo).
- **Identificação na listagem:** nome e nome de usuário bastam para
  identificar o funcionário na tabela; não há foto/e-mail no contrato.
- **Textos da UI em português** (convenção do projeto); chaves/rotas em
  inglês.
- A reativação, embora além do enunciado literal do RF05, está no contrato
  do backend (`status: "active"`) e foi **decidida como incluída na UI**
  (clarificação 2026-11-06) por completude do ciclo de vida do acesso.

## Contrato da API *(extraído do OpenAPI real — "Passanorte API" em `http://localhost:8010`, 2026-11-06; Princípio I da constituição)*

> Autenticação de todas as rotas: security scheme global
> `Authorization: Bearer <accessToken>` (anexado apenas server-side,
> via `src/shared/lib/http.ts` ou túnel BFF — Constraint 5 da constituição).
> Erros do backend: payload unificado `ApiError { errorCode, message,
> details }`; exceção documentada: 422 usa `HTTPValidationError` padrão do
> FastAPI. Campos em camelCase. Sessão de funcionário (papel `employee`)
> nessas rotas ⇒ 403 tratado como estado de erro da ação (Princípio II).

**GET `/api/v1/employees`** — listagem completa de funcionários.

- Sem parâmetros de query (sem filtro, sem paginação — ver Assumptions).
- 200 → `EmployeeListResponse`:
  `{ "items": [EmployeeView], "total": <int> }`
- `EmployeeView` (também corpo de GET/PATCH individual):
  `{ "id": <int>, "name": <string>, "username": <string>,
     "status": <string>, "createdAt": <string>, "updatedAt": <string> }`
  — **sem campo de senha** em qualquer view.

**POST `/api/v1/employees`** — cria funcionário com credencial gerada pelo
backend.

- Request: `{ "name": <string, 1–200>, "username": <string, 3–100> }`
  — **não há campo de senha nem de papel por design** ("no password field
  by design (system-generated)", na descrição do schema): o backend gera a
  senha e atribui o papel restrito (RF03/RF04).
- 201 → `EmployeeCreatedResponse`: `EmployeeView` +
  `initialPassword: <string>` — a senha inicial é devolvida **apenas nesta
  resposta** ("one-time initial password"); o painel a exibe uma única vez
  (FR-008) e nunca mais (não há operação de reexibição ou reset).
- 422: corpo inválido → `HTTPValidationError` (recusas de negócio, ex.
  nome de usuário duplicado, chegam como erro do backend — `errorCode`
  exato a registrar no compare — ver Pendências).

**GET `/api/v1/employees/{employee_id}`** — detalhe de um funcionário.

- Path: `employee_id` (inteiro).
- 200 → `EmployeeView`. (O painel pode usá-lo para edições ancoradas, mas
  a listagem já traz tudo de que a área precisa.)

**PATCH `/api/v1/employees/{employee_id}`** — edição de dados cadastrais e
reativação.

- Request (parcial, campos opcionais): `{ "name"?: <string, 1–200>,
  "username"?: <string, 3–100>, "status"?: "active" }` — `status` só
  aceita a constante `"active"` (descrição do schema: "reactivation only
  via status=active"); a revogação NÃO é feita por PATCH.
- 200 → `EmployeeView` atualizado; 422: corpo/path inválido.

**POST `/api/v1/employees/{employee_id}/revoke`** — revogação de acesso
(desativação da credencial).

- Sem corpo; path `employee_id` (inteiro).
- 204 sem corpo; efeito: credencial deixa de validar login — o backend é o
  responsável pelo efeito sobre sessões vigentes do funcionário (Princípio
  II); o painel apenas reflete o novo status.

**Segurança e privacidade no consumo (Princípios II e III)**

- A senha inicial transita uma única vez (resposta de criação → exibição
  única): NUNCA em logs do frontend, `localStorage`/`sessionStorage`,
  caches de query persistentes ou relatórios de erro que ecoem payloads
  (RNF08/RNF10).
- Hash e validação de senha são do backend (RNF10); o painel nunca vê hash,
  nunca compara, nunca gera senha.
- Ações administrativas desta área precisam estar em log de auditoria do
  backend (RNF19) — o painel não registra auditoria para o backend; a UI
  informa ao operador o resultado das ações, ponto final.

**Pendências (a confirmar contra a API — não bloqueiam implementação, são
registradas aqui e resolvidas em `/speckit-plan` ou no compare obrigatório)**

- ~~Valor exato do `status` revogado~~ — **RESOLVIDO por probe (2026-11-06,
  sessão admin real, task T005)**: `status: "revoked"`; re-revogação → 204
  idempotente; username duplicado → **409, `errorCode: "conflict"`**; id
  inexistente → **404, `errorCode: "resource_not_found"`**; timestamps →
  ISO date-time `…Z`. Registrado em contracts/employees-api.md, types
  (`EMPLOYEE_STATUS_REVOKED`) e messages — compare concluído (governança 5).
- Reset/renovação de credencial: **continua inexistente** — limitação.
- Reset/renovação de credencial (caso "senha inicial perdida"): não existe
  no contrato atual — limitação conhecida; se o backend adicionar, é emenda
  desta spec antes de qualquer uso no painel.
