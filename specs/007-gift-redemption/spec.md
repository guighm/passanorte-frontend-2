# Feature Specification: Concessão de Brindes — Área do Funcionário (SPE-06)

**Feature Branch**: `007-gift-redemption`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "Fluxo de concessão de brindes para funcionários do painel PassaNorte, cobrindo RF21 de docs/SYSTEM_REQUIREMENTS.md. Deve ser a área de acesso exclusivo do funcionário (RBAC da SPE-01 — o funcionário não vê dashboard nem gestão de pontos/eventos/rotas). Funcionalidade: leitura do código único de resgate gerado pelo turista ao concluir uma rota (RF36, no app do turista) — suporte a leitura por câmera (scanner de QR code/barra) e entrada manual do código como alternativa. Ao ler o código, a API valida e retorna rota concluída, brinde correspondente e disponibilidade em estoque; a UI apresenta esses dados para conferência antes da confirmação do funcionário. Após confirmar, o backend concede o brinde, aplica a baixa automática no estoque e invalida o código — tratar na UI os desfechos: sucesso, código inválido/já utilizado, rota não concluída e brinde sem estoque. Definir o contrato esperado dos endpoints de validação/concessão a partir do Swagger da API FastAPI."

> **Nota de escopo (constituição):** conforme Princípio I da
> `../../.specify/memory/constitution.md`, a seção "Contrato da API" abaixo é
> conteúdo obrigatório de spec do projeto PassaNorte. A concessão
> (`POST /gamification/redemptions`) já está **verificada contra o Swagger
> real** da API FastAPI (tag `Gamification`, servidor em `API_BASE_URL`); a
> **validação** do código ainda não tem endpoint publicado no Swagger e entra
> como **contrato esperado** a ser implementado/confirmado pelo backend
> (padrão constitucional, item Governança 5). Reuso sancionado pelo
> Princípio IV: guardas de papel da SPE-01, catálogo de pontos da SPE-03
> (seletor do ponto de retirada) e estados de UI de `src/shared/components`.
> Demais requisitos e critérios de sucesso permanecem agnósticos de tecnologia.

## Clarifications

### Session 2026-11-10

- Q: O endpoint de validação de código (etapa de conferência que exibe rota,
  brinde e estoque sem consumir o código) não existe no Swagger real — como o
  painel deve tratá-lo? → A: **Contrato esperado + mocks temporários** (Opção
  A, padrão constitucional da SPE-01): a UI é construída contra
  `POST /gamification/redemptions/validate` como baseline com mocks
  marcados; o compare de contrato contra o Swagger real é obrigatório antes
  de encerrar a feature (Governança 5) — a etapa de conferência do RF21 não é
  sacrificada nem feature é bloqueada à espera do backend.
- Q: Quão forte deve ser a confirmação da concessão, além da conferência
  visual dos dados na tela? → A: **Digitar o código do resgate** (Opção B) —
  a redigitação do código exibido em conferência habilita o botão de
  confirmar: confere o vínculo com o turista que está na frente, não depende
  de interpretar nomes de brinde repetidos e mantém o ciclo dentro do alvo de
  SC-001 (a concessão errada é irreversível pelo painel — o toque único
  seria o risco residual).
- Q: O ponto de retirada da concessão deve ser selecionado em cada atendimento
  ou lembrado de uma seleção única na sessão do funcionário? → A: **Seleção
  obrigatória a cada atendimento** (Opção A) — o seletor sugere o último
  ponto usado na sessão como valor inicial **editável** na conferência; o
  registro correto do ponto vale mais que os segundos economizados (a baixa
  de estoque é por ponto e a concessão é irreversível pelo painel). Sem
  persistência entre sessões.
- Q: Quando o scanner da câmera lê um QR code válido, a validação deve
  disparar automaticamente ou esperar o funcionário acionar um botão de
  validar? → A: **Validação automática ao ler** (Opção A) — sem botão para o
  fluxo por câmera; a entrada manual segue com botão próprio. Como a
  validação não consome o código nem altera estoque (FR-003), a leitura
  acidental de QR de outra pessoa não causa dano — a conferência + redigitação
  (FR-004) continuam sendo a barreira antes de qualquer concessão.
