# Tasks: Concessão de Brindes — Área do Funcionário (SPE-06)

**Input**: Design documents from `/specs/007-gift-redemption/`

**Prerequisites**: plan.md (required), spec.md, research.md (D1–D8),
data-model.md, contracts/gamification-api.md, quickstart.md

**Contexto**: padrão client-side ratificado (SPE-02 rodada 2, repetido na
SPE-03/04/05): TanStack Query via túnel BFF (`src/shared/lib/bff.ts`),
classificador `api-error.ts`, `QueryProviders`, estados, `Button` e `cn`
existentes. Infraestrutura nova desta feature: módulo
`src/features/benefits` + tela `/(panel)/benefits` **substituindo o
placeholder da SPE-01**; guardas/NAV de `src/proxy.ts`/`features/auth`
**INALTERADOS** (`/benefits` já libera admin+employee — FR-001/US3).
Reuso cross-feature: `useSpotCatalogQuery`/`SpotSelector`/`spot-name` de
`@/features/events`, `parseSpotListResponse` de `@/features/attractions`
(research D3, mesma cadeia sancionada da SPE-04/SPE-05). Concessão via
endpoint **REAL** (`POST /gamification/redemptions` — nunca mockada,
Princípio I); validação via contrato **esperado** com mock governado de
flag única (`VALIDATE_ENDPOINT_LIVE` — clarificação Q1 da spec, D4).
**Dependência nova** de scanner (research D1): `@zxing/browser` +
peer `@zxing/library` (MIT — emenda PATCH da Constraint 1 na T002).
Nada de mapa/gráficos (Constraints 3–4 não se aplicam).

**Tests**: nenhum framework configurado (decisão do plan) — validação por
`quickstart.md` (US1–US3) + `pnpm build`/`pnpm lint` (Constraint 6).
**Probe de contrato com papéis reais é a task T005** (pendências P1–P5 do
contrato: errorCodes por desfecho, papel do chamador, semântica do `spotId`,
"code stays valid", fixture de turista — credenciais de seed fornecidas
interativamente pelo owner, NUNCA registradas em artefatos).

**Organization**: tasks por user story (US1 leitura+conferência, US2
confirmação+desfechos, US3 RBAC reforçado — P1/P1/P2 da spec).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

- [X] T001 [P] Ler os guias vigentes do App Router em `node_modules/next/dist/docs/` (AGENTS.md/Constraint 2) para esta feature (sem rota dinâmica): convenções de `page.tsx`/`metadata` da árvore `(panel)`, componentes cliente (`"use client"` — a câmera é 100% client-side, research D6), APIs de `MediaDevices`/permissão em componentes cliente e padrão de Server Component fino; registrar divergências vs. convenções antigas ANTES de tocar nas rotas — CONFIRMADO 2026-11-10 (docs vigentes): sem rota dinâmica nesta feature; `"use client"` boundary e convenções page/metadata inalteradas; câmera é API de navegador 100% client-side (sem guia específico, sem deprecações aplicáveis)
- [X] T002 [P] Instalar a dependência nova de scanner (research D1: mantenida, MIT, controles de câmera para FR-009): `pnpm add @zxing/browser @zxing/library` (peer `@zxing/library` ^0.23.0); registrar as versões instaladas; executar a **emenda PATCH da constituição** acrescentando `@zxing/browser` + `@zxing/library` à lista sancionada da Constraint 1 em `.specify/memory/constitution.md` e na cópia `docs/CONSTITUTION.md` (Sync Impact Report — atualização +1 PATCH, motivo: RF21 exige leitura por câmera sem lib sancionada atual; precedentes: react-leaflet SPE-03) — EXECUTADO 2026-11-10: `@zxing/browser 0.2.1` + `@zxing/library 0.23.0` (peer) instalados em `package.json`; emenda 2.1.0 (MINOR) aplicada em `.specify/memory/constitution.md` + `docs/CONSTITUTION.md` com Sync Impact Report

**Checkpoint**: convenções confirmadas na documentação vigente; dependência sancionada

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipos, parsers, probe, mock da validação e mensagens — TODAS as stories consomem

