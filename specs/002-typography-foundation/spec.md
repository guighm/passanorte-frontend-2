# Feature Specification: Tipografia do Painel (Escala Canônica e Contrato de UI)

**Feature Branch**: `002-typography-foundation`

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "Tipografia do projeto do painel administrativo PassaNorte (fundação de UI, paralela a SPE-02/03, dependente da SPE-01). Definir a família tipográfica do painel em uma única decisão documentada: via next/font (fonte gratuita/open source conforme RNF15, ou stack de sistema com fallback declarado) — nenhum import de fonte por CDN (Princípio III da constituição). Estabelecer a escala tipográfica canônica como tokens no @theme do Tailwind 4 (display, h1–h6, corpo, legenda e código, com tamanho, altura de linha, peso, tracking e cor associados), refatorando os componentes e telas existentes (Button, states, PanelHeader, PanelSidebar, LoginForm, shell e placeholders) para consumir somente esses tokens — sem tamanhos ad hoc fora de src/shared. Registrar as regras de uso por contexto (títulos, navegação, formulários, feedback) e os requisitos de acessibilidade (legibilidade mínimo, hierarquia para leitores de tela); especificar números tabulares para contadores/tabelas usados pelo dashboard (SPE-07). A spec é agnóstica de tecnologia para a escolha de fonte, mas fixa os tokens como contrato de UI para as features seguintes."

> **Nota de escopo (constituição):** assim como na SPE-01, esta spec contém
> conteúdo técnico deliberado registrado como **contrato de UI** — análogo ao
> contrato de negócio da Princípio I: a escala tipográfica tokenizada é um
> compromisso transversal que as features seguintes (SPE-02..07) consomem,
> não uma decisão de implementação interna. A constituição (Constraint 1)
> já sanciona a stack (Next.js 16 + React 19 + Tailwind CSS 4); o
> mecanismo de entrega dos tokens segue essa stack sancionada. **A escolha
> da família tipográfica em si permanece agnóstica nesta spec**: ela é uma
> única decisão documentada, tomada no planejamento (plan) da feature, e a
> arquitetura garantirá que essa decisão vive em UM único ponto.
> Demais requisitos e critérios de sucesso permanecem agnósticos de tecnologia.

## Clarifications

### Session 2026-11-06

