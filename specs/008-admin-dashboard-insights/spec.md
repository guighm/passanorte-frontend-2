# Feature Specification: Dashboard e Insights (SPE-07)

**Feature Branch**: `008-admin-dashboard-insights`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "Dashboard e insights do painel administrativo PassaNorte, cobrindo RF06, RF07, RF08, RF09 e RF10 de docs/SYSTEM_REQUIREMENTS.md (acesso exclusivo do administrador). Seções: (1) mapa de calor da cidade de Manaus com intensidade de visitas por região/ponto turístico, reusando a base de mapas (Google Maps ou OSM) estabelecida na SPE-03; (2) contador total de acessos ao aplicativo Passaporte (app do turista, dados vindos do backend) com períodos configuráveis pelo usuário; (3) ranking de pontos turísticos mais visitados com segmentação por dia, mês e ano; (4) distribuição proporcional de visitantes por país de origem; (5) distribuição proporcional por interesses cadastrados no perfil dos turistas. Implementar em React 19 com biblioteca de gráficos adequada, seletor global de período quando aplicável, e estados de carregamento, vazio e erro em cada card. Consumir os endpoints analíticos conforme o contrato OpenAPI da API FastAPI (aggregations/dashboard). Deixar registrado na spec que os dados brutos (visitações, acessos, perfis) são coletados pelo backend a partir do uso do app do turista."

> **Nota de escopo (constituição):** conforme Princípio I da
> `../../.specify/memory/constitution.md`, a seção "Contrato da API" abaixo é
> conteúdo obrigatório de spec do projeto PassaNorte. Os cinco endpoints
> analíticos (`/api/v1/dashboard/*`, tag `Dashboard`) **já estão publicados e
> verificados contra o Swagger real** da API FastAPI (servidor em
> `API_BASE_URL`, extração de 2026-11-10) — não há contrato esperado pendente
> nem necessidade de mocks; o compare de contrato obrigatório (Governança 5)
> continua válido antes de encerrar a feature. Decisões de reuse sancionadas
> pela constituição: guardas de papel da SPE-01 (Princípio IV), base de mapas
> **OpenStreetMap** da SPE-03 (`SpotMapPicker` — Constraint 3, decisão do owner
> de 2026-11-06 em detrimento do Google Maps; a "Google Maps ou OSM" do RNF18
> já está resolvida, não se reabre aqui), estados de UI de
> `src/shared/components` e o túnel BFF para chamadas client-side (Constraint
> 5). A biblioteca de gráficos client-side (compatível com React 19) é
> **escolhida uma única vez no plan da SPE-07** e sancionada na constituição
> (Constraint 4) — a spec permanece agnóstica quanto a isso. Todos os
> requisitos e critérios de sucesso permanecem agnósticos de tecnologia.

## Clarifications

### Session 2026-11-10

- Q: O seletor global de período da página deve oferecer as mesmas opções
  nomeadas do contador (hoje, semana, mês e "configurável" por duas datas),
  traduzindo essas escolhas em janelas de datas para os demais cards? → A:
  **Seletor global único com hoje/semana/mês/configurável** (Opção A) —
  coerência de linguagem com o RF07, um único mecanismo de janela temporal
  para página; o contador também recebe o `period` nomeado, os demais cards
  recebem as datas traduzidas da janela.
- Q: Como o card de contador de acessos (RF07) deve apresentar a série diária
  que a API retorna junto com os totais? → A: **Totais em destaque + série
  diária como gráfico de linha compacto** (Opção A) — leitura natural da
  evolução de acessos, legível mesmo em períodos longos "mês"/"configurável"
  (numerais tabulares nos totais, eixo de datas da série).
- Q: Qual representação visual o mapa de calor (RF06) deve usar para traduzir
  o peso de visitas de cada marcador? → A: **Marcadores graduados — círculos
  com cor/tamanho proporcionais ao peso + tooltip com nome** (Opção B) —
  resolve o RF06 com a integração OSM existente da SPE-03, sem camada de
  calor adicional nem nova dependência (RNF15), mantendo nome/posição de cada
  ponto diretamente legíveis (FR-004).