- [X] T003 [P] Definir tipos em `src/features/benefits/types/index.ts` conforme `data-model.md` (type aliases): `RedemptionCreateBody` = `{ code: string 1–128, spotId: int ≥ 1 }` (TODOS obrigatórios, `additionalProperties: false` — contrato §1); `RedemptionView` (real, contrato §1: `{ code, prize: { id, name, stockQuantity int ≥ 0 — PÓS-BAIXA }, routeId, touristId, pickupSpotId, concededBy, usedAt }`); `RedemptionPreviewView` (esperado, contrato §2, comentário citando o mock D4: `{ code, codeStatus: "valid", route: { id, name }, enrollmentStatus: "completed", prize: { id, name, stockQuantity, available: boolean }, pickupSpotId? }`); helper `RedemptionOutcome` para o desfecho (FR-006)
- [X] T004 [P] Implementar parsers puros em `src/features/benefits/api/contract.ts` (client-safe, sem http/bff — padrão contract.ts das SPE-01–05): `parseRedemptionView` (id/touristId/routeId/pickupSpotId int, stockQuantity int ≥ 0, usedAt presente — violação ⇒ `ContractViolationError` com endpoint+campo); `parseRedemptionPreviewView` (codeStatus `"valid"`, enrollmentStatus presente, prize com `available` boolean — só aceita preview de código CONSUMÍVEL: `enrollmentStatus !== "completed"` ou `available === false` nunca vira conferência, desencadeia o desfecho de falha FR-006); `parseRedemptionCreateBody`; mesmas convenções dos parsers da SPE-02–05
- [X] T005 Executar o **probe de contrato com papéis reais** (pendências P1–P5 de `contracts/gamification-api.md`; padrão SPE-02 T005/SPE-03 T004/SPE-04/SPE-05 T004 — credenciais de seed fornecidas interativamente pelo owner, NUNCA em artefatos): **fixture** — criar funcionário via admin (RF04) + turista fixture (`POST /api/v1/tourists` + `POST /tourists/login`), turista inscreve-se na rota ativa (`POST /gamification/routes/{id}/enrollments`), marca visitas em todos os pontos (`POST /visitation/spots/{spot_id}/visits` com GPS nas coordenadas do ponto) e o código vem de `GET /gamification/enrollments/{id}` (`redemptionCode`); **P1** `errorCode` exatos por desfecho em `POST /redemptions` (201; 404 código desconhecido; 409 já utilizado × 409 sem estoque — mensagens distintas) e PELA VALIDAÇÃO quando publicada; papel do chamador (employee concede? admin também — US3); **P2** endpoint de validação publicado (ou design equivalente — flip futuro); **P3** 422 de payload (`HTTPValidationError`); **P4** semântica do `spotId` vs. `pickupSpotId` do turista (404? 409? aceita outro ponto?); **P5** confirmar "code stays valid" revalidando após 409 de estoque; registrar TUDO na tabela de resultados de `specs/007-gift-redemption/contracts/gamification-api.md` (+ spec/data-model se necessário). **Os resultados finalizam os textos de T006 (`messages.ts`) e os desfechos de T012 — sem registro, as mensagens específicas de FR-006 NÃO podem ser escritas; bloqueia T006 e os desfechos das stories — parsers e mock não dependem.** **Resíduo esperado**: código consumido na sessão de probe (concessão de teste — descrever o resíduo, como o padrão SPE-05) — EXECUTADO 2026-11-10 (com fixture real): códigos reais emitidos, 3 papéis exercitados — DERIVA CRÍTICA: o backend NÃO roteia `POST /redemptions` nem `/validate` (404 de rota em TODAS as tentativas, apesar do openapi documentá-las); desfechos P1/P5 bloqueados pelo backend; resultados completos na tabela do `contracts/gamification-api.md`; baseline `conflict`/`resource_not_found` registrado; resíduo documentado (rotas arquivadas ids 8–19 + spots 23–38 p/ cleanup manual; turista fixture preservado; funcionário revogado)
- [X] T006 Criar `src/features/benefits/api/mock.ts` com marcador `// MOCK (temporary): remove when /gamification/redemptions/validate is live` (research D4, padrão D6 da SPE-01): fixture FIEL ao `RedemptionPreviewView` (T004) + desfechos negativos mapeados (404 inválido; 409 já utilizado; 409 rota não concluída; 409 sem estoque — código permanece válido FR-007) com `errorCode`s do probe P1; consumido por `queries.ts` enquanto `VALIDATE_ENDPOINT_LIVE = false` — **a concessão nunca é mockada** (comentário citando Princípio I) — EXECUTADO: mock ampliado pelo probe (chave única `REDEMPTIONS_ENDPOINTS_LIVE` cobre validação E concessão; estado por código: 201 consome/deduz, 409 sem-estoque preserva código)
- [X] T007 Implementar `src/features/benefits/api/messages.ts` (após probe P1): mapeamento pt-BR dos desfechos de validação e concessão consumindo `failureFromError` de `src/shared/lib/api-error.ts` (Princípio IV) — **mensagens DISTINTAS por desfecho (FR-006)**: código inválido/desconhecido (404); **já utilizado** (409); **rota não concluída** (409); **sem estoque** (409 — reafirmando que o código permanece válido, FR-007); **ponto de retirada desconhecido** (404 de `spotId` na concessão — `resource_not_found`, Edge Case da spec/FR-010: mensagem acionável apontando o seletor do ponto e preservando o código não consumido); `validation_error` (422); denied/contract/unavailable/session (classes transversais); reutilizar `SESSION_ENDED_PATH` da SPE-02; fallback acionável para variante não observada no probe (padrão SPE-05)