- Q: Ao refatorar as telas existentes para consumir os novos tokens de escala, a aparência atual deve ser preservada, ou a nova escala pode mudar o visual onde os valores antigos divergirem dela? → A: Option A — refatoração fiel: os valores dos tokens da escala são definidos de modo a reproduzir a tipografia atual das telas; nenhuma mudança visual inesperada. Ajustes visuais deliberados da escala (rever valores) ficam para um refinamento futuro, fora desta feature.
- Q: Qual deve ser o alvo formal de contraste entre texto e fundo que os tokens da escala precisam atender nos modos claro e escuro? → A: Option A — WCAG 2.1 AA: 4,5:1 para texto normal (corpo, legenda, entrada de formulário) e 3:1 para texto grande (display, títulos); meta auditável com ferramenta de contraste.
- Q: Qual é o piso de tamanho de texto que a escala deve respeitar para legibilidade (com a refatoração fiel preservando o visual atual)? → A: Option A — piso atual: corpo principal ≥ 14px e texto de apoio/código ≥ 12px (consistente com a refatoração fiel — o painel já usa 14px como corpo padrão e 12px em detalhes mono); nenhum token da escala pode ficar abaixo desses pisos.
- Q: Qual contexto da interface usa o nível "display" da escala tipográfica (o maior nível definido na FR-004), que hoje não aparece na lista de contextos de uso da FR-012? → A: Option A — o nível display é reservado ao destaque numérico/hero do dashboard (SPE-07), em par com os números tabulares; nenhuma tela atual o consome (fidelidade preservada) e a regra de uso o documenta como reserva para a SPE-07.
- Q: Com a refatoração fiel, os seis níveis de título (título 1–6) podem receber valores interpolados da hierarquia canônica para os níveis que nenhuma tela usa hoje, ou deveriam copiar o visual dos níveis atualmente usados? → A: Option A — níveis com consumer hoje reproduzem o visual atual (refatoração fiel); níveis sem consumer recebem valores interpolados da progressão canônica a partir do corpo, sem qualquer efeito visual nas telas de hoje; a escala nasce completa como contrato para SPE-02..07.
- Q: A verificação nos "dois modos claro/escuro" (SC-007 e edge cases) deve usar apenas a preferência do sistema operacional, ou esta feature deve também acrescentar um alternador manual de tema no painel? → A: Option A — validação apenas via preferência do sistema (`prefers-color-scheme`); nenhum alternador manual de tema nesta feature (tema já deixa documentado o caminho para um toggle futuro, sem re-trabalho de tokens).
- Q: Onde o mesmo contexto tipográfico tem valores diferentes entre telas hoje (ex.: título de página é 24px no login e 20px nas páginas do painel), qual valor o token único da escala adota? → A: Option A — valor predominante do contexto: título de página = 20px (text-xl, padrão das páginas do painel); o título do login unifica de 24px → 20px, delta registrado (junto com o segundo delta abaixo, ver item seguinte — não mais "única" exceção).
- Q: O censo da superfície (plan/research da SPE-002) revelou a tag de spec da navegação lateral em 10px (`text-[10px]`), abaixo do piso de FR-014 (apoio/código ≥ 12px) — a "única exceção" registrada para título de página continua correta? → A: Option A — não: registra-se um segundo delta de fidelidade. A tag de spec da sidebar unifica de 10px → 12px (token código); a mudança é exigida pelo piso FR-014 (requisito, não escolha estética) e FR-011 passa a listar as DUAS exceções como únicas.
- Q: Como ler "nenhum token da escala pode ficar abaixo desses pisos" em FR-014 — os pisos valem literalmente para todo token, ou por classe de texto? → A: Option A — por classe: os pisos vinculam corpo principal (≥ 14px) e texto de apoio/código (≥ 12px); níveis de título interpolados sem consumer podem coincidir com 12px (título 6 = 12/16·500) — nenhum consumer real fica abaixo dos pisos.
- Q: O tratamento de números tabulares deve chegar à SPE-07 como um modificador aplicável a qualquer token da escala, ou como tokens numéricos dedicados? → A: Option A — modificador: a variante tabular é um ativador aplicável a qualquer token da escala (ex.: display + tabular para contadores hero; corpo + tabular em células de tabela); os contextos "dado numérico" e "célula de tabela" referenciam token + modificador, sem tokens duplicados.
- Q: A FR-004 exige "cor associada" na definição de cada token — a cor vive dentro da entrada do token, ou na regra de uso do contexto? → A: Option B — as métricas vivem no token; a cor-base por contexto (foreground / foreground-muted) é aplicada via tokens de cor existentes, e contextos de estado/marca substituem APENAS a cor (nunca as métricas). Implementação validada (0 falhas de contraste WCAG no DOM real, claro/escuro); evita duplicar definições de cor por nível.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Escala tipográfica canônica aplicada às telas existentes (Priority: P1)

O operador do painel percebe uma tipografia consistente em todas as telas
existentes (login, moldura do painel, cabeçalho, navegação e placeholders):
títulos de cada nível se distinguem claramente em hierarquia visual, o corpo
de texto tem leitura confortável, legendas e texto de apoio são
discerníveis do corpo, e textos de código têm tratamento próprio. Essa
 consistência não vem de valores repetidos à mão em cada componente, e sim
de uma escala tipográfica única e nomeada (tokens) que todo componente
consome.

**Why this priority**: é o núcleo da feature — sem a escala tokenizada e
aplicada, as features seguintes (SPE-02..07) não têm contrato de UI a
seguir, e o problema que motivou a spec (tamanhos ad hoc espalhados)
permanece.