- Q: Que tipo de gráfico os cards de distribuição por países (RF09) e por
  interesses (RF10) devem usar para as proporções? → A: **Barras horizontais,
  uma por país/interesse, com contagem e porcentagem visíveis** (Opção B) —
  categoria identificável sem depender só de cor (acessibilidade), escala
  bem com muitos países/interesses e evita leitura de pizza quando as
  parcelas de interesses somam >100%.
- Q: Os dados do dashboard devem se atualizar automaticamente enquanto a
  página fica aberta, ou apenas quando o administrador muda o período ou
  clica em recarregar? → A: **Sob demanda** (Opção B) — atualização ao
  entrar na página, ao mudar o período e ao recarregar manualmente o card;
  sem atualização periódica automática (nenhuma RF pede tempo real e o
  painel é consulta de gestão, não monitoramento ao vivo).
- Q: Quando o seletor global usa as opções nomeadas "semana" e "mês" para os
  cards que recebem janelas de datas (mapa, países, interesses), como essa
  janela deve ser definida? → A: **Janelas calêndricas correntes no fuso da
  cidade** (Opção A) — semana corrente (segunda a domingo) e mês corrente do
  calendário; as janelas traduzidas para os cards de datas ficam comparáveis
  ao que o backend entende pelo `period` nomeado do contador.

## User Scenarios & Testing *(mandatory)*

O dashboard é a primeira tela pós-login do administrador (`roleCanAccess` /
`homePathForRole` da SPE-01) e é composta de cards independentes, cada um
consumindo seu endpoint analítico. Cada story descreve um card
independentemente testável; a coexistência dos cinco na mesma página é o
critério de feature completa.

### User Story 1 - Mapa de calor das visitas sobre a cidade (Priority: P1)

O administrador abre o card de mapa e vê um mapa da cidade com o calor de
visitas: cada ponto turístico aparece em sua posição com uma intensidade
proporcional ao peso de visitas (RF06). Ele pode alternar a agregação entre
**por ponto turístico** e **por região** e recortar o mapa por um período de
datas. Os marcadores vêm do backend em ordem decrescente de peso; nada é
inferido ou inventado no painel — a mesma base cartográfica estabelecida em
SPE-03 é reusada, sem qualquer segunda integração de mapa.

**Why this priority**: RF06 tem prioridade de negócio Alta e é o card que
exige mais interação com a base de mapas existente — validar o reuso da
SPE-03 cedo reduz o maior risco técnico da feature.

**Independent Test**: Pode ser testada abrindo o card com visitas registradas
e conferindo posição, nome e intensidade de cada marcador contra os dados do
endpoint; a alternância spot↔região e o recorte de datas são exercícios
adicionais independentes.

**Acceptance Scenarios**:

1. **Given** o administrador autenticado com visitas registradas no período,
   **When** o card carrega, **Then** o mapa exibe um marcador por ponto
   turístico visitado na posição registrada, com intensidade proporcional ao
   peso de visitas e nome acessível (tooltip/legenda), sem dados fabricados
   localmente.
2. **Given** o mapa em agregação "por ponto", **When** o administrador alterna
   para "por região", **Then** os marcadores passam a representar regiões
   com o peso agregado delas e o card não perde o recorte de período vigente.
3. **Given** um período sem visitas registradas, **When** o card carrega,
   **Then** é exibido um estado de vazio claro (mapa sem marcadores e
   mensagem acionável), nunca um erro.
4. **Given** o endpoint retorna marcação malformada (ex.: coordenadas
   ausentes), **When** o card processa a resposta, **Then** o card entra em
   estado de erro explícito — a marcação não é silenciosamente descartada nem
   exibida de forma enganosa.

### User Story 2 - Ranking dos pontos turísticos mais visitados (Priority: P2)

O administrador abre o card de ranking e vê os pontos turísticos mais
visitados (RF08) segmentados por **dia**, **mês** ou **ano**, a partir de uma
data de referência que ele pode ajustar (padrão: hoje). O tamanho da lista é
configurável (padrão: 5). Cada linha mostra posição, nome do ponto e número
de visitas. Escolher outro segmento ou outra data atualiza a lista via API —
o painel nunca reordena ou recalcula o ranking localmente.

