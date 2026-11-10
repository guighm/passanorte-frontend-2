# Research: Rotas Turísticas e Estoque de Brindes (SPE-05)

**Feature**: specs/006-routes-gifts-inventory | **Date**: 2026-11-10
**Base**: spec.md (4 clarificações do owner registradas em Clarifications)
+ contrato REAL extraído do OpenAPI em 2026-11-10 (tag `Gamification`).

## D1 — Nome do módulo e rotas do App Router

**Decision**: módulo `src/features/tours`; rotas `(panel)/admin/tours`
(listagem), `(panel)/admin/tours/new` e `(panel)/admin/tours/[routeId]/edit`
(páginas dedicadas — clarificação Q1 da spec). **Sem** página de detalhe em
leitura (clarificação da 2ª sessão): listagem + edição são as únicas
superfícies de leitura, e o ajuste de estoque acontece na linha da listagem.

**Rationale**: o placeholder `admin/tours` já existe na árvore do Princípio
IV desde a SPE-01 e o RBAC de superfície (`roleCanAccess`) já cobre o
prefixo — o módulo herda isso substituindo o placeholder. O nome do módulo
segue a **árvore de rotas** (única fonte de verdade da navegação); a
entidade canônica permanece "rota turística" (`TouristRoute`), como no
contrato — a divergência módulo/entidade é registrada aqui para não gerar
inconsistência no analyze. Páginas dedicadas reeditam o padrão da SPE-04
(preferência owner mais recente que o wizard da SPE-03); a lista reordenável
pede espaço e teclado confortáveis, reforçando dedicated pages com URL
própria para a edição.

**Alternatives considered**: módulo `src/features/routes` — rejeitado:
criaria segunda raiz de navegação (`admin/routes`) fora da árvore
sancionada pelo Princípio IV; wizard em diálogo estilo SPE-03 — rejeitado
pela clarificação Q1 (owner preferiu página dedicada) e pelo custo de
colocar a lista reordenável em diálogos.

## D2 — Catálogo de pontos do formulário: reuso cross-feature

**Decision**: reusar `useSpotCatalogQuery` (catálogo completo, todas as
páginas), `SpotSelector` e `spot-name` (resolução `spotId`→nome com fallback
identificável) importados de `@/features/events`, e `parseSpotListResponse`
de `@/features/attractions` — sem duplicar nada.

**Rationale**: cadeia de reuso no **mesmo formato sancionado na SPE-04**
(events → attractions): nenhum parser duplicado de `SpotView`, catálogo em
cache único compartilhado (uma carga por sessão, SC de performance do
plan). `spot-name.ts` da SPE-04 já resolve exatamente o caso de fallback
("ponto turístico não encontrado") exigido pela FR-013 da spec. Duplicação
de utilitário é violação direta do Princípio IV.

**Alternatives considered**: elevar `useSpotCatalogQuery`/`SpotSelector` a
`src/shared` — rejeitado nesta feature: shared/components é para
componentes transversais reusados antes de novos e shared/lib para
utilitários; hooks de dados vivem em features. Se uma terceira feature
necessitar, a elevação será avaliada lá (mesma régua usada com
`ConfirmDeleteDialog`).
**Risco registrado**: import de componente client-side cross-feature
(`SpotSelector` de `@/features/events/components`) — precedido pela
SPE-04, que importa parsers/hook de `@/features/attractions`; conferir no
analyze que não há acoplamento de estado entre os módulos (apenas leitura
de catálogo).

## D3 — Reordenação por botões subir/descer

**Decision**: `RouteSpotList` reordena por botões por item (subir/descer),
operáveis por **teclado e ponteiro**, com a posição 1..n visível; duplicatas
impedidas no seletor (item já na lista fica indisponível); serialização do
`displayOrder` derivada do índice da lista no submit (1..n sem lacunas).