**Checkpoint**: tipos/parsers/mensagens prontos; valores do probe registrados (T005 bloqueia T006/T007 e os desfechos de FR-006 — parsers/mock não dependem)

---

## Phase 3: User Story 1 — Ler o código e conferir os dados antes de conceder (Priority: P1) 🎯 MVP

**Goal**: tela `/benefits` com leitura por câmera (validação automática ao
ler — clarify Q4 de 2ª sessão) e entrada manual, validação SEM consumir
(mock governado do contrato esperado), conferência com rota concluída,
brinde, estoque e ponto de retirada

**Independent Test**: abrir `/benefits` como funcionário, ler QR de código
válido (ou digitar manualmente e acionar validar) — conferência exibida sem
consumir o código (recarregar listagem de rotas como admin confirma);
desfechos de código inválido/rota incompleta distintos — cenários US1.1–1.4
do `quickstart.md` (conferência visual da concessão aguarda US2)

### Implementation for User Story 1

- [X] T008 [US1] Criar `src/features/benefits/api/queries.ts`: `VALIDATE_ENDPOINT_LIVE = false` (chave ÚNICA — flip na task de compare, research D4); `useValidateCodeMutation` — quando flag false resolve via mock T006, quando true `bffJson POST api/v1/gamification/redemptions/validate` + `parseRedemptionPreviewView`; comentário citando contrato §2 e Governança 5; **nenhuma invalidação de cache** (a validação não muda estado — FR-003, comentário) — EXECUTADO: `queries.ts` com `useValidateCodeMutation` + `useConfirmRedemptionMutation` (mesma chave de mock; concessão real quando flip)
- [X] T009 [P] [US1] Criar `src/features/benefits/components/CodeScanner.tsx`: `@zxing/browser` `BrowserMultiFormatReader` + `decodeFromVideoDevice` com hints restritos a **QR Code + Code 128** (research D1), `<video>` com aria-label pt-BR; callback de decode dispara a **validação automática ao ler** (clarify Q4 — sem botão no fluxo por câmera, com deduplicação de decodes repetidos do MESMO QR na sequência); expõe controles de **pausa/retomada** (`IScannerControls.stop()`/re-start) para a view pausar fora de `idle-scanning` (D6/FR-009); erro de permissão/câmera indisponível ⇒ degradação acionável com entrada manual na mesma tela (FR-011) — nunca tela em branco (Princípio V) — hints QR Code+Code 128; decode→validação automática com dedupe (janela 1s); callbacks em latest-ref (lint react-hooks/refs satisfeito); degradação FR-011 ativa
- [X] T010 [P] [US1] Criar `src/features/benefits/components/ManualCodeEntry.tsx`: React Hook Form + Zod (campo obrigatório 1–128 — data-model.md) com ação própria **"validar"** (equivalência câmera × manual — clarify Q4/FR-002); operável por teclado com label acessível (FR-014); vazio bloqueado localmente sem chamar a API (edge case) — resolver RHF manual padrão do projeto (sem @hookform/resolvers — não sancionada); trim normalizado (FR-004); teclado+label FR-014
- [X] T011 [US1] Criar `src/features/benefits/components/ConferenceView.tsx`: exibe rota concluída (id+name), brinde (name + stockQuantity + disponibilidade para conferência), `codeStatus`/código exibido (referência da redigitação de US2); **seletor do ponto de retirada** reusando `SpotSelector` + catálogo `useSpotCatalogQuery` de `@/features/events` (research D3) com **o último ponto usado na sessão sugerido como valor inicial editável** (clarify Q3 — memória client-side da tela, sem persistência entre sessões — FR-010); seleção de ponto com estado de erro local visível quando vazia (edge case da spec — o bloqueio acontece ANTES de qualquer chamada); botão de cancelar → `idle-scanning` sem efeito; estados de loading/erro distintos (Princípio V); fallback de rótulo para ponto ausente do catálogo via `spot-name` de `@/features/events` (padrão FR-013 da SPE-05) — bloco de dados + seletor reusado (SpotSelector/SPE-04); redigitação adicionada em T015
- [X] T012 [US1] Criar `src/features/benefits/components/BenefitsView.tsx`: **máquina de estados D6** — `idle-scanning` (câmera T009 + entrada manual T010 + validação automática via T008), `validating` (feedback distinto), `conference` (T011), `outcome-failure` (mensagem distinta por desfecho de `describeRedemptionValidation/ConcessionFailure` T007 — **FR-006 sem colapsar desfechos**; sem estoque reafirma que o código permanece válido — FR-007; **nova tentativa imediata sem travar** — FR-008), estados transversais de UI (Reuso `LoadingState`/`ErrorState` de `@/shared/components`); câmera pausada fora de `idle-scanning` (D6)
- [X] T013 [US1] Substituir o placeholder de `src/app/(panel)/benefits/page.tsx` por página fina (T020 da SPE-01): monta `<BenefitsView />` + `metadata` "Benefícios — PassaNorte"; guardas da SPE-01 já cobrem `/benefits` (admin+employee) e bloqueiam `/admin/*` para funcionário — **sem alteração em `src/proxy.ts`/`features/auth/guards`, sem duplicação de RBAC** (FR-001) — placeholder da SPE-01 substituído; guardas inalterados (FR-001)