**Why this priority**: RF08 também é Alta para o negócio — é a leitura
direta de "o que os turistas mais visitam" — mas é um card de tabela/lista
sem dependência de mapa, e por isso vem depois do mapa de calor.

**Independent Test**: Pode ser testada alternando dia/mês/ano e editando a
data de referência, conferindo que posição/nome/visitas de cada linha
coincidem com a resposta do endpoint e que a mudança de segmento dispara
uma nova consulta.

**Acceptance Scenarios**:

1. **Given** visitas registradas no dia corrente, **When** o card carrega no
   segmento "dia", **Then** a lista mostra os N pontos mais visitados
   daquele dia em ordem de posição, com o total de visitas por ponto.
2. **Given** o card em "dia", **When** o administrador seleciona "mês" (ou
   "ano"), **Then** a lista é recarregada para a janela do mês (ou ano) da
   data de referência, mantendo o tamanho de lista escolhido.
3. **Given** um período (ex.: ano) sem visitas registradas, **When** o card
   carrega, **Then** é exibido estado de vazio claro, não uma tabela vazia
   sem contexto.
4. **Given** o administrador aumenta o tamanho da lista, **When** a consulta
   retorna, **Then** o ranking reflete o tamanho escolhido dentro do limite
   suportado pela API.

### User Story 3 - Contador de acessos ao app Passaporte (Priority: P3)

O administrador abre o card de contador e vê o total de acessos ao aplicativo
Passaporte (RF07) em um período que ele escolhe: hoje, semana, mês ou um
período configurável por ele (duas datas, inclusive). O card exibe os
números agregados que o backend retorna — turistas únicos por dia e total de
eventos de acesso — e a série diária do período quando existir. O painel
apenas reflete a agregação; a coleta dos acessos acontece no backend, a partir
do uso do app do turista.

**Why this priority**: RF07 é Média de valor e Baixa de urgência; é o card
mais simples (números + série opcional) e por isso vem depois dos dois de
prioridade Alta.

**Independent Test**: Pode ser testada trocando o período (hoje↔semana↔mês↔
configurável) e conferindo que os números exibidos coincidem com a resposta
do endpoint para a janela escolhida.

**Acceptance Scenarios**:

1. **Given** acessos registrados, **When** o administrador seleciona
   "semana", **Then** o card exibe os totais do backend para a semana
   (turistas únicos por dia e total de eventos de acesso) sem recarregar a
   página toda.
2. **Given** período "configurável", **When** o administrador escolhe duas
   datas e consulta, **Then** os totais refletem a janela inclusiva escolhida
   e a escolha permanece visível (período atual sempre identificável).
3. **Given** um período sem nenhum acesso, **When** o card carrega, **Then**
   zeros legítimos são exibidos como estado de vazio explícito
   ("nenhum acesso no período"), não como erro.

### User Story 4 - Distribuição de visitantes por país de origem (Priority: P4)

O administrador abre o card de países e vê, para o período vigente, a
proporção de visitantes por país de origem cadastrado no perfil (RF09): cada
barra horizontal com país, contagem de turistas e porcentagem sobre o total
de visitantes. A distribuição vem pronta do backend; o painel apenas a
representa graficamente.

**Why this priority**: RF09 é Média; é um gráfico de proporção simples e
autocontido, sem controles próprios além do período global.

**Independent Test**: Pode ser testada conferindo que as barras exibidas
(porcentagem ± arredondamento somando ~100%) coincidem com a resposta do
endpoint para o período vigente.

**Acceptance Scenarios**:

1. **Given** visitantes de múltiplos países no período, **When** o card
   carrega, **Then** cada país do retorno aparece como uma barra com
   contagem e porcentagem, e é possível identificar cada barra diretamente
   (interação por teclado).
2. **Given** um período sem visitantes, **When** o card carrega, **Then**
   estado de vazio claro é exibido, não um gráfico vazio sem contexto.

### User Story 5 - Distribuição de visitantes por interesses do perfil (Priority: P5)