- Q: A tela pós-concessão bem-sucedida deve ficar no registro da concessão
  até o funcionário acionar explicitamente "novo atendimento", ou voltar
  sozinha à leitura do código após alguns segundos? → A: **Ficar no registro
  até ação explícita** (Opção A) — a tela permanece no registro da concessão
  (prova à mão para contestação do turista) e a leitura por câmera fica
  pausada até o funcionário acionar "novo atendimento"; impede que o QR do
  próximo turista dispare um fluxo novo sobre o atendimento anterior.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ler o código do turista e conferir os dados antes de conceder (Priority: P1)

O funcionário, no posto de retirada de brindes, recebe do turista o código único
de resgate (RF36 — gerado no app do turista ao concluir uma rota). Ele lê o
código pela câmera do terminal (scanner de QR code/código de barras) ou, como
alternativa, digita o código manualmente. O sistema valida o código e apresenta
os dados para conferência: a rota concluída, o brinde correspondente e a
disponibilidade em estoque. Nenhuma concessão acontece nesta etapa — ler é seguro.

**Why this priority**: é o coração do RF21 — sem leitura e conferência não existe
concessão. É também a etapa de segurança operacional: o funcionário concede olhando
dados reais da API, não de memória.

**Independent Test**: Pode ser testada lendo um código válido (câmera ou digitação)
e verificando na tela a rota concluída, o brinde e o saldo disponível — sem que o
código seja consumido nem o estoque alterado.

**Acceptance Scenarios**:

1. **Given** funcionário autenticado no posto, **When** lê pela câmera o QR code
   de um código válido de rota concluída, **Then** a tela apresenta a rota
   concluída, o brinde correspondente e a disponibilidade em estoque, com o
   código exibido para conferência visual — e o código **não** fica consumido.
2. **Given** leitura por câmera indisponível ou recusada pelo navegador do
   terminal, **When** o funcionário usa a entrada manual, **Then** o mesmo fluxo
   de validação e conferência acontece a partir do código digitado.
3. **Given** um código desconhecido ou malformado, **When** é lido ou digitado,
   **Then** a validação retorna desfecho negativo inequívoco ("código inválido"),
   com message acionável e nova tentativa permitida imediatamente.
4. **Given** um código de turista cuja rota ainda **não** foi concluída,
   **When** é validado, **Then** o desfecho indica inequivocamente "rota ainda
   não concluída" — sem exibir dados parciais como se fossem concessionáveis.

---

### User Story 2 - Confirmar a concessão, com backend baixando estoque e consumindo o código (Priority: P1)

Após a conferência (User Story 1), o funcionário confirma explicitamente a
concessão — redigitando o código exibido para habilitar o botão (decisão do
owner em Clarifications). O backend concede o brinde, aplica a baixa automática no estoque e
invalida o código, retornando o registro da concessão. A UI trata cada desfecho:
sucesso (registro exibido, entrada limpa para o próximo atendimento), código já
utilizado, rota não concluída e brinde sem estoque — cada um com mensagem
acionável própria. Em caso de falha, o código continua válido: o funcionário
simplesmente não concede, e o turista não perde o resgate.

**Why this priority**: é o desfecho do RF21 — o momento em que o turista recebe
o brinde e o estoque reflete a baixa. Mesmo que a conferência exista (US1), sem
confirmação o brinde nunca sai do posto.

**Independent Test**: Pode ser testada confirmando a concessão de um código
válido e verificando que a resposta exibe o registro (brinde, código consumido,
novo saldo pós-baixa retornado pela API), que uma revalidação do mesmo código
passa a reportar "já utilizado", e que cada desfecho de falha tem mensagem própria.

**Acceptance Scenarios**:

1. **Given** dados válidos em conferência, **When** o funcionário confirma,
   **Then** a concessão é registrada pelo backend e a UI exibe o registro da
   concessão (brinde concedido e código consumido), permanecendo nele — com a
   câmera pausada — até o funcionário acionar "novo atendimento" (FR-009),
   quando o campo de entrada fica pronto para o próximo atendimento.
2. **Given** uma concessão confirmada com sucesso, **When** o mesmo código é
   validado novamente, **Then** o desfecho é inequivocamente "código já utilizado"
   — o backend invalidou o código, o painel apenas reflete.
3. **Given** um código válido cujo brinde está sem estoque, **When** a validação
   acontece (e a confirmação é tentada), **Then** o desfecho de estoque é
   distinto dos demais, indica que o código **continua válido** e a concessão
   não acontece.