**Independent Test**: inspecionar cada componente/tela existente (Button,
LoadingState, EmptyState, ErrorState, PlaceholderSection, DataTable,
LoginForm, LogoutButton, PanelHeader, PanelSidebar, PanelShell, shell e
placeholders das páginas) e verificar que toda tipografia provém da escala
canônica — nenhum tamanho, peso, altura de linha ou espaçamento de letra
decidido localmente; alterar o valor de um token reflete o contexto
correspondente em todas as telas de uma vez.

**Acceptance Scenarios**:

1. **Given** a escala canônica definida, **When** qualquer tela existente é
   renderizada (login, moldura, placeholders), **Then** toda tipografia
   visível corresponde a exatamente um token da escala (mesma família,
   tamanho, altura de linha, peso, espaçamento de letra e cor).
2. **Given** um token da escala tem seu valor alterado, **When** o painel é
   renderizado, **Then** todos os textos que usam esse token mudam juntos,
   sem que nenhum componente precise ser editado individualmente.
3. **Given** os componentes e telas existentes após a feature, **When** uma
   auditoria procura valores tipográficos "ad hoc" (tamanhos, pesos,
   alturas de linha ou espaçamentos de letra fixados localmente) fora do
   módulo compartilhado de fundação, **Then** zero ocorrências são
   encontradas.
4. **Given** dois títulos do mesmo nível em telas diferentes (ex.: título
   de seção no login e título de seção em um placeholder), **When** são
   comparados, **Then** são visualmente idênticos (mesmo token).

---

### User Story 2 - Família tipográfica decidida uma única vez, sem dependência externa (Priority: P1)

A família tipográfica do painel — a fonte usada para todo o texto (e a fonte
mono para código) — é uma decisão única, documentada nos artefatos da
feature, tomada entre duas famílias de alternativas válidas: uma fonte
gratuita/open source carregada localmente pelo framework de aplicação
(RNF15, caráter acadêmico — Princípio III) ou uma stack de fontes do sistema
com fallbacks declarados. Em nenhum cenário o painel carrega fonte de
serviço externo de terceiros (CDN). Hoje já existe uma fonte carregada
localmente (Geist/Geist Mono); a decisão pode ratificá-la ou substituí-la,
mas vive em um único ponto do código.

**Why this priority**: a decisão de família é gatilho de tudo ( métricas da
escala dependem da fonte) e a proibição de CDN é restrição dura da
constituição — sem ela registrada como decisão única, cada integração
seguinte poderia reintroduzir import externo.

**Independent Test**: ler a decisão documentada nos artefatos da feature;
abrir o painel e auditar as requisições de rede — nenhuma fonte provém de
serviço de terceiros; substituir a família no ponto único de decisão e
constatar que o painel inteiro troca de fonte sem editar telas.

**Acceptance Scenarios**:

1. **Given** a feature concluída, **When** os artefatos (spec, plan) são
   lidos, **Then** existe uma única decisão documentada de família
   tipográfica (fonte primária e fonte mono), com justificativa e com o
   fallback declarado caso a fonte primária não esteja disponível.
2. **Given** o painel em execução, **When** as requisições de rede são
   auditadas, **Then** nenhum arquivo de fonte é baixado de serviço externo
   de terceiros (CDN) — toda fonte é carregada localmente (empacotada pelo
   framework) ou provém do sistema operacional.
3. **Given** a fonte primária falha ao carregar, **When** o painel
   renderiza, **Then** o texto é exibido com o fallback declarado na
   decisão, preservando legibilidade e sem quebra de layout grosseira.
4. **Given** a família tipográfica precisa ser trocada no futuro, **When**
   a troca é executada, **Then** ela exige alteração em UM único ponto de
   decisão, sem tocar em telas nem componentes.

---

### User Story 3 - Regras de uso por contexto, acessíveis e navegáveis (Priority: P2)