O administrador abre o card de interesses e vê, para o período vigente, a
proporção de visitantes por cada interesse cadastrado no perfil (RF10), com
rótulos de interesse, contagem de turistas e porcentagem. Um turista com N
interesses conta uma vez por interesse (a proporção é sobre o total de
declarações de interesse) — por isso as parcelas podem somar mais de 100%,
o que o card deixa entendível para o operador.

**Why this priority**: RF10 é Média e é o último card conceitualmente —
mesmo mecanismo de distribuição de RF09, com a particularidade de
multiplicidade de interesses.

**Independent Test**: Pode ser testada conferindo que as parcelas coincidem
com a resposta do endpoint (contagens por `interestKey`/rótulo e
percentuais sobre o total de declarações) para o período vigente.

**Acceptance Scenarios**:

1. **Given** turistas com interesses declarados no período, **When** o card
   carrega, **Then** cada interesse do retorno aparece com rótulo legível,
   contagem e porcentagem sobre o total de declarações de interesse.
2. **Given** um turista com mais de um interesse, **When** a distribuição é
   exibida, **Then** ele é contado em cada interesse declarado, e a UI
   comunica que as parcelas são proporcionais ao total de declarações (não
   ao número de pessoas), evitando leitura errada de 100%.

### Cross-Card Behaviors (todas as stories)

- **Período global**: os cards que aceitam janela de datas (mapa, contador,
  países, interesses) respondem ao mesmo seletor global de período da página;
  o ranking tem controle próprio (segmento + data de referência), coerente
  em linguagem com o período global.
- **Independência de cards**: um card em falha não impede os demais de
  carregar; cada card expõe seus próprios estados.
- **Estados**: todo card distingue visualmente carregando (não pisca nem
  "salta" o layout), vazio (mensagem acionável) e erro (mensagem acionável
  com recarregar) — RNF13 na leitura do operador.
- **Acesso**: a página inteira é exclusiva do administrador — funcionário é
  bloqueado pelos guardas de papel da SPE-01 (RF03); a autorização final é
  sempre do backend (401/403 são refletidos como estados da UI).

### Edge Cases

- O que acontece quando o backend retorna marcações/linhas fora do formato do
  contrato (campos ausentes, tipos inesperados)? → erro explícito do card
  (violação de contrato), nunca dado silenciosamente aceito (Princípio I).
- O que acontece quando a sessão expira no meio da consulta de um card?
  → política única de renovação/401 da constraint de acesso à API; se falhar,
  estado de erro com reautenticação.
- E quando o administrador escolhe período com data inicial posterior à
  final? → validação no cliente (a ação não dispara consulta); a API
  rejeitaria com 422 de qualquer forma.
- E quando o agrupamento "por região" não tem regiões com dados no período?
  → estado de vazio do modo região, sem esconder o modo por ponto.
- E quando as parcelas de interesses somam > 100%? → legenda explícita do
  denominador (total de declarações), evitando leitura de erro.
- E quando o número de países/interesses únicos é grande? → o gráfico
  permanece legível (limites de exibição ou agrupamento visual documentados
  no plan), sem truncar contagens de forma enganosa.
- E quando a API está indisponível? → cada card em erro com recarregar; a
  página não fica em branco nem congela em carregando infinito.

## Requirements *(mandatory)*

### Functional Requirements

**Acesso e página**

- **FR-001**: O painel MUST apresentar as visões analíticas (RF06–RF10) em
  uma única página de dashboard restrita ao papel administrador, guardada
  pelos guardas de papel da SPE-01; a autorização final permanece do backend
  (respostas 401/403 são refletidas como estados da UI, não ignoradas).
- **FR-002**: Cada card do dashboard MUST consumir exclusivamente a API
  FastAPI conforme o contrato OpenAPI registrado em "Contrato da API";
  regras de negócio e agregações nunca são duplicadas ou reimplementadas no
  cliente (Princípio II) — o painel reflete fielmente o retorno da API.

**Mapa de calor (RF06)**