4. **Given** qualquer falha na confirmação (código já utilizado, rota não
   concluída, sem estoque), **When** o funcionário volta à conferência, **Then**
   o código não foi consumido pela tentativa falha e nova concessão do mesmo
   código (pelo mesmo ou outro funcionário) permanece possível quando o impasse
   for resolvido.

---

### User Story 3 - Acesso restrito à área do funcionário (RBAC da SPE-01 reforçado) (Priority: P2)

A área de concessão é a única superfície do painel visível ao funcionário
(RF03/SPE-01): ele não vê dashboard, pontos turísticos, eventos, rotas, estoque
nem gestão de funcionários. O shell do painel exibe item de navegação apenas
para a concessão. O administrador também pode operar a concessão (área
acessível a ambos). A autorização final permanece do backend — o painel aplica
o RBAC de superfície da SPE-01 (guardas de papel) e não expõe caminhos que
levariam a 403.

**Why this priority**: o RF21 é operado pelo funcionário, e o requisito RF03
exige essa partição de papel; é pré-condição do desenho da área, mas o valor
operacional (conceder brinde) já está nas US1/US2.

**Independent Test**: Pode ser testada autenticando um funcionário e verificando
que a navegação só expõe a concessão e que tentativas manuais de URL admin são
redirecionadas pela guarda da SPE-01.

**Acceptance Scenarios**:

1. **Given** um funcionário autenticado, **When** abre o painel, **Then** a
   navegação expõe apenas a área de concessão (sem dashboard, pontos, eventos,
   rotas/estoque ou funcionários), e a página pós-login é a própria concessão.
2. **Given** um funcionário autenticado, **When** tenta acessar manualmente uma
   URL administrativa (dashboard, pontos, eventos, rotas), **Then** a guarda
   redireciona para a área própria, de forma consistente com a SPE-01.
3. **Given** um administrador autenticado, **When** acessa a área de concessão,
   **Then** o fluxo de concessão funciona igual (validar, conferir, confirmar).
4. **Given** qualquer resposta 403 do backend durante o fluxo de concessão,
   **When** é recebida, **Then** é traduzida em mensagem acionável ao operador
   (a autorização final é do backend, Princípio II).

---

### Edge Cases

- **Código desconhecido ou malformado**: a validação retorna desfecho
  inequívoco "código inválido" (404 do backend) e o terminal continua operante
  — nova tentativa imediata, sem recarregar a página (FR-008).
- **Código já utilizado**: desfecho distinto (FR-006) com indicação de que a
  concessão já aconteceu antes — o painel NÃO exibe quem concedeu como dado de
  operação obrigatória, apenas não nega o fato (Princípio II; a API pode não
  ter endpoint de leitura de concessão — sem histórico nesta spec).
- **Rota ainda não concluída**: desfecho distinto (FR-006); nenhum dado parcial
  é exibido como se concessionável — o turista precisa completar a rota no app.
- **Brinde sem estoque**: desfecho distinto, com indicação de que o código
  continua válido (FR-007); a tentativa não consome o código (garantia do
  backend, SC-003).
- **Leitura redundante do mesmo QR** (funcionário lê duas vezes sem querer):
  a segunda leitura só re-valida e re-apresenta a conferência — a concessão
  exige a dupla confirmação de FR-004 (redigitação + ação do funcionário);
  código já consumido volta como
  "já utilizado".
- **Câmera indisponível/negada/falhando**: degradação acionável com entrada
  manual na mesma tela (FR-011) — o posto nunca fica bloqueado pelo hardware.
- **Campo vazio na entrada manual**: bloqueio local com mensagem de
  preenchimento (e nada é enviado à API).
- **Ponto de retirada não selecionado ou desconhecido**: bloqueio local para
  seleção vazia; 404 do backend vira mensagem acionável (FR-010).
- **Sessão expirada durante o fluxo**: política única de renovação/replay do
  BFF (SPE-01, Constraint 5); se a renovação falhar, redirecionamento ao login
  com retorno ao posto autenticado.
- **Erro de rede / API indisponível**: estados de erro distintos e acionáveis
  em leitura, conferência e confirmação (Princípio V) — nunca tela em branco
  nem spinner infinito.
- **Payload fora do contrato**: dado que não corresponde ao esperado na
  resposta vira erro explícito (parse defensivo — `ContractViolationError`),
  nunca dado silenciosamente aceito (Princípio I).