**Rationale**: clarificação Q3 (owner): apenas botões — sem arrastar-e-soltar,
sem dependência nova (Constraint 1: nova biblioteca exigiria justificativa).
Botões atenderam acessibilidade mínima na SPE-03 (mesma mecânica de
reordenação por botões do wizard) e FR-016. O `displayOrder` é derivado e
não editável diretamente — o estado é a própria ordem da lista.

**Alternatives considered**: drag-and-drop (`dnd-kit`) — rejeitado pela
clarificação ( custo de implementar DnD acessível + dependência nova);
campo numérico editável de posição — rejeitado: permite lacunas/duplicatas
de ordem, exigindo normalização adicional sem ganho.

## D4 — Brinde: nascimento embutido, não editável, estoque ajustável à parte

**Decision**: o formulário `new` embute o brinde (`prize: { name,
initialStock }`); o formulário `edit` exibe nome do brinde e estoque como
apenas-leitura com apontamento para o ajuste via listagem; mutações de rota
NUNCA enviam campo de brinde (contrato: `RouteUpdateRequest` não o aceita).
`PATCH /gamification/prizes/{id}` é a única via de mudança de saldo
(`RouteStockDialog`, ação da linha).

**Rationale**: contrato real — o brinde nasce com a rota (F1 do backend),
não há POST/GET de prizes independente; criar catálogo de brindes na UI
seria invenção violando o Princípio I. A baixa na concessão (RF21) é do
backend — FR-004 da spec/Princípio II: o painel reflete `stockQuantity`
retornado; invalidação da query `["routes", …]` após `useUpdatePrizeStockMutation`
e após `useArchiveRouteMutation` garante saldos recém-concedidos
refletidos na próxima leitura.

**Alternatives considered**: habilitar edição de nome do brinde no PATCH —
rejeitado: o contrato não aceita; ajuste de estoque em página própria —
rejeitado pela clarificação da 2ª sessão (ação na linha da listagem).

## D5 — Arquivamento (remoção) e alternador de arquivadas

**Decision**: remoção usa o `ConfirmDeleteDialog` transversal (SPE-04) com
texto que descreve o **efeito real** — arquivamento com histórico
preservado, não exclusão física — nomeando a rota. Após 204: invalidação
de `["routes", includeArchived]` (as duas variantes) e feedback de sucesso.
Listagem tem alternador "exibir arquivadas" que alterna
`includeArchived=true` na query (admin-only no contrato — o painel inteira
área já é admin-only, FR-001). Linhas arquivadas: status identificável,
ação de editar e ajustar estoque **não ofertadas** (backend nega com 404 —
probe confirmará), ação de arquivar desaparece.

**Rationale**: contrato — `DELETE` arquiva (Removal Decision do backend) e
`includeArchived` é admin-only; rotas arquivadas não são editáveis (404).
Ocultar a possibilidade na UI evita levar o operador a um erro garantido.
Mensagem de confirmação alinhada ao Princípio V (efeito real, não
"excluir" enganoso).

**Alternatives considered**: confirmar com digitação do nome (padrão de
revogação da SPE-02) — rejeitado nesta feature: o arquivamento é reversível
por natureza (histórico preservado) e menos destrutivo que revogação de
credencial; confirmação simples com descrição clara basta. Reativação
(unarchive) — rejeitado: o contrato não possui endpoint de reativação.

## D6 — Indicador de saldo (esgotado em destaque)

**Decision**: `prize-label.tsx` exibe `stockQuantity` como número com rótulo
pt-BR ("em estoque"); saldo 0 recebe destaque visual próprio ("esgotado"),
não confundível com saldo positivo (clarificação Q2: nenhum limiar
adicional de "estoque baixo"). Arquivadas mantêm o saldo visível (leitura
do estado histórico).

**Rationale**: SC-002 da spec (distinguível sem ler mensagens auxiliares);
simplicidade acordada na clarificação — um único estado especial. Rótulo e
destaque são UI-local; o número é **sempre** o da API (sem cálculo no
cliente — FR-004).

## D7 — Contrato real e pendências de probe

