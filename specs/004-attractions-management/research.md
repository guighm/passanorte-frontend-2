# Research: Gerenciamento de Pontos Turísticos (SPE-03)

**Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## D1. Caminho de dados: herda o padrão client-side da SPE-02 (TanStack Query + túnel BFF)

- **Decision**: leitura/mutações via `src/shared/lib/bff.ts` + TanStack
  Query (provider `QueryProviders` já montado no layout do painel);
  `queryKey` composto por página/filtros para cache por consulta;
  invalidação em `["spots"]` (ou página vigente) após mutação bem-sucedida
  (FR-007). Página fina Server Component renderiza o view client.
- **Rationale**: padrão ratified na SPE-02 REVISÃO 2 (owner) — D10 de
  `specs/003-employee-management/research.md`; Constraint 5 (caminho único).
- **Alternatives considered**: Server Functions + `revalidatePath`
  (rodada 1 da SPE-02) — rejeitado: supersado pelo owner; manteria dois
  padrões de camada de dados no painel.
- **Cache granular**: `["spots", page, status]` — cada página/filtro é uma
  entrada de cache (revisita instantânea); mutações invalidam a consulta
  ativa. Categoria: filtro client-side sobre a página carregada (limitação
  registrada na spec — não compor queryKey com ela).

## D2. Mapa: `@vis.gl/react-google-maps` 1.10.2 (RODADA 1 — SUPERSEDED pela
emenda 2.0.0, ver **D12** abaixo; mantida como histórico)