Para decidir "que tipografia uso aqui?", o time (e as features seguintes)
consulta regras de uso por contexto documentadas junto à escala: qual token
para título de página, título de seção/card, item de navegação ativo e
inativo, rótulo e campo de formulário, mensagem de erro/feedback, texto de
apoio/legenda, célula de tabela e código. As regras incluem os requisitos
de acessibilidade: contraste suficiente entre texto e fundo em ambos os
modos claro/escuro do painel, tamanho de corpo com legibilidade mínima
confortável, ordem de leitura coerente para leitores de tela — a hierarquia
visual corresponde à semântica documental (h1 antes de h2, etc.), nunca
apenas ao tamanho da letra.

**Why this priority**: dá à escala o valor como contrato (sem regras, cada
feature adivinha); é aplicável só depois que a escala existe (depende de
US1), mas não bloqueia a decisão de família.

**Independent Test**: revisar a documentação das regras por contexto contra
as telas existentes — cada contexto de texto de verdade mapeia para um
token; navegar nas telas com leitor de tela e verificar que a hierarquia
de títulos segue ordem lógica; verificar contraste dos pares
texto/fundo da escala nos modos claro/escuro.

**Acceptance Scenarios**:

1. **Given** as regras de uso documentadas, **When** cada texto real das
   telas existentes é classificado, **Then** cada um tem exatamente um
   contexto com um token definido; não há texto "sem regra".
2. **Given** o operador navega pelo painel com leitor de tela, **When**
   percorre títulos e conteúdo, **Then** a estrutura anunciada segue
   hierarquia lógica (página → seção → subseção), não a aparência visual.
3. **Given** qualquer par texto/fundo da escala, **When** verificado nos
   modos claro/escuro com ferramenta de contraste, **Then** atende WCAG
   2.1 AA (4,5:1 texto normal; 3:1 texto grande — corpo e legenda
   inclusive).
4. **Given** o operador ajusta o zoom ou o tamanho de fonte do navegador
   (ex.: 200%), **When** usa qualquer tela, **Then** o texto aumenta e
   permanece legível, sem truncar informação essencial ou quebrar o layout
   de forma impeditiva.

---

### User Story 4 - Números tabulares prontos para dados numéricos (Priority: P2)

Contadores, valores monetários (preço de ingresso), quantidades de estoque e
células numéricas de tabelas usam uma variante tipográfica com dígitos de
largura fixa (números tabulares), de modo que números empilhados — como as
linhas do ranking de pontos e os contadores do dashboard (SPE-07) — alinhem
verticalmente. A variante é definida na escala como tratamento dos tokens de
número/tabela, disponível para o dashboard adotá-la quando a SPE-07 for
implementada.

**Why this priority**: requisito declarado para SPE-07; é barato de
entregar junto com a escala, mas só mostra valor real quando o dashboard
existe — por isso é refinamento e não núcleo.

**Independent Test**: renderizar uma coluna de números de dígitos variados
usando o tratamento tabular da escala e comparar com dígitos
proporcionais: na variante tabular, colunas alinham verticalmente;
no dashboard futuro (SPE-07), os contadores usam o tratamento sem ajustes
adicionais.

**Acceptance Scenarios**:

1. **Given** os tokens de número/tabela da escala, **When** números de
   dígitos variados são exibidos empilhados (lista ou tabela), **Then**
   alinham verticalmente dígito a dígito.
2. **Given** a SPE-07 iniciada mais tarde, **When** o dashboard renderiza
   contadores e tabelas, **Then** consome o tratamento tabular da escala
   sem definir nada ad hoc (contrato de UI cumprido).

---

### Edge Cases

- Texto de título longo (ex.: nome de ponto turístico extenso em um título
  de página): deve quebrar/abreviar conforme a regra do contexto, sem
  estourar o contêiner nem esconder a informação sem alternativa de leitura.
- Fallback declarado em uso (fonte primária indisponível): métricas
  visuais podem mudar (larguras diferentes), mas hierarquia, legibilidade e
  alinhamento tabular dos números devem se preservar com o fallback.