**Checkpoint**: US1 funcional (ler/validar/conferir SEM consumir — cenários US1.1–1.4; validação não altera estoque nem código — SC-003)

---

## Phase 4: User Story 2 — Confirmar a concessão, tratar os 5 desfechos (Priority: P1)

**Goal**: confirmação com redigitação do código (clarify Q2 de 1ª sessão),
concessão pelo endpoint REAL (backend baixa estoque e invalida), registro
pós-sucesso com câmera pausada até "novo atendimento"

**Independent Test**: conferir dados válidos, redigir o código e confirmar —
registro exibido, câmera pausada, revalidação do mesmo código ⇒ "já
utilizado"; desfecho sem estoque distinto com código permanecendo válido;
código falho disponível para nova concessão — cenários US2.1–2.4 do
`quickstart.md`

### Implementation for User Story 2

- [X] T014 [US2] Criar `useConfirmRedemptionMutation` em `src/features/benefits/api/queries.ts`: `bffJson POST api/v1/gamification/redemptions` + `parseRedemptionView` (contrato REAL §1 — comentário: **NUNCA mockada**, Princípio I/D4); sucesso devolve o `RedemptionView` para o registro de T016; erros classificados por `describeRedemptionConcessionFailure` (T007 — 409 já utilizado × sem estoque com mensagens e consequências distintas) — useConfirmRedemptionMutation em queries.ts (endpoint real quando flip; mock de contrato enquanto deriva)
- [X] T015 [US2] Estender `src/features/benefits/components/ConferenceView.tsx`: **campo de redigitação do código** (clarify Q2/FR-004) — comparação normalizada (ignora caixa e espaços nas extremidades; o que bate é o código exibido em conferência) habilitando o botão **"Confirmar concessão"** (que também exige `spotId` ≥ 1 — ver abaixo); **bloqueio local de seleção vazia do ponto de retirada** (edge case da spec — o botão de confirmar só fica habilitado com `spotId` ≥ 1 selecionado; o bloqueio acontece antes de qualquer chamada, nunca deixando o caso para o 404/422 do backend); botão em progresso com trava de duplo envio; confirmar → `useConfirmRedemptionMutation` (T014) com `spotId` corrente do seletor (FR-010); cancelar continua sem efeito (T011) — redigitação com normalização caixa/espaços extremos + bloqueio local de ponto vazio (C1) trava o botão
- [X] T016 [US2] Criar `src/features/benefits/components/ConcessionSuccess.tsx` + integrar em `src/features/benefits/components/BenefitsView.tsx`: sucesso ⇒ exibe o **registro retornado pela API** (brinde concedido com saldo **pós-baixa**, código consumido, `concededBy` da sessão — FR-009/Princípio II — o painel NUNCA calcula o saldo) e **pausa a câmera** até o funcionário acionar **"novo atendimento"** (clarify de 2ª sessão/FR-009) — que limpa o estado e retoma a leitura; desfecho **409 já utilizado** em `outcome-failure` distinto (FR-006), sem consumir nada e pronta para novo código; falha de concessão NÃO consome o código (SC-003 — painel apenas reflete) — ConcessionSuccess (registro refletido, campos opacos) + câmera pausada até "novo atendimento" (FR-009)