- **Decision**: seletor de localização encapsulado num único componente
  **`SpotMapPicker`** (`src/features/attractions/components/SpotMapPicker.tsx`)
  — a integração de mapa é definida UMA VEZ nesta spec (Constraint 3) com
  interface mínima: props `{ latitude, longitude | null, onChange(lat,lng) }`
  + estado interno de mapa indisponível.
  - `APIProvider apiKey={NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}` (prop
    `apiKey` confirmada obrigatória nos tipos da lib) envolvendo `Map`
    (`zoom` moderado, `gestureHandling: "greedy"`).
  - Posição escolhida via `Map.onClick` (`MapMouseEvent.detail.latLng`
    — confirmado nos tipos) renderizada com `Marker` clássico (não
    `AdvancedMarker`, que exige `mapId` de vetor — evita configuração extra).
  - **Sem chave (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` ausente)**: o picker
    renderiza fallback acessível (só digitação manual de coordenadas +
    aviso discreto) — nunca chave hardcoded, nunca crash.
- **Rationale**: biblioteca sancionada (Constraint 1/3) e instalada;
  decisão explícita do owner; SPE-07 (heatmap) reusa o mesmo APIProvider
  /configuração via este componente.
- **Alternatives considered**:
  - OpenStreetMap/Leaflet em 2026-11-06 rodada 1 (RNF18 permite
    "Google Maps ou OSM" — a constituição então FIXava Google Maps, Constraint 3: "Não há segunda
    integração nem substituição por OSM sem emenda") — rejeitado pela
    constituição.
  - `AdvancedMarker`/`markerClusterer` (exige `mapId`) — rejeitado nesta
    fase (configuração extra sem ganho para um marcador editável).
  - Lib de formulário de geocoding (Places Autocomplete) — rejeitado:
    custo/billing adicional de API não previsto (RNF15); entrada manual +
    marcador cobre o RF11; pode ser emenda futura.
- **Centro inicial (FR-009/clarificação)**: cadastro de ponto novo usa a
  localização do primeiro spot da listagem vigente como centro; sem dados,
  visão padrão da lib; em edição, centro é a posição atual.

## D3. Parsers e enum fechado (Princípio I)

- **Decision**: `contract.ts` com parsers puros (padrão `contract.ts` da
  SPE-02): `parseSpotView` (id int positivo; name/description/latitude/
  longitude/status strings→números; categories array de strings não-vazias;
  schedule entradas `{weekday, opensAt, closesAt}` com HH:MM `^\d{2}:\d{2}$`;
  createdAt/updatedAt strings date-time; toleranceRadiusM numérico>0 ou
  null), `parseSpotListResponse` ({items,total,page,pageSize}), enum
  **fechado** `SpotStatus` (`"open" | "temporarilyClosed" |
  "permanentlyClosed"` — valores desconhecidos ⇒ `ContractViolationError`,
  nunca badge inventado). Divergência ⇒ erro com endpoint+campo.
- **Alternatives**: importar types gerados do OpenAPI — rejeitado (nenhum
  gerador configurado; parsers escritos à mão seguem o padrão do projeto).

## D4. Paginação e filtros (FR-003/FR-004/FR-006)

- **Decision**: paginação **server-side** obrigatória (queryKey por
  `page`/`pageSize`/`status`); controles prev/next respeitam
  `total`/`page`/`pageSize` retornados; filtro `status` por query param do
  contrato; filtro por **categoria** aplicado na exibição (client-side)
  sobre a página carregada — registrado como limitação, sem fingir
  server-side; com filtro por categoria ativo, paginação continua sobre
  os dados filtrados da página vigente.
- **Rationale**: o contrato só expõe `status/page/pageSize` (OpenAPI real);
  inventar parâmetro de categoria violaria Princípio I. Enriquecimento
  server-side futuro = emenda de contrato.

## D5. Catálogo de categorias (FR-010, clarificação)

- **Decision**: seletor alimentado por `GET /api/v1/tourists/interest-
  categories` (via túnel, `useSpotCategoriesQuery` — cache próprio
  `["spot-categories"]`); **probe obrigatório** como primeira task da
  implementação: com sessão admin, confirmar se as chaves de categoria
  usadas nos spots correspondem às chaves do catálogo e obter rótulos em
  português (`{key, label}`); divergência ⇒ registrar em
  `contracts/spots-api.md` e alinhar com o backend ANTES das tasks de
  formulário. Sem catálogo ⇒ estado de erro acionável no seletor (nunca
  hard-code, RNF06).

## D6. Formulário unificado (create|edit) e editor de cronograma

- **Decision**: `SpotFormDialog` único (padrão `EmployeeFormDialog`
  da SPE-02) RHF+Zod com limites espelhados do contrato; `ScheduleEditor`
  como bloco reutilizável dentro do diálogo (por dia: selecionar dias +
  opensAt/closesAt `HH:MM` com input `type="time"` validado); envio
  **parcial em edição** (somente campos alterados — FR-012; `schedule`
  resubmitido inteiro quando alterado, pois é lista).
- **Rationale**: minimiza duplicação; contratos de create/update diferem
  apenas por nullability.

## D7. Pendências do contrato → probe na implementação

- **Status**: vocabulário de `weekday` (ex.: "monday" vs "segunda"),
  `errorCode`s (coordenada fora de faixa, 404 em DELETE de removido),
  correspondência de chaves do catálogo (D5), comportamento de DELETE de
  id inexistente — resolvidos por **probe na implementação**, exatamente
  como SPE-02 T005; credenciais de seed do admin NUNCA em artefatos.
- **Interim design**: enquanto não confirmado, o form usa vocabulário
  de weekday definido pela UI e mapeia para `SpotScheduleEntryInput`
  (o backend aceita string livre); o compare de contrato (T018
  equivalente) fixa o valor.

## D8. Erros e mensagens (transversal)

- **Decision**: reusar `src/shared/lib/bff.ts` + `api-error.ts`
  (classificador único, SPE-02 rodada 2) e, com a remediação I1 do
  analyse, **extrair `failureFromError` para `api-error.ts`** (mapeamento
  de classes→falha COMPARTILHADO — sem duplicação com a SPE-02, cujo
  `messages.ts`
  também passa a consumi-lo); o `messages.ts` da feature fica só com
  `describeActionFailure` — mensagens pt-BR específicas de
  spot (duplicado N/A; foco em validação de coordenadas/horários/campos,
  404 de removido, divergência de contrato). 401 ⇒ login; 403 ⇒ estado de
  erro da ação.

## D9. Guardas e RBAC (FR-001)

- Rota `/admin/attractions` já coberta pelas guardas `/admin/*` da
  SPE-01 (roles admin-only, navegação condicional) — sem código novo de
  RBAC; 403 tratado como estado de erro de ação (Princípio II).

## Resumo de decisões cruzadas

| # | Decisão | Impacto nas tasks |
| --- | --- | --- |
| D1 | TanStack Query + bff.ts (padrão SPE-02) | queries.ts antes das telas |
| D2 | SpotMapPicker único (@vis.gl 1.10.2; Marker clássico; fallback sem chave) | componente antes do formulário; reuso SPE-07 |
| D3 | Parsers puros + SpotStatus fechado | contract.ts antes da UI |
| D4 | Paginação server-side; filtro categoria client-side | controles na listagem; limitação registrada |
| D5 | Catálogo = interests + probe | probe antes do formulário |
| D6 | Form unificado + ScheduleEditor | componentes do diálogo |
| D7 | Pendências por probe (weekday/errorCodes) | probe T inicial; compare de contrato no fim |
| D8 | Erros via bff/api-error/messages | reuso da SPE-02 |
| D9 | Guardas herdados | sem código novo de RBAC |

---

## D12. Emenda constitucional 2.0.0 — migração do mapa para OpenStreetMap (`react-leaflet`/`leaflet`)

- **Contexto**: com billing real exigida pelo Google (pré-pago de R$200 na
  billing brasileira), o owner decidiu (2026-11-06) migrar para OSM —
  alternativa gratuita e open source prevista desde o RNF18 ("Google Maps
  ou OSM"). **Emenda MAJOR 2.0.0** da constituição (Constraint 3 redefinida
  incompativelmente): `@vis.gl/react-google-maps` desinstalada;
  `react-leaflet` 5 + `leaflet` 1.9 (+ `@types/leaflet`) sancionadas; cópia
  `docs/CONSTITUTION.md` sincronizada.
- **Decision**: `SpotMapPicker` reescrito com **interface de props
  PRESERVADA** (`{latitude, longitude, fallbackCenter, onChange}` — SPE-07
  herda sem mudanças): `MapContainer` + `TileLayer` OSM (tiles gratuitos
  com attribution legal) + `Marker` (ícone do próprio bundle, sem CDN) +
  `useMapEvents({ click })` e `Marker draggable/dragend`; **sem SSR**
  (leaflet exige `window` — render pós-mount com skeleton anunciável,
  Princípio V); centro inicial/zoom idênticos à rodada Google
  (edição = posição atual; cadastro = primeiro ponto; fallback global).
- **Alternatives considered**: manter fallback manual sem mapa (rejeitado —
  perder UX com alternativa gratuita disponível); MapLibre (mais
  configuração para o mesmo ganho); Google iframe embed sem chave
  (não é picker).
- **Princípios preservados**: RNF15 (grátis), RNF18 (OSM previsto),
  Princípio III (nada de chave; ícones via bundle, attribution legal
  mantida), Constraint 3 (uma única integração, reuso na SPE-07).

**Resumo de decisões — atualizado:**

| # | Decisão | Impacto |
| --- | --- | --- |
| D12 (novo) | OSM/react-leaflet conforme emenda 2.0.0 | SpotMapPicker migrado; SPE-07 OSM |