- **Resposta 403 do backend no fluxo do funcionário** (ex.: concessão negada
  ao papel): mensagem acionável traduzida (Princípio II) — comportamento
  confirmado no probe de papel.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST restringir a navegação da área de concessão ao
  papel Funcionário (e Administrador, que também pode operar) via RBAC de
  superfície da SPE-01, com a autorização final do backend (403 traduzido em
  mensagem acionável) — o funcionário não vê dashboard, pontos, eventos,
  rotas, estoque nem funcionários.
- **FR-002**: O sistema MUST permitir a leitura do código de resgate por duas
  vias equivalentes: câmera do terminal (scanner de QR code/código de barras)
  — com validação disparada automaticamente ao ler, sem botão (decisão do
  owner em Clarifications) — e entrada manual digitada, com ação própria de
  validar — mesmo fluxo, mesma conferência, mesmo desfecho.
- **FR-003**: O sistema MUST validar o código consultando a API **antes** de
  qualquer concessão, exibindo: rota concluída, brinde correspondente e
  disponibilidade em estoque — e a validação NÃO consome o código nem altera
  o estoque.
- **FR-004**: O sistema MUST exigir dupla confirmação para conceder: a
  conferência dos dados em tela **e** a redigitação do código do resgate
  (decisão do owner em Clarifications) — o botão de confirmação só fica
  habilitado com o código digitado batendo com o em conferência — e NUNCA
  conceder por efeito colateral da leitura (inclusive leitura redundante do
  mesmo QR). A redigitação aceita a comparação sem diferenciar maiúsculas e
  ignorando espaços nas extremidades (código vindo de leitura ou digitação é
  igualado pela API; o atrito é da confirmação, não do formato).
- **FR-005**: O sistema MUST efetuar a concessão exclusivamente pelo backend
  (endpoint real `POST /gamification/redemptions`): o backend valida
  definitivamente, aplica a baixa de estoque e invalida o código — o painel
  NÃO calcula, antecipa, simula ou desfaz baixa nem invalidação (Princípio II).
- **FR-006**: O sistema MUST tratar de forma **distinta e acionável** os
  desfechos do fluxo: (a) sucesso — registro da concessão exibido;
  (b) código inválido/desconhecido; (c) código já utilizado;
  (d) rota não concluída; (e) brinde sem estoque — nunca colapsando
  desfechos diferentes em uma mesma mensagem genérica.
- **FR-007**: O sistema MUST, em desfecho de estoque insuficiente, indicar que
  o código **continua válido** (pode ser concedido após reposição
  — comportamento garantido pelo backend) e encaminhar o funcionário
  (por exemplo, orientar reposição pelo administrador).
- **FR-008**: O sistema MUST permitir nova tentativa imediata após qualquer
  desfecho negativo, sem travar o terminal e sem exigir recarregar a página.
- **FR-009**: O sistema MUST, no sucesso, exibir o registro da concessão
  retornado pela API (brinde, código consumido) **até o funcionário acionar
  explicitamente "novo atendimento"** (decisão do owner em Clarifications),
  com a leitura por câmera pausada nesse estado, e limpar o estado de entrada
  ao avançar para o próximo atendimento.
- **FR-010**: O sistema MUST solicitar o ponto de retirada da concessão
  **em cada atendimento** (decisão do owner em Clarifications) — seletor
  alimentado pelo catálogo de pontos da SPE-03, com o último ponto usado na
  sessão sugerido como valor inicial **editável** na conferência, sem
  persistência entre sessões — e exibi-lo na conferência — a ausência ou a
  recusa do backend (404 de ponto) é mensagem acionável.
- **FR-011**: O sistema MUST degradar com mensagem acionável quando a câmera
  estiver indisponível, negada ou falhar, oferecendo a entrada manual na mesma
  tela (a leitura manual nunca fica indisponível por causa da câmera).
- **FR-012**: O sistema MUST expor estados de carregamento, vazio e erro
  distintos e acionáveis em toda interação com a API — validação, concessão —
  com feedback de sucesso na mutação (Princípio V).
- **FR-013**: O sistema MUST tratar payload fora do contrato como erro
  explícito (parse defensivo — `ContractViolationError`), nunca aceitando dado
  silenciosamente (Princípio I).
- **FR-014**: O sistema MUST oferecer acesso por teclado a todo o fluxo —
  entrada manual, confirmação, nova tentativa — com labels acessíveis
  (Constraint 6).