- **FR-003**: O dashboard MUST exibir um card de mapa de calor com a
  concentração de visitas da cidade, sobre a MESMA base cartográfica
  estabelecida em SPE-03 (OpenStreetMap via a integração existente) —
  nenhuma segunda integração de mapa, nenhuma reversão de fonte de tiles
  (Constraint 3).
- **FR-004**: O mapa de calor MUST exibir um marcador por entrada do endpoint
  de heatmap, posicionado nas coordenadas retornadas, como um círculo com
  cor e tamanho proporcionais ao peso de visitas, com nome do ponto/região
  acessível (tooltip/legenda legível por teclado); nenhuma camada de calor
  adicional é adicionada à base de mapas existente.
- **FR-005**: O mapa de calor MUST permitir alternar a agregação entre "por
  ponto turístico" e "por região", enviando o modo escolhido ao endpoint
  (padrão: por ponto).
- **FR-006**: O mapa de calor MUST respeitar o recorte de período global
  (janela de datas inclusive) aplicado ao endpoint.

**Contador de acessos (RF07)**

- **FR-007**: O dashboard MUST exibir um card com o total de acessos ao
  aplicativo Passaporte, com períodos selecionáveis: hoje, semana, mês e
  período configurável (duas datas, janela inclusiva).
- **FR-008**: O card de contador MUST exibir os agregados retornados para o
  período (turistas únicos por dia e total de eventos de acesso) em destaque
  e, quando houver, a série diária do período como um gráfico de linha
  compacto (eixo de datas por dia); o período vigente deve permanecer
  identificado na UI.
- **FR-009**: O painel MUST registrar (nesta spec) e operar sob a premissa de
  que os dados brutos — visitações, acessos e perfis de turistas — são
  **coletados pelo backend a partir do uso do app do turista**; o painel
  apenas consome agregações e NUNCA coleta, mantém ou reconstrói dados brutos
  (RNF08: nenhum dado de turista individual é persistido no frontend).

**Ranking (RF08)**

- **FR-010**: O dashboard MUST exibir um card com o ranking dos pontos
  turísticos mais visitados, segmentado por dia, mês ou ano (um segmento por
  consulta), a partir de uma data de referência editável (padrão: hoje).
- **FR-011**: O card de ranking MUST exibir cada linha com posição, nome do
  ponto e número de visitas, na ordem retornada pelo backend, e MUST permitir
  configurar o tamanho da lista (padrão: 5, dentro do limite da API).

**Distribuições (RF09, RF10)**

- **FR-012**: O dashboard MUST exibir um card com a distribuição proporcional
  de visitantes por país de origem em barras horizontais (uma por país, com
  contagem e porcentagem visíveis), para o período global vigente.
- **FR-013**: O dashboard MUST exibir um card com a distribuição proporcional
  de visitantes por interesses do perfil em barras horizontais (uma por
  interesse, com rótulo, contagem e porcentagem visíveis), para o período
  global vigente, comunicando que um turista conta em cada interesse
  declarado (parcelas proporcionais ao total de declarações, podendo somar
  acima de 100%).

**Comportamento transversal**

- **FR-014**: O dashboard MUST disponibilizar um seletor global de período —
  único na página, com as opções hoje, semana, mês e configurável (duas
  datas, janela inclusiva) — que alimenta simultaneamente os cards com
  janela de datas (mapa, contador, países, interesses): o contador recebe o
  `period` nomeado (com as datas quando "configurável") e os demais cards
  recebem as datas traduzidas da janela escolhida (semana = semana corrente
  de segunda a domingo; mês = mês corrente do calendário, no fuso da cidade,
  tornando as janelas comparáveis ao `period` nomeado do contador); a
  mudança de período recarrega os cards afetados sem recarregar a página.
- **FR-015**: Cada card MUST expor, de forma visível e distinta, estados de
  carregamento, vazio e erro com mensagens acionáveis (RNF13/Princípio V);
  a falha de um card não impede o carregamento dos demais.
- **FR-016**: Toda resposta analítica MUST passar por parse defensivo: payload
  fora do formato do contrato resulta em erro explícito da API e estado de
  erro no card — nunca dado silenciosamente aceito (Princípio I,
  ContractViolationError).