- Caracteres específicos do português (acentos, cedilha, aspas
  tipográficas) e símbolos monetários (R$): devem existir no conjunto de
  caracteres da fonte escolhida; a decisão de família documentada inclui
  essa verificação.
- Token aplicado em modo claro e escuro: a cor associada a cada token é
  expressa nos dois modos; nenhum texto da escala fica invisível ou com
  contraste degradado ao trocar de modo.
- Zoom/ampliação de fonte pelo navegador: a escala é definida em unidades
  responsivas às preferências do usuário (não em unidades congeladas que
  ignores configuração de acessibilidade do navegador).
- Componente novo (feature futura) tentando um tamanho fora da escala: a
  ausência de tokens para além da escala deve deixar claro (na auditoria e
  na documentação) que o novo contexto exige estender a escala, nunca
  fixar valor local.

## Requirements *(mandatory)*

### Functional Requirements

**Família tipográfica (decisão única)**

- **FR-001**: o painel MUST ter UMA única decisão documentada de família
  tipográfica (fonte primária de texto e fonte de código), registrada nos
  artefatos desta feature, incluindo justificativa e fallback declarado.
  A decisão DEVE ser uma de: (a) fonte gratuita/open source carregada
  localmente pelo framework de aplicação, ou (b) stack de fontes do
  sistema com fallbacks declarados (RNF15; Princípio III da constituição).
- **FR-002**: o painel NÃO DEVE carregar qualquer fonte de serviço externo
  de terceiros (CDN) — nenhum import de fonte por rede externa em
  nenhuma tela ou componente (Princípio III).
- **FR-003**: a família tipográfica decidida MUST viver em um único ponto
  de decisão do código; a troca dela NÃO DEVE exigir edição de telas,
  componentes ou tokens de escala (apenas o ponto de decisão).

**Escala tipográfica canônica (tokens)**

- **FR-004**: o painel MUST definir uma escala tipográfica canônica, como
  tokens de tema no módulo de fundação compartilhado, cobrindo
  EXATAMENTE os níveis: display, título 1 a título 6, corpo de texto,
  legenda/texto de apoio e código — cada um com tamanho, altura de linha,
  peso e espaçamento de letra (tracking) definidos; a cor vive na regra de
  uso do contexto (FR-012): cor-base do contexto (foreground /
  foreground-muted) aplicada via tokens de cor existentes, com substituição
  APENAS da cor em contextos de estado/marca — as métricas nunca mudam
  (leitura registrada em Clarifications, 2026-11-06). O nível display é
  **reservado** ao
  destaque numérico/hero do dashboard (SPE-07), em par com o tratamento
  tabular da FR-005 — nenhuma tela atual o consome (decisão registrada em
  Clarifications, 2026-11-06). Com a refatoração fiel (FR-011): os níveis
  com consumer hoje reproduzem o visual atual; os níveis sem consumer
  recebem valores interpolados da progressão canônica a partir do corpo,
  sem efeito visual nas telas de hoje (decisão registrada em
  Clarifications, 2026-11-06).
- **FR-005**: a escala MUST incluir um tratamento com dígitos de largura
  fixa (números tabulares) para números em contadores, valores monetários
  e células de tabela, disponível como parte do contrato para o dashboard
  (SPE-07). A variante tabular é um **modificador aplicável a qualquer
  token da escala** (ex.: display + tabular para contadores hero; corpo +
  tabular em células de tabela) — não um token separado; os contextos
  "dado numérico" e "célula de tabela" referenciam token + modificador
  (decisão registrada em Clarifications, 2026-11-06).
- **FR-006**: todo componente e tela do painel MUST consumir SOMENTE
  tokens da escala canônica para tipografia — nenhum tamanho, peso, altura
  de linha, espaçamento de letra ou família ad hoc fora do módulo de
  fundação `src/shared` (em componentes compartilhados, telas do painel e
  login).
- **FR-007**: a escala canônica e seus tokens MUST ser definidos no ponto
  único de fundação de estilo do painel (tema global), de forma que
  features subsequentes consumam os tokens sem déclarar valores locais
  (contrato de UI).