### Key Entities *(include if feature involves data)*

- **Código de resgate (RedemptionCode)**: texto único (1–128 caracteres,
  conforme contrato) e status (`valid` enquanto não consumido; consumido após
  concessão bem-sucedida). Nasce no backend quando o turista conclui a rota
  (RF36, app do turista — fora deste repositório); o painel apenas lê e
  envia ao backend para validação/concessão.
- **Inscrição concluída (Enrollment)**: progresso do turista na rota com status
  (`inProgress`/`completed`) — só inscrições concluídas geram código. É a
  origem da "rota concluída" exibida na conferência.
- **Brinde (Prize)**: identificador, nome e quantidade em estoque (inteiro ≥ 0)
  — o mesmo brinde gerido pela SPE-05 (nasce com a rota; estoque ajustado pelo
  administrador). O saldo pós-baixa aparece no registro da concessão.
- **Concessão (Redemption)**: registro criado pelo backend na confirmação —
  código consumido, brinde concedido, rota, turista, ponto de retirada, quem
  concedeu e instante. O painel não cria concession via outro caminho nem
  mantém histórico local; exibição após sucesso é do retorno da própria API.
- **Ponto de retirada (TouristSpot)**: ponto do catálogo da SPE-03 informado na
  concessão (`spotId` ≥ 1).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um funcionário completa o ciclo de atendimento — ler o código,
  conferir e confirmar — em menos de 30 segundos no fluxo por câmera, e em
  menos de 60 segundos na entrada manual, para dados válidos.
- **SC-002**: Os cinco desfechos possíveis (sucesso, código inválido, já
  utilizado, rota não concluída, sem estoque) aparecem com mensagens
  distinguidas entre si em 100% dos casos — um operador distingue o desfecho
  sem assistência.
- **SC-003**: 100% dos desfechos de falha não consomem o código nem alteram o
  estoque: o mesmo código volta a validar (ou é concedido) quando o impasse é
  resolvido — o painel nunca destrói valor do turista.
- **SC-004**: Após uma concessão bem-sucedida, o registro (brinde concedido e
  código consumido) é exibido em menos de 2 segundos, e a revalidação do mesmo
  código reporta "já utilizado" — coerência garantida pelo backend.
- **SC-005**: A entrada manual produz exatamente os mesmos desfechos da leitura
  por câmera para o mesmo código, em 100% dos casos de teste.
- **SC-006**: Um funcionário autenticado exposto ao painel encontra 0
  superfícies além da concessão (navegação e URLs admin) — RBAC de superfície
  da SPE-01 aplicado e verificado.
- **SC-007**: O compare de contrato contra o Swagger real é executado antes de
  encerrar a feature (Governança 5), incluído o endpoint de validação
  contratado (hoje inexistente no Swagger — segue como item de verificação do
  backend).

## Contrato da API *(obrigatório pela Constituição — Princípio I)*

Verificado contra o OpenAPI real da API FastAPI (tag `Gamification`,
`API_BASE_URL`, prefixo `/api/v1`, autenticação Bearer — mesma sessão das
demais features). Erros seguem o payload unificado `ApiError`
(`{ errorCode, message, details? }`). O detalhamento em `contracts/`
pode ser gerado/atualizado no plan.

**1. Concessão (existente no Swagger — verificado nesta sessão)** —
`POST /gamification/redemptions` (RF21; "staff only"):

- Corpo `RedemptionCreateRequest`: `{ code, spotId }` — código
  (string, 1–128) e ponto de retirada (inteiro ≥ 1).
- Respostas: **201** + `RedemptionView` `{ code, prize: { id, name,
  stockQuantity (*pós-baixa*, FR-004 da SPE-05) }, routeId, touristId,
  pickupSpotId, concededBy, usedAt }`; **404** código desconhecido/ponto
  desconhecido (`resource_not_found`); **409** código já utilizado **ou**
  estoque insuficiente — **o código permanece válido** (tentativa falha não
  consome; semântica exata por sub-caso é item de probe); **401/403**
  sessão/role; **422** payload inválido (via `ApiError`).
- Documentado no `summary` do endpoint: "201; 409 already used or insufficient
  stock — the code stays valid; 404 unknown code/spot — RF36/Q3".

