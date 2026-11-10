# Research: Gerenciamento de Eventos (SPE-04)

**Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Sem NEEDS CLARIFICATION no contexto técnico da spec (clarificações de
2026-11-10 já registradas: datas passadas, páginas dedicadas, fallback de
ponto removido, seletor com todas as páginas). As incertezas restantes são
**pendências de contrato por probe** — executadas contra a API real na
implementação (padrão SPE-02 T005 / SPE-03 T004). Este documento consolida
as decisões de design (D1–D8) e encerra com o re-check dos gates.

## D1 — Camada de dados: TanStack Query + túnel BFF (client-side)

- **Decision**: leitura e mutações 100% client-side por TanStack Query
  sobre o túnel BFF (`src/shared/lib/bff.ts`), como na SPE-02 rodada 2 e
  SPE-03. Página fina Server Component só para montar a view client e
  `metadata`.
- **Rationale**: padrão estabelecido e revisado duas features seguidas;
  sessão/token permanecem server-side (Princípio III); caches por
  `queryKey` composto dão revisitas instantâneas (SC-001). Server-side
  (`http.ts`) não é necessário — o painel não precisa de dados na árvore
  do Server Component.
- **Alternatives considered**: server components + `http.ts` para a
  listagem (rejeitado: quebraria o padrão único do projeto e a
  invalidação das mutações sem benefício real — volume acadêmico).

## D2 — Sem endpoint de detalhe: edição resolve o evento pela listagem

- **Decision**: o contrato **não expõe `GET /api/v1/events/{id}`** — a
  rota de edição carrega o evento via `GET /api/v1/events` (lista única,
  sem paginação) localizando pelo `id` recebido de `[eventId]`; hook
  `useEventQuery(eventId)` encapsula isso com a MESMA `queryKey` base
  `["events"]` (find sobre o cache quando presente).
- **Rationale**: lista única sem paginação tornava o `find` equivalente e
  evita inventar endpoint (Princípio I — nenhuma invenção). Se o backend
  um dia expuser o detalhe, o hook troca o interno sem tocar na UI.
- **Alternatives considered**: pedir endpoint novo ao backend (rejeitado
  nesta fase: contrato já fechado em 2026-11-10; anotado como evolução
  possível em `contracts/events-api.md`).

## D3 — Rotas dedicadas (clarificação FR-013) — padrão novo vs. diálogos da SPE-03

- **Decision**: `admin/events` (listagem), `admin/events/new` (cadastro) e
  `admin/events/[eventId]/edit` (edição) — páginas dedicadas, como decidiu
  o owner na clarificação 2026-11-10 (Opção A).
- **⚠️ Correção de registro**: a recomendação apresentada na clarify citou
  "padrão da SPE-03" — **inexato**: a SPE-03 na prática usa
  `SpotFormDialog` (diálogos, T009/T019). A decisão do owner permanece
  válida e preferida (roteável por URL, mais simples de tornar acessível,
  edição carrega o evento via rota), mas é um **padrão novo** no projeto.
  A frase "padrão da SPE-03" foi removida da spec em correção honesta
  (ver nota no fim deste arquivo). Consequência aceita: a experiência de
  formulário diverge entre os dois módulos irmãos até eventual unificação.
- **Rationale**: URL direta a um recurso editável (deep-link, histórico)
  e superfície de teclado mais simples que um diálogo longo.
- **Alternatives considered**: modal unificado (rejeitado — decisão do
  owner); modal só para edição (rejeitado — mistura de padrões pior).

## D4 — Filtro server-side por `spotId` na listagem (FR-003)

- **Decision**: o filtro aplica `GET /api/v1/events?spotId=<id>` (parâmetro
  do contrato) — nenhum recorte local. `queryKey` composto
  `["events", spotId|null]` (cache por filtro).
- **Rationale**: FR-003 exige server-side; o contrato suporta nativamente
  (diferente da limitação de categoria da SPE-03).
- **Alternatives considered**: filtro client-side sobre a lista total
  (rejeitado — violaria FR-003).

## D5 — `ConfirmDeleteDialog` elevado a componente transversal (Princípio IV)

- **Decision**: `ConfirmDeleteDialog` saí de
  `src/features/attractions/components/` e passa a viver em
  `src/shared/components/ConfirmDeleteDialog/`, generalizado (props:
  `title`, `bodyDescription`, rótulos dos botões — em vez de acoplar
  `SpotView`); SPE-03 passa a importar do lugar novo com os mesmos textos.
- **Rationale**: a constituição manda reusar componentes transversais
  antes de criar novos — duplicar o diálogo de confirmação na feature
  events seria violação direta (Princípio IV). Evento é o segundo
  consumidor real; a generalização é a evolução natural.
- **Risks**: mudança em código da SPE-03 — mitigado pelo gate `pnpm
  build`/`pnpm lint` cobrindo o repositório inteiro (Constraint 6) e por
  a SPE-03 já ter sido entregue/revisada.
- **Alternatives considered**: importar o componente acoplado a `SpotView`
  de outra feature (rejeitado: acoplamento feio e enganoso); duplicar
  (rejeitado: viola Princípio IV).

## D6 — Catálogo de pontos e resolução de nomes: reuso de parsers da SPE-03

- **Decision**: o seletor (`SpotSelector`) e a resolução de nomes da
  listagem usam os **parsers e constantes de
  `@/features/attractions`** (`parseSpotListResponse`, `SPOT_PAGE_SIZE`)
  via import entre features — nenhum parser de `SpotView` duplicado. Novo
  hook `useSpotCatalogQuery` (na feature events) laça todas as páginas
  (`page` incrementando até esgotar, `pageSize` máximo permitido) e
  publica `SpotView[]` completo num cache único.