- **FR-008**: ampliar a escala (novo nível tipográfico) DEVE ser feito
  pela extensão da definição única da escala; é PROIBIDO um componente
  criar valor tipográfico local em vez de estender a escala.

**Refatoração da superfície existente**

- **FR-009**: os componentes compartilhados existentes (Button,
  DataTable, LoadingState, EmptyState, ErrorState,
  PlaceholderSection) MUST ser refatorados para consumir exclusivamente
  os tokens da escala, preservando sua função e comportamento.
- **FR-010**: os componentes e telas da fundação de autenticação (LoginForm,
  LogoutButton, PanelHeader, PanelSidebar, PanelShell, shell do painel e
  placeholders das páginas) MUST ser refatorados para consumir
  exclusivamente os tokens da escala.
- **FR-011**: a refatoração NÃO DEVE alterar o comportamento funcional dos
  componentes (estados de UI, acessibilidade mínima já garantidas ficam
  intactas; Princípio V) — a mudança é de tipografia/superfície visual
  via tokens. É **refatoração fiel**: os valores dos tokens da escala são
  definidos de modo a reproduzir a tipografia atual das telas; nenhuma
  mudança visual inesperada (decisão registrada em Clarifications,
  2026-11-06) — ajustes visuais deliberados de escala ficam para um
  refinamento futuro, fora desta feature. Exceções de fidelidade (todas
  registradas em Clarifications, 2026-11-06): (1) quando o mesmo contexto tem
  valores divergentes entre telas, o token adota o valor predominante —
  título de página = 20px (padrão das páginas do painel); o título do login
  unifica de 24px → 20px; (2) a tag de spec da navegação lateral (mono 10px)
  unifica para 12px (token código), exigida pelo piso de FR-014 — mudança
  visual deliberada por requisito, não estética. Nenhuma outra mudança visual
  é esperada.

**Regras de uso por contexto**

- **FR-012**: o painel MUST documentar a regra de uso de cada token da
  escala por contexto: destaque numérico/hero do dashboard (reserva do
  nível display — SPE-07), título de página, título de seção/card, subtítulo,
  item de navegação (ativo e inativo), rótulo de campo de formulário,
  texto de entrada, mensagem de erro/feedback, texto de apoio/legenda,
  célula de tabela, dado numérico e código. Cada contexto de texto do
  painel DEVE mapear exatamente a um token.
- **FR-013**: as regras de uso MUST ser registradas junto ao tema (no
  módulo de fundação) de forma consultável pelo time; features seguintes
  seguem as regras sem criar variações locais.

**Acessibilidade e legibilidade**

- **FR-014**: os valores da escala MUST garantir legibilidade mínima:
  contraste WCAG 2.1 AA entre texto e fundo nos modos claro/escuro —
  **4,5:1 para texto normal** (corpo, legenda, entrada de formulário) e
  **3:1 para texto grande** (display, títulos) — (decisão registrada em
  Clarifications, 2026-11-06), e tamanho de corpo confortável à leitura em
  telas de uso típico do painel (desktop e tablet). Pisos quantitativos,
  consistentes com a refatoração fiel: **corpo principal ≥ 14px** e
  **texto de apoio/código ≥ 12px** — nenhum token da escala pode ficar
  abaixo desses pisos (decisão registrada em Clarifications, 2026-11-06).
- **FR-015**: os títulos das telas MUST seguir hierarquia semântica de
  documento (não apenas hierarquia visual): o nível visual da escala
  (h1..h6) DEVE corresponder ao nível semântico do documento, e a
  estrutura anunciada a leitores de tela DEVE seguir ordem lógica
  (página → seção → subseção), sem pular níveis ou usar tamanho como
  marcador de papel.
- **FR-016**: a escala MUST responder às preferências de acessibilidade do
  navegador (tamanho de fonte/zoom), preservando legibilidade e informação
  essencial em 200% de zoom.