**2. Validação (contrato esperado — ainda NÃO publicado no Swagger;
o backend deve implementar ou confirmar design equivalente)** — decisão do
owner nesta sessão (ver Clarifications): a UI é construída contra este
contrato como **baseline com mocks temporários** (padrão da SPE-01) e o
compare campo a campo contra o Swagger é **task obrigatória** antes de
encerrar a feature:

- `POST /gamification/redemptions/validate` — mesmo corpo
  `{ code, spotId }`, sem consumir o código nem alterar estoque.
- **200** + `RedemptionPreviewView` (esperado): `{ code, codeStatus: "valid",
  route: { id, name }, enrollmentStatus: "completed", prize: { id, name,
  stockQuantity, available: boolean }, pickupSpotId? }` — dados exibidos na
  conferência (FR-003). O nome da rota pode ser resolvido pelo painel via
  catálogo de rotas (`GET /gamification/routes` aceita qualquer autenticado)
  se o backend preferir retornar só identificadores — decisão registrada no
  compare de contrato.
- Desfechos negativos (semântica por errorCode, a confirmar no probe):
  **404** `resource_not_found` — código desconhecido; **409** — código já
  utilizado; **409** — rota ainda não concluída; **409** — brinde sem estoque
  (código permanece válido, FR-007); **422** payload inválido.
- Design alternativo aceito pelo backend: *preview* no próprio
  `POST /redemptions` (flag de simulação). O que a spec exige é a **etapa de
  leitura sem consumo** (US1) — o nome/meio do endpoint é do plan/probe.

**3. Probes pendentes** (padrão SPE-02/03/04/05 — probe em sessão com role
real, atualizando este contrato e as mensagens da UI antes de encerrar):

- Valores exatos de `errorCode` do `ApiError` para cada desfecho de validação
  e de concessão (código inválido × já utilizado × rota incompleta × sem
  estoque) — base das mensagens distintas de FR-006.
- Semântica do `spotId` enviado pela UI: é o ponto do funcionário (posto de
  retirada), deve coincidir com o `pickupSpotId` escolhido pelo turista no app
  (RF36/Q3), ou é livre? Hoje o Swagger só nega "unknown spot".
- Papel do chamador: confirmar se só funcionário ("staff") ou também
  administrador concede; e se a validação exige o mesmo papel.
- Comportamento real de 409 "estoque insuficiente" na concessão (o código
  permanece válido — confirmar que o painel pode orientar retentativa).

## Assumptions

- **Ponto de retirada na UI**: o funcionário informa o ponto onde está
  atendendo **a cada atendimento** (seletor do catálogo da SPE-03, catálogo
  completo carregado — mesma solução da SPE-04/SPE-05 para volumes
  acadêmicos), com o último ponto usado da sessão sugerido como valor
  inicial editável — decidido pelo owner nesta sessão (ver Clarifications);
  sem persistência entre sessões e sem fixar dado da cidade no código
  (Princípio IV).
- **Formato do código**: string opaca (1–128) vindo do QR do app; a UI não
  valida formato além de campo obrigatório — a autoridade é o backend
  (404 para código desconhecido/malformado).
- **Escaner por câmera do navegador**: o terminal do posto usa a câmera
  disponível (webcam/notebook/tablet); nenhum hardware dedicado de leitor é
  requisito — a entrada manual cobre terminais sem câmera (FR-011). A escolha
  da biblioteca de scanner é do plan, com justificativa e preferência por
  opção gratuita/open source (Princípio III) e sanção por emenda se necessário.
- **Administrador também opera a concessão**: a área é exclusiva do
  funcionário dentro do menu do funcionário, mas o papel administrador — que
  vê tudo — também pode conceder (US3.3). Se o backend negar concessão a
  administrador (probe), a spec/contrato é atualizado.
- **Sem histórico de concessões nesta spec**: o RF21 não pede listagem de
  redemptions no painel; o registro exibido é o do retorno imediato
  (FR-009). Uma tela de histórico é refinamento futuro fora do escopo.
- **Sessão e infraestrutura**: autenticação, guardas de papel, túnel BFF e
  estados de UI de `src/shared` herdados da SPE-01 são reusados sem recriação
  (Princípio IV); `pnpm build` e `pnpm lint` sem erros fazem parte do pronto
  (Constraint 6).
- **Idioma da UI**: mensagens, rótulos e desfechos em português (convenção do
  projeto); códigos/identificadores técnicos em inglês.