- **FR-017**: As chamadas client-side dos cards MUST trafegar pelo túnel BFF
  com a anexação de token server-side (Constraint 5); nenhum card monta
  requisição à API por conta própria e nenhum token fica exposto ao browser.
- **FR-018**: A página e seus controles devem ser utilizáveis por teclado e
  com labels/gráficos acessíveis (Constraint 6); valores numéricos usam
  numerais tabulares conforme a fundação tipográfica (SPE-08).
- **FR-019**: Nenhum dado da cidade é fixado em código (Princípio IV): nomes
  de pontos e regiões, rótulos de interesses e qualquer contexto de
  localização provém sempre da API.
- **FR-020**: Os cards do dashboard se atualizam sob demanda — ao entrar na
  página, ao mudar o período/segmento e ao acionar o recarregar manual de um
  card — sem atualização automática periódica enquanto a página fica aberta.

### Key Entities *(include if feature involves data)*

- **Marcador de calor (HeatmapMarker)**: ponto/região com nome, coordenadas
  (latitude/longitude), peso de visitas e id de ponto opcional (nulo quando
  marcador de região). Vem em ordem decrescente de peso.
- **Contagem de acessos (AccessCounts)**: período vigente, turistas únicos
  por dia, total de eventos de acesso e série diária (data, turistas únicos
  e eventos do dia), calculada pelo backend em fuso horário da cidade.
- **Item de ranking (RankingItem)**: posição, id do ponto, nome e visitas —
  uma linha do ranking para o segmento (dia/mês/ano) e data de referência.
- **Parcela de país (CountryShare)**: país, turistas e porcentagem sobre o
  total de visitantes do período.
- **Parcela de interesse (InterestShare)**: chave e rótulo do interesse,
  turistas e porcentagem sobre o total de declarações de interesse.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Com a API saudável, os cinco cards do dashboard apresentam seus
  dados (ou seus estados de vazio legítimos) em até 5 segundos após a
  navegação para o dashboard, cada um independentemente dos demais.
- **SC-002**: Uma mudança de período global reflete nos quatro cards com
  janela de datas em até 3 segundos por card, sem recarregar a página e sem
  perder o estado de controles do ranking.
- **SC-003**: Em 100% dos cards, carregando, vazio e erro são
  distinguíveis pelo operador sem ambiguidade (um erro não parece vazio, um
  vazio não parece travado).
- **SC-004**: O administrador alterna o segmento do ranking (dia/mês/ano) em
  uma única interação por mudança, com a lista atualizada sem ações extras.
- **SC-005**: Os números exibidos em todos os cards coincidem com as
  respostas registradas dos endpoints para o mesmo período em 100% das
  verificações de rotina (nenhum valor recalculado ou reordenado no cliente).
- **SC-006**: Em teste com sessão de funcionário, a navegação direta para o
  dashboard é impedida pelos guardas de papel e o funcionário não vê nenhum
  dado analítico.

## Assumptions

- **Dados brutos e privacidade**: visitações, acessos e perfis são coletados
  pelo backend a partir do uso do app do turista (RF22–RF39); o painel só vê
  agregações prontas — nenhum dado sensível de turista individual (CPF,
  passaporte, contato) é exibido em nenhum card. Isso vale como decisão de
  escopo, não como inferência.
- **Padrões de requisição**: heatmap com agregação "por ponto"; ranking com
  segmento "dia", referência em hoje e lista de 5; contador com período
  "hoje" na primeira carga — todos alteráveis pelo administrador, conforme
  os padrões do contrato.
- **Agregação por região**: depende de regiões e seus pesos existirem como
  dados no backend; quando não houver, o modo região exibe estado de vazio
  próprio (o modo por ponto continua inalterado).
- **Fuso horário**: janelas diárias do contador são definidas pelo backend no
  fuso da cidade (o contrato documenta "city-tz day"); o painel não calcula
  janelas de fuso por conta própria — apenas envia datas.
- **Gráficos**: a estrutura de card/estado é idêntica entre distribuições e
  ranking; a biblioteca client-side de gráficos é escolhida uma única vez no
  plan (Constraint 4) sem impacto na spec.