### Key Entities *(include if feature involves data)*

- **Token tipográfico**: entrada nomeada na escala canônica; atributos:
  nome do nível (display, título 1–6, corpo, legenda, código), tamanho,
  altura de linha, peso, espaçamento de letra, cor (por modo claro/escuro)
  e a variante tabular aplicável (apenas para contexto numérico/tabela).
- **Escala canônica**: a coleção completa e única de tokens, definida em
  um único ponto de fundação de estilo; é o contrato de UI consumido por
  todas as features seguintes.
- **Contexto de uso**: categoria de texto do painel (título de página,
  navegação, formulário, feedback, tabela, código…) mapeada
  unicamente a um token pela regra de uso documentada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: auditoria da superfície existente (login, shell, moldura e
  placeholders + componentes compartilhados) revela **100%** dos textos
  consumindo tokens da escala — zero valores tipográficos ad hoc fora do
  módulo de fundação `src/shared`.
- **SC-002**: auditoria de rede em uso normal do painel registra
  **zero requisições de fonte a serviços externos de terceiros (CDN)**.
- **SC-003**: a troca da família tipográfica é executada alterando
  **exatamente 1 ponto** de decisão, sem editar telas nem componentes, e
  todas as telas refletem a troca consistentemente.
- **SC-004**: **100%** dos contextos de texto existentes nas telas de hoje
  (títulos, navegação, formulários, feedback, tabelas, código) têm regra
  de uso documentada mapeando a um token único, verificada por leitura
  das regras contra as telas.
- **SC-005**: com leitor de tela, a estrutura de títulos anunciada nas
  telas segue hierarquia lógica em **100% das telas existentes** (sem
  pulos de nível, sem papel definido só por tamanho de letra).
- **SC-006**: os tokens de número/tabela com dígitos tabulares, usados em
  uma coluna de dados numéricos de dígitos variados, alinham verticalmente
  dígito a dígito em **100% das verificações** (e ficam disponíveis para a
  SPE-07 sem ajuste adicional).
- **SC-007**: em 200% de zoom/tamanho de fonte do navegador, **nenhuma
  tela existente** perde informação essencial ou fica com layout
  impeditivamente quebrado (verificação nos dois modos claro/escuro).

## Assumptions

- **Baseline atual (2026-11-06):** o painel já carrega Geist e Geist Mono
  via mecanismo nativo de fontes do framework de aplicação (next/font),
  expostos como `--font-sans`/`--font-mono` no tema global; a decisão de
  família tipográfica da FR-001 pode **ratificar** ou **substituir** essa
  escolha — a spec exige apenas que seja única, documentada e sem CDN.
- A escala canônica é de **tipografia**; cores gerais de superfície,
  espaçamento e outros tokens de design NÃO são escopo desta feature —
  apenas as cores directamente associadas a cada token tipográfico.
- A stack sancionada pela constituição (Constraint 1) já cobre o
  mecanismo de entrega dos tokens (tema global do Tailwind CSS 4 em
  `src/app/globals.css`); nenhuma nova dependência é necessária (RNF15,
  Princípio III).
- Os componentes/telas listados na FR-009/FR-010 são a superfície
  completa existente hoje (confere com `src/` em 2026-11-06); features
  futuras (SPE-02..07) entram já no contrato, sem retrabalho de
  refatoração.
- O painel tem modos claro/escuro já previstos no tema global (alternância
  exclusivamente via `prefers-color-scheme` — media query; sem alternador
  manual nesta feature, decisão registrada em Clarifications, 2026-11-06);
  a cor dos tokens tipográficos é expressa nos dois modos e a validação
  (SC-007) emula a preferência do sistema operacional.
- Este é um refinamento de fundação de UI (SPE-08, ordem 8 de
  `docs/SPECS.md`): paralela a SPE-02/03, dependente apenas da SPE-01;
  não toca em requisitos funcionais de RF nem cria endpoint/contrato de
  API (não há contrato de API nesta feature).