**Decision**: `contracts/gamification-api.md` registra o contrato REAL
(OpenAPI 2026-11-10): POST/GET/PATCH/DELETE de `/gamification/routes*` +
`GET /routes/{id}` + `PATCH /gamification/prizes/{id}`; schemas
`RouteCreateRequest`, `RouteUpdateRequest`, `TouristRouteView`,
`RouteSummaryView`, `RoutePrizeView`, `PrizeStockUpdateRequest` e o shape
de `RedemptionView` (referência — RF21 fora do escopo). Quatro pendências
com **probe obrigatório na primeira task** (padrão SPE-02 T005 / SPE-03 T004 /
SPE-04): (P1) valores exatos de `status` (ativa × arquivada); (P2) efeito
do `DELETE /api/v1/tourist-spots/{id}` sobre rotas que referenciam o ponto
(a rota continua listada? `spotId` órfão aparece? spotCount muda?); (P3)
`PATCH /gamification/prizes/{id}` para brinde de rota arquivada (200 ou
404?); (P4) mensagem/payload do 422 de estoque abaixo das reservas
comprometidas (e forma de apresentar ao operador).

**Rationale**: o Swagger está acessível e os quatro pontos não são
deriváveis do schema estático — comportamento em runtime define mensagens
da UI e regras do alternador. Probe em sessão admin real via túnel BFF,
registrando resultados no arquivo de contrato antes da UI depender deles.
Este feature já parte melhor que a SPE-04: o contrato está inteiro no
OpenAPI e não é baseline especulado.

**Alternatives considered**: decidir status/erros por inferência —
rejeitado: contraria o padrão de probes consolidado e arriscaria
mensagens erradas.

## D8 — RBAC de superfície

**Decision**: nenhuma guarda nova: `admin/tours*` já está coberto pelo RBAC
de superfície da SPE-01 (`roleCanAccess`/`homePathForRole` — área admin) e
a substituição do placeholder não altera o prefixo. A autorização final
segue no backend (403 → mensagem acionável via `api-error.ts`).

**Rationale**: Princípio II/IV; nenhuma nova regra de papel nesta feature
(spec FR-001 exige apenas reforço, que a subsituição do placeholder e o
reuso do guarda já entregam).

## D9 — Mensagens de erro pt-BR

**Decision**: `features/tours/api/messages.ts` segue o padrão
`describeActionFailure` da SPE-04 (classes base em `shared/lib/api-error.ts`),
estendido para os casos novos do contrato: 404 "ponto turístico não
encontrado" no create/edit (traduz a referência inválida — Edge Case da
spec), 422 de estoque abaixo de reservas (P4), 403/401 via classes
compartilhadas (`SESSION_ENDED_PATH` reexportado), 404 de rota
desconhecida/arquivada em edição.

**Rationale**: consistência com as features 02–04; pendências P1–P4
alimentam o mapa de mensagens após o probe.

## D10 — Gates pós-Phase 1 (reavaliação da Constituição)

| Princípio | Pós-design | Status |
| --- | --- | --- |
| I. Contrato único | `contracts/gamification-api.md` REAL; sem catálogo de brindes inventado; parsers puros | ✅ Pass |
| II. Backend autoridade | Baixa de estoque/concessão e arquivamento são do backend; guarda de reservas backend; UI reflete | ✅ Pass |
| III. Sessão/dados | Token só server-side; sem LGPD/sensores | ✅ Pass |
| IV. Feature-based | Módulo `tours` na árvore sancionada; reuso cross-feature no formato da SPE-04 (`events`, `attractions`); nada duplicado; nada fixado no código | ✅ Pass |
| V. Estados de UI | Listagem/formulário/dialog com loading/vazio/erro/sucesso distintos; confirmação nomeia rota + efeito real; esgotado destacado | ✅ Pass |
| Constraints 1–6 | Zero dependência nova; docs Next 16 consultadas no implement; túnel único; build/lint como pronto; a11y de teclado nas ações da lista (D3) | ✅ Pass |

Nenhuma mudança transversal; nenhuma elevação a shared necessária nesta
feature. Sem violações a justificar.