- **Disponibilidade de endpoints**: todos os cinco endpoints já existem no
  Swagger real (verificação de 2026-11-10); não há mocks nesta feature — se
  o compare de contrato (Governança 5) apontar divergência, spec e contrato
  são atualizados antes de reexecutar tasks.

## Fora de escopo

- Coleta, retenção, anonimização ou política de privacidade dos dados
  brutos de turistas (exclusivo do backend / app do turista).
- Exportação de relatórios, agendamento de relatórios ou notificações
  (nenhum requisito RF as prevê no painel).
- Qualquer outra página analítica além dos cinco cards de RF06–RF10.

## Contrato da API *(extraído do OpenAPI real — "Passanorte API" em `http://localhost:8010`, 2026-11-10; Princípio I da constituição)*

Todos os endpoints abaixo são `GET` sob `/api/v1/dashboard/*`, tag `Dashboard`,
autenticação por `HTTPBearer` (via túnel BFF no client; token anexado
server-side — Constraint 5). Erros 422 (validação) e 401/403 (sessão/papel)
são refletidos como estados de erro da UI.

### `GET /api/v1/dashboard/heatmap` (RF06)

| Parâmetro | In | Obrigatório | Padrão | Valores |
|-----------|----|-------------|--------|---------|
| groupBy   | query | não | `spot` | `spot` \| `region` |
| startDate | query | não | — | data ISO (inclusive) |
| endDate   | query | não | — | data ISO |

Response `200` — `HeatmapResponse { markers: HeatmapMarker[] }`,
`HeatmapMarker { spotId: int|null, name, latitude, longitude, weight }` em
ordem decrescente de `weight`; `spotId` é `null` em marcadores de região e
`name` é o nome público do ponto ou o rótulo da região.

### `GET /api/v1/dashboard/access-counts` (RF07)

| Parâmetro | In | Obrigatório | Padrão | Valores |
|-----------|----|-------------|--------|---------|
| period    | query | não | `today` | `today` \| `week` \| `month` \| `custom` |
| startDate | query | apenas com `period=custom` | — | data ISO (inclusive) |
| endDate   | query | apenas com `period=custom` | — | data ISO |

Response `200` — `AccessCountsResponse { period, uniqueTouristDays,
totalAccessEvents, daily: AccessDailyCount[] }`,
`AccessDailyCount { date, uniqueTourists, accessEvents }` (série ascendente,
apenas dias com eventos; janela vazia → zeros + lista vazia).

### `GET /api/v1/dashboard/spot-ranking` (RF08)

| Parâmetro | In | Obrigatório | Padrão | Valores |
|-----------|----|-------------|--------|---------|
| granularity | query | não | `day` | `day` \| `month` \| `year` |
| referenceDate | query | não | hoje | data ISO |
| limit | query | não | 5 | 1–100 |

Response `200` — `SpotRankingResponse { granularity, referenceDate,
items: RankingItem[] }`, `RankingItem { position, spotId, name, visits }`.

### `GET /api/v1/dashboard/visitor-countries` (RF09)

| Parâmetro | In | Obrigatório | Padrão | Valores |
|-----------|----|-------------|--------|---------|
| startDate | query | não | — | data ISO (inclusive) |
| endDate   | query | não | — | data ISO |

Response `200` — `VisitorCountriesResponse { totalVisitors,
items: CountryShareItem[] }`, `CountryShareItem { country, tourists, share }`
(`share` 0–100).

### `GET /api/v1/dashboard/visitor-interests` (RF10)

| Parâmetro | In | Obrigatório | Padrão | Valores |
|-----------|----|-------------|--------|---------|
| startDate | query | não | — | data ISO (inclusive) |
| endDate   | query | não | — | data ISO |

Response `200` — `VisitorInterestsResponse { totalVisitors, totalSelections,
items: InterestShareItem[] }`, `InterestShareItem { interestKey,
interestLabel, tourists, share }` (`share` 0–100, proporcional a
`totalSelections` — turista com N interesses conta N vezes; parcelas podem
somar acima de 100).