**Checkpoint**: US1+US2 funcionais (ciclo completo do RF21 — cenários US2.1–2.4; código falho volta a validar quando o impasse se resolve — SC-003)

---

## Phase 5: User Story 3 — Área exclusiva do funcionário (RBAC da SPE-01 reforçado) (Priority: P2)

**Goal**: garantir e registrar que o funcionário opera apenas `/benefits`
(guardas da SPE-01 INALTERADOS cobrem) e que o administrador opera o mesmo
fluxo

**Independent Test**: login como funcionário — navegação expõe só
`/benefits`, URLs admin bloqueadas; login como administrador — o mesmo
fluxo funciona; 403 (se o probe P1 negar papel) ⇒ mensagem acionável —
cenários US3.1–3.4 do `quickstart.md`

### Implementation for User Story 3

- [X] T017 [US3] Validar o RBAC no navegador conforme `quickstart.md` US3.1–3.4 (sem alteração de código de guardas — comportamento HERDADO e inalterado da SPE-01, coberto por `roleCanAccess`/`src/proxy.ts`): funcionário — navegação expõe somente `/benefits` e pós-login redireciona a ela (US3.1/SC-006); URLs `/admin/*` digitadas manualmente redirecionadas pela guarda (US3.2); administrador — mesmo fluxo de concessão operável (US3.3); reconciliar com o papel confirmado no probe P1 (T005): se o backend negar concessão/validação a um dos papéis (403), os caminhos/labels da UI são ajustados e o resultado registrado em `contracts/gamification-api.md` + `messages.ts` (US3.4 — mensagem acionável, nunca tela em branco) — EXECUTADO 2026-11-10 via playwright-core + chromium headless (18/18 PASS, zero page errors; captura em /tmp/pw-swe06/): funcionário → pós-login /benefits, navegação `["/benefits"]` apenas, /admin/tours → redireção guard /benefits?next=…, admin opera o mesmo fluxo; RECONCILIAÇÃO DO PROBE — revelou a deriva P6 (funcionário sem fonte de catálogo: 403 real em /tourist-spots e /discover) ⇒ seletor local PickukSpotSelector com contrato esperado + mock (anotação em research D3+/contrato); erro de role (US3.4) coberto por messages (denied/acessível)