- **Rationale**: FR-006 (todas as páginas) + RNF06 (nada fixado) +
  Princípio IV (nenhum utilitário duplicado). A listagem de eventos exibe
  nome via `spot-id→SpotView` resolvido do MESMO catálogo em cache (nada
  de chamada duplicada); fallback "ponto turístico não encontrado" só
  ocorre se o `spotId` não estiver no catálogo completo (ponto removido +
  cascata não apagando eventos — pendência 4 do probe).
- **Alternatives considered**: `useSpotsQuery` diretamente da SPE-03 com
  paginação manual na UI (rejeitado: estado de laço espalhado); parser
  duplicado (rejeitado: Princípio IV); endpoint não-paginado no backend
  (rejeitado nesta fase — contrato fechado; evolução possível anotada).
- **Probe associado**: confirmar `pageSize` máximo efetivo (contrato
  admite até 100) e comportamento de esgotamento da listagem
  (pendência do probe T-probe, junto com as da spec).

## D7 — Formulário: RHF + Zod, data `date` pura, preço monetário

- **Decision**: `EventForm` único (não wizard) sobre React Hook Form +
  Zod com o contrato: `spotId` (número ≥ 1 — seletor obrigatório),
  `occurrenceDate` (`^\d{4}-\d{2}-\d{2}$`, sem validação de período —
  clarificação Q1; datas passadas permitidas), `description` (1–2000),
  `ticketPrice` (número ≥ 0, normalizado para 2 casas — ex.:
  `Math.round(x*100)/100` do valor parseado; zero = gratuito). Submit
  envia preço como `number` JSON (contrato aceita number|string — probe
  2 registra o padrão adotado).
- **Rationale**: mesmos primitivos da SPE-03 (RHF+Zod instalados);
  limite 2000 vem do contrato; exibição pt-BR (`Intl.NumberFormat`
  moeda, `Intl.DateTimeFormat` data) — formatação é apresentação, não
  dado fixado (RNF06).
- **Alternatives considered**: enviar string de preço (rejeitado:
  número é o tipo canônico de leitura — `EventView` tem number; probe
  confirma a escrita); wizard (rejeitado pelaclarificação/Assumption).

## D8 — Edição parcial por diff (PATCH) e desfechos 404/409

- **Decision**: `useUpdateSpotMutation` análogo para eventos: o formulário
  conhece o `EventView` atual e envia SOMENTE os campos alterados
  (`EventUpdateBody` parcial — contrato: omitidos permanecem; patch vazio
  é no-op 200). 404 (evento/ponto removido) e 409 (ponto fechado
  permanentemente, POST e PATCH) viram mensagens acionáveis que preservam
  os dados digitados (FR-010); classificação em `api-error.ts` + textos
  pt-BR em `messages.ts` (padrão I1 da SPE-03).
- **Rationale**: contrato define a semântica parcial; diff mínimo evita
  sobrescrever campos com estado obsoleto (menor janela de conflito entre
  sessões).
- **Alternatives considered**: enviar formulário completo no PATCH
  (rejeitado: desalinhado ao contrato — "ALL fields optional; omitted
  stay unchanged" — e sobrescreve estados alheios).

## Pendências por probe (primeiras tasks da implementação)

Padrão da SPE-02 T005 / SPE-03 T004 — credenciais de seed do admin,
sessão real via túnel BFF, resultados registrados em
`contracts/events-api.md` antes das tasks de UI dependerem deles:

1. Corpos/códigos do erro unificado em 401/403/404/409/422 nos 4 endpoints
   de evento (o OpenAPI lista só 422 explicitamente).
2. Aceitação real de `ticketPrice` como string no POST/PATCH (contrato
   permite; painel enviará number — confirmar e registrar padrão).
3. Corpo real do 409 (ponto "fechado permanentemente") em POST e PATCH —
   `errorCode` e mensagem.
4. `DELETE /api/v1/tourist-spots` com eventos pendentes: erro, cascata ou
   órfão (define a real frequência do fallback "ponto turístico não
   encontrado" — FR-012).
5. Complementar (D6): `pageSize` máximo efetivo da listagem de spots e
   critério de esgotamento (item count menor que pageSize).

## Re-check dos gates pós-Phase 1 (Constitution Check)

- I/II/III: parsers puros, sem endpoint inventado (D2), nenhuma regra de
  negócio no cliente (Q1/D7/D8), token só server-side — como registrado
  no plan (✅).
- IV: módulo próprio + rotas na árvore; transversais reusados; parser
  NÃO duplicado (D6); `ConfirmDeleteDialog` elevado (D5) — pequena
  mudança transversal aprovada pelo gate de build (✅).
- V: confirmação de remoção nomeando o evento (vínculo resolvido + data),
  estados distintos, trava de duplo envio (✅).
- Constraints 1–6: zero dependência nova; docs vigentes do framework
  lidas antes do código; túnel único; build/lint gate (✅).

**Conclusão**: sem violações; `Complexity Tracking` vazio.

---

### Correção registrada nesta research (transparência)

A recommendação da clarify 2026-11-10 (Q2) atribuía a padrão "página
dedicada" à SPE-03; a implementação real da SPE-03 usa diálogos
(`SpotFormDialog`). A decisão do owner (páginas dedicadas) permanece
válida e segue FR-013; a expressão "padrão da SPE-03" foi removida de
`spec.md` (secção FR-013 e Clarifications) nesta correção, a fim de não
propagar o erro para `/speckit-analyze` ou `tasks.md`.