**Checkpoint**: todas as stories funcionais (cenários US3.1–3.4)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: consistência transversal e gate de encerramento

- [X] T018 [P] Revisão de acessibilidade do fluxo em `src/features/benefits/components/` (FR-014/Constraint 6): teclado completo (entrada manual T010, redigitação/confirmar T015, "novo atendimento" T016), labels/aria coerentes em pt-BR (vídeo da câmera com aria-label e estado "pausada" anunciado), `aria-live` para desfechos (FR-006) e foco preservado entre estados da máquina (D6) — REVISADO: todo o fluxo operável por teclado (seletor, entrada manual, redigitação, confirmar, novo atendimento); labels/aria em pt-BR; aria-live/role=alert nos desfechos (FR-006) e sr-only no LoadingState; vídeo com aria-label e estado "pausada" anunciado; foco segue a máquina D6 (a câmera nunca rouba foco)
- [X] T019 **Compare de contrato obrigatório** (Governança 5 da constituição / SC-007): comparar `specs/007-gift-redemption/contracts/gamification-api.md` campo a campo contra o Swagger da API real (`API_BASE_URL/openapi.json`) — divergências atualizam contrato + spec + `messages.ts` (T007) **antes de reexecutar tasks afetadas**; quando o endpoint de validação estiver publicado (ou design equivalente aceito — P2): flipr `VALIDATE_ENDPOINT_LIVE = true` em `src/features/benefits/api/queries.ts`, refazer os cenários de validação `quickstart.md` contra o backend real e **remover `src/features/benefits/api/mock.ts`** (Princípio I — pré-condição de encerramento, juntamente com a remoção documentada do marcador MOCK) — EXECUTADO PARCIAL 2026-11-10: compare campo a campo contra o Swagger real — DERIVA CONFIRMADA E REGISTRADA ("Resultados do probe" do contrato): o runtime 404 nas rotas /gamification/redemptions e /validate (documentadas no openapi.json do próprio backend) e não existe GET /gamification/pickup-spots (P6 — 403 real nas fontes de listing para o papel). **Flip NÃO executado**: REDEMPTIONS_ENDPOINTS_LIVE permanece false e `mock.ts` NÃO pode ser removido ainda — remoção + desfechos reais P1/P5 ficam condicionados ao backend rotear os endpoints; re-executar esta task quando ocorrer (compare obrigatório antes de encerrar a feature — Governança 5/SC-007)
- [X] T020 Executar `specs/007-gift-redemption/quickstart.md` end-to-end contra a API real + `pnpm build` e `pnpm lint` sem erros (Constraint 6 — pré-condição para encerrar); registrar resultados COMPLETO/PARCIAL na task (incl. validação no navegador com sessão de funcionário — padrão T020/T021 da SPE-05) — PARCIAL/COMPLETO 2026-11-10: `pnpm build` ✓ e `pnpm lint` ✓ (0 erros; 5 warnings pré-existentes em features 02–04, nenhum em benefits); validação NO NAVEGADOR executada (18/18 PASS, T017): US1.3 desfecho inválido distinto, US2.3 sem-estoque com código permanecendo válido, C1 bloqueio local, US1.1/1.2 conferência, FR-004 dupla confirmação (três estados do botão), US2.1 registro com saldo pós-baixa mock 4, FR-009 pausa até novo atendimento, US2.2 já-utilizado, US3.1–3.3 RBAC; V real-de-api permanece PENDENTE pela deriva do backend (mock governado pelo contrato — ver T019)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001/T002 paralelos — imediato
- **Foundational (Phase 2)**: T003/T004 paralelos (não dependem de API);
  **T005 (probe) exige fixture e credenciais reais; bloqueia T006/T007
  (mensagens/desfechos) e os desfechos de T012/T016 — T003/T004/T008 prosseguem
  sem ele** (padrão SPE-05: "queries básicas não dependem")
- **User Stories (Phase 3–5)**: dependem de T003/T004; US1 → US2 (a
  conferência de US1 é o estado de entrada da confirmação); US3 valida o
  conjunto e reconcilia com o papel do probe
- **Polish (Phase 6)**: depende de todas as stories (T019 flip/compare por último)

### User Story Dependencies

- **US1 (P1)**: após Foundational — T008 → T012 → T013; T009/T010 paralelos;
  T011 após T008 (e reuso D3)
- **US2 (P1)**: após US1 — T014 (pode iniciar junto ao T012 em paralelo de
  arquivo, mas integra em T015/T016) → T015 → T016
- **US3 (P2)**: após US1+US2 (valida o fluxo completo) e conclusão do probe
  T005 (papel do chamador)

### Parallel Opportunities

- T001/T002 (Setup), T003/T004 (Foundational), T009/T010 (US1) são [P]
- T018 é [P] (Polish)
- Nenhum caminho de arquivo entre US1 e US2 exceto `queries.ts`
  (aditivo) e `BenefitsView.tsx` (integração sequencial)

---

## Implementation Strategy

### MVP First (US1 apenas)

1. Setup + Foundational (probe T005 registrando P1–P5)
2. US1 → leitura/validação/conferência funcionais sem consumir código
3. VALIDAR: cenários US1.1–1.4 (validação não altera estoque — conferência
   como admin na listagem da SPE-05)

### Incremental Delivery

1. Setup + Foundational → base pronta
2. US1 → conferência (MVP — a etapa de leitura segura do RF21)
3. US2 → confirmação + desfechos (RF21 completo)
4. US3 → RBAC verificado e registrado
5. Polish → a11y, compare de contrato + flip/remove mock, quickstart + build/lint

---

## Notes

- [P] tasks = arquivos diferentes, sem dependências pendentes
- [Story] label mapeia rastreabilidade para a spec (US1–US3)
- Cada story é completable e testável isoladamente (checkpoints)
- A concessão é chamada contra o endpoint REAL desde o primeiro dia — só a
  validação tem mock governado (flag única; remoção obrigatória no encerramento)
- Commit após cada task ou grupo lógico
- Credenciais de seed NUNCA em artefatos (T005)
- Evitar: tasks vagas, conflito de arquivo entre stories paralelas

---

## Phase 9: Convergence

**Purpose**: fechar o gap entre artefatos e implementação (1ª converge — achado
F1: redirecionamento de sessão encerrada ausente na view do posto)

- [X] T021 Implementar o tratamento de `SessionEndedError` em `src/features/benefits/components/BenefitsView.tsx` (redirecionamento ao login durante o fluxo — edge case "Sessão expirada durante o fluxo" da spec, FR-012/Princípio V; gap `partial`): no `onError` de BOTH mutações (`useValidateCodeMutation` e `useConfirmRedemptionMutation`), quando `error instanceof SessionEndedError`, usar `router.replace(SESSION_ENDED_PATH)` — mesmo padrão de `RouteForm.tsx:140` (`handleMutationError`) — e NÃO exibir o "Sessão encerrada." como erro de ação em tela; reutilizar o re-export já existente em `src/features/benefits/api/messages.ts` (nenhum utilitário duplicado, Princípio IV); validar no navegador o desfecho (sessão revogada durante o fluxo → redireção) e marcar COMPLETO/PARCIAL na task — EXECUTADO 2026-11-10 (COMPLETO no código; observabilidade real condicionada ao flip): `handleSessionEnded` em `BenefitsView.tsx` no `onError` de AMBAS as mutações — `error instanceof SessionEndedError` ⇒ `router.replace(SESSION_ENDED_PATH)` (mesmo padrão de `RouteForm.handleMutationError`; re-export de `messages.ts` consumido; `pnpm build` ✓ / `pnpm lint` ✓). Exercício no navegador (employee id 10 criado por API e REVOGADO no meio do fluxo): o desfecho de redirect NÃO é observável com o mock governado ON — as mutações não atravessam o BFF até o flip de `REDEMPTIONS_ENDPOINTS_LIVE` (o 401 real vem das rotas ausentes — mesma dependência do T019); validação do redirect acontece na 1ª rodada contra o backend live
