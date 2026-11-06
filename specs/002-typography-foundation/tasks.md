# Tasks: Tipografia do Painel (Escala Canônica e Contrato de UI)

**Input**: Design documents from `/specs/002-typography-foundation/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/ui-contract.md, quickstart.md

**Tests**: Nenhum teste automatizado de código é requerido pela spec — a
validação é por auditoria (build/lint, rede, inspetor de acessibilidade,
contraste, zoom), materializada em `quickstart.md` e distribuída como tasks de
verificação nas stories.

**Organization**: Tasks grouped by user story (US1..US4 from spec.md, priorities P1/P1/P2/P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2…)
- Include exact file paths in descriptions

## Path Conventions

- Single project: `src/` na raiz (Next.js App Router) — estrutura real em plan.md
- Fundação de estilo: `src/app/globals.css` (`@theme inline`); ponto único de família: `src/app/layout.tsx`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Registrar na spec o delta extra do censo e capturar o baseline visual para a comparação de fidelidade (FR-011)

- [x] T001 Registrar no bloco **Clarifications** de `specs/002-typography-foundation/spec.md` (sessão 2026-11-06) o segundo delta de fidelidade: tag de spec da sidebar 10px→12px (token `code`), exigido pelo piso FR-014 (apoio/código ≥ 12px) — texto proposto em `specs/002-typography-foundation/research.md` (D4, item 2) e `contracts/ui-contract.md` §7
- [x] T002 [P] Capturar screenshots base (antes da mudança) de login, moldura `(panel)`, home do painel e `admin/dashboard` — nos dois modos `prefers-color-scheme` — salvos em `/tmp/spe002-baseline/` (fora do repo) para a comparação da T017

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: A definição única da escala — pré-requisito de todas as stories (FR-007)

**⚠️ CRITICAL**: Nenhuma story começa antes desta fase. A definição é **aditiva**: os utilitários default do Tailwind permanecem até a migração de T005..T016 terminar (só então T017 desativa o default — enquanto isso o build não quebra).

- [x] T003 Acrescentar a escala canônica como entradas `--text-*` ao bloco `@theme inline` em `src/app/globals.css` (tokens `display`, `title-1..title-6`, `body`, `caption`, `code`), cada um com `--text-<nome>`, `--text-<nome>--line-height`, `--text-<nome>--font-weight` e `--text-<nome>--letter-spacing` — valores EXATAMENTE conforme `specs/002-typography-foundation/data-model.md` (E1: display 32/40·600·−0.02em; title-1 20/28·600·0; title-2 18/28·600·0; title-3 16/24·600·0; title-4 14/20·500·0; title-5 14/20·600·0; title-6 12/16·500·0; body 14/20·400·0; caption 12/16·400·0; code 12/16·400·0), convertendo px→rem (÷16). NÃO incluir `--text-*: initial` nesta task (fica na T017). Validar com `pnpm build` apenas a sintaxe do `@theme` (build OK, nada visual mudou). Não verificar emission de utilitário aqui: o Tailwind 4 só emite classes referenciadas em fonte (tree-shaking) — a verificação de emission acontece no primeiro uso real (T004)

**Checkpoint**: Escala definida em um único ponto; utilitários disponíveis sem efeito visual

---

## Phase 3: User Story 1 - Escala canônica aplicada às telas existentes (Priority: P1) 🎯 MVP

**Goal**: Toda tipografia das telas/componentes existentes provém exclusivamente dos tokens da escala (refatoração fiel — nenhuma mudança visual além dos deltas registrados: login 24→20 e sidebar 10→12)

**Independent Test**: Inspecionar cada componente/tela (quickstart.md §0): zero utilitários default/arbitrários restantes; alterar o valor de um token reflete em todas as telas de uma vez; comparação de screenshots confirma os dois deltas como única diferença

### Implementation for User Story 1 (refatoração fiel — mapear classes conforme `contracts/ui-contract.md` §4 e censo em `research.md` D4)

- [x] T004 [P] [US1] Refatorar `src/shared/components/Button/index.tsx`: base cva `text-sm font-medium` → `text-title-4` (todas as variantes); demais classes de box/cor intocadas; confirmar no CSS de dev que `text-title-4` foi emitido (primeiro consumo real — verificação da T003 deferida)
- [x] T005 [P] [US1] Refatorar `src/shared/components/PlaceholderSection/index.tsx`: `<h2>` `text-lg font-semibold` → `text-title-2`; tag de spec do header `font-mono text-xs text-foreground-muted` → `text-code` (mono é inerente ao token); descrição `text-sm text-foreground-muted` → `text-body text-foreground-muted`; spec inline no `<p>` `font-mono text-xs` → `text-code` (12/16 mono — sem divergência nova)
- [x] T006 [P] [US1] Refatorar `src/shared/components/EmptyState/index.tsx`: `text-sm text-foreground-muted` → `text-body text-foreground-muted`
- [x] T007 [P] [US1] Refatorar `src/shared/components/ErrorState/index.tsx`: container `text-sm` → `text-body` (mantendo `text-danger-soft-foreground`); linha principal `font-medium` → `text-title-4` (14/20·500, fiel); detail `font-mono text-xs opacity-80` → `text-code opacity-80`
- [x] T008 [P] [US1] Refatorar `src/features/auth/components/LoginForm.tsx`: `<label>`s `text-sm font-medium` → `text-title-4`; `<input>`s `text-sm` → `text-body`; mensagem de erro (role=alert) `text-sm text-danger-soft-foreground` → `text-body` (cor mantida)
- [x] T009 [P] [US1] Refatorar `src/features/auth/components/PanelSidebar.tsx`: wordmark `font-mono text-sm font-semibold text-primary` → `text-title-5 font-mono text-primary` (14/20·600 mono — título-5 + modificador mono/marca); item de navegação `text-sm` → `text-body`; tag de spec `font-mono text-[10px] text-foreground-muted` → `text-code` (**10→12px — delta registrado em Clarifications**)
- [x] T010 [P] [US1] Refatorar `src/features/auth/components/PanelHeader.tsx`: username (`<strong>` `font-medium`) → `text-title-4`; papel do operador herda `text-body text-foreground-muted` no `<span>` pai (era `text-sm text-foreground-muted`)
- [x] T011 [P] [US1] Refatorar `src/features/auth/components/LogoutButton.tsx`: `text-sm font-medium` → `text-title-4`
- [x] T012 [P] [US1] Refatorar `src/app/login/page.tsx`: `<h1>` `text-2xl font-semibold` → `text-title-1` (**24→20px — delta registrado na spec**); subtítulo `text-sm text-foreground-muted` → `text-body text-foreground-muted`; aviso de sessão `text-sm text-info-soft-foreground` → `text-body` (cor mantida)
- [x] T013 [P] [US1] Refatorar `src/app/(panel)/layout.tsx`: fallback "Carregando painel…" `text-sm text-foreground-muted` → `text-body text-foreground-muted`
- [x] T014 [P] [US1] Refatorar `src/app/(panel)/page.tsx`: `<h1>` `text-xl font-semibold` → `text-title-1`; parágrafo `text-sm text-foreground-muted` → `text-body text-foreground-muted`; caminho inline `font-mono` → `text-body font-mono` (14px mono fiel — modificador família)
- [x] T015 [P] [US1] Refatorar `src/app/(panel)/benefits/page.tsx`: `<h1>` `text-xl font-semibold` → `text-title-1`
- [x] T016 [US1] Ativar o enforcement mecânico (ENF-01): acrescentar `--text-*: initial;` ao bloco `@theme inline` em `src/app/globals.css` (desativa utilitários default de tamanho) e rodar auditoria do quickstart.md §0 (`grep -rEn 'text-(xs|sm|base|lg|[0-9]?xl)\b' src/`, `text-\[`, `tracking-`) — esperado zero ocorrências (SC-001); páginas `admin/{dashboard,events,employees,attractions,tours}` não têm tipografia própria (census D4) e herdam a de PlaceholderSection — confirmar build OK após o `initial`
- [x] T017 [US1] Comparar screenshots antes/depois (T002 vs estado atual) nos dois modos para login, moldura `(panel)`, home e `admin/dashboard`: única diferença visual são os deltas registrados — título do login 20px (T012) e tag de spec da sidebar 12px (T009); registrar qualquer outra divergência e corrigir a task correspondente (não "consertar" na tela)

**Checkpoint**: User Story 1 completa e auditável de forma independente (SC-001; enforcement mecânico ativo)

---

## Phase 4: User Story 2 - Família tipográfica decidida uma única vez, sem dependência externa (Priority: P1)

**Goal**: Decisão Geist + Geist Mono ratificada em UM único ponto (`layout.tsx`), fallback declarado, zero fonte de terceiros em runtime

**Independent Test**: Auditoria de rede sem requisição de fonte a terceiros; bloquear `.woff2` renderiza com fallback; trocar a família editando apenas `layout.tsx` reflete em todas as telas

### Implementation for User Story 2

- [x] T018 [US2] Ratificar o ponto único de decisão em `src/app/layout.tsx`: manter `Geist`/`Geist_Mono` de `next/font/google` (auto-hospedado, `adjustFontFallback` no default) com comentário de 1–2 linhas marcando o arquivo como ÚNICO ponto de decisão de família (referência: `specs/002-typography-foundation/contracts/ui-contract.md` §1) — nenhuma edição de telas/componentes; confirmar que `--font-sans`/`--font-mono` no `@theme` de `src/app/globals.css` carregam o fallback declarado (`ui-sans-serif, system-ui, sans-serif` / `ui-monospace, monospace`)
- [x] T019 [US2] Executar a auditoria de rede do quickstart.md §1 (`pnpm dev`, aba Network filtrada por `font`): toda fonte vem de `/_next/static/media/*.woff2` e **zero** requisições a terceiros (fonts.googleapis.com/fonts.gstatic.com etc.) (SC-002); testar o fallback com Request blocking de `*.woff2` — texto legível, hierarquia preservada, sem quebra grosseira
- [x] T020 [US2] Provar SC-003 (troca em 1 ponto): em `src/app/layout.tsx`, trocar temporariamente a família (`--font-geist-sans` → Geist_Mono) e constatar que TODAS as telas trocam de fonte sem editar nenhum outro arquivo; desfazer
- [x] T021 [US2] Verificar cobertura PT-BR e símbolos (quickstart.md §7): render `ç Ç ã õ é ê í ú à “”` e `R$ 1.234,56` em `text-body` e `text-code` — sem tofu/fallback de glifo

**Checkpoint**: US2 independente da execução paralela de US1 (após T003); decisão de família auditável

---

## Phase 5: User Story 3 - Regras de uso por contexto, acessíveis e navegáveis (Priority: P2)

**Goal**: Todo contexto de texto mapeia a exatamente um token+modificador, documentado junto ao tema, com hierarquia semântica e contraste AA verificados

**Independent Test**: Ler as regras contra as telas (SC-004); navegar com leitor de tela (SC-005); medir contraste nos dois modos; usar o painel a 200% de zoom

### Implementation for User Story 3

- [x] T022 [US3] Registrar as regras de uso JUNTO ao tema (FR-013): acrescentar bloco de comentário de regras por contexto logo acima/abaixo do `@theme inline` em `src/app/globals.css` (tabela condensada de `specs/002-typography-foundation/contracts/ui-contract.md` §4 — contexto → token (+ modificadores) e cor base/estado), apontando para o contrato como fonte da verdade
- [x] T023 [US3] Auditoria SC-004: classificar TODO texto visível das telas existentes (login, moldura, home, benefits, placeholders, componentes) contra a tabela do `contracts/ui-contract.md` §4 — cada contexto mapeia exatamente um token + no máx. modificadores `tabular`/`mono`; nenhuma divergência → corrigir a task da US1 correspondente
- [x] T024 [US3] Verificar hierarquia semântica (SC-005) com inspetor de acessibilidade/leitor de tela: no máx. um `<h1>` por tela, sem saltos de nível, estrutura página → seção; rótulos/botões/username NÃO anunciados como headings (tokens de destaque não alteram semântica); login mantém `<h1>` após unificação para `text-title-1`
- [x] T025 [US3] Medir contraste (FR-014) com DevTools/axe nos pares token+cor sobre os fundos reais, nos dois modos: 4,5:1 p/ `body`/`caption`/`code`/inputs/feedback (`foreground`, `foreground-muted`, `danger-soft-foreground`, `info-soft-foreground`…); 3:1 p/ `title-1`/`title-2`/`display`; `title-4` nos contextos em que aparece cumpre 4,5:1
- [x] T026 [US3] Verificar zoom 200% (SC-007): browser zoom 200% nos dois modos em login + painel — nenhum texto essencial truncado, títulos quebram em vez de estourar, layout não impeditivo (`research.md` edge case: textos responsivos a preferências do usuário)

**Checkpoint**: US3 aplicável após US1 (T005–T016) — as verificações assumem a superfície migrada

---

## Phase 6: User Story 4 - Números tabulares prontos para dados numéricos (Priority: P2)

**Goal**: Modificador `tabular` disponível para qualquer token, funcional e documentado para a SPE-07 adotar sem ajuste adicional

**Independent Test**: Coluna de números de dígitos variados com token + `tabular-nums` alinha verticalmente dígito a dígito; sem o modificador no sans, desalinha

### Implementation for User Story 4

- [x] T027 [US4] Confirmar que os modificadores do contrato funcionam pós-enforcement (T016): verificar que os utilitários `tabular-nums` e `font-mono` continuam disponíveis após `--text-*: initial` (a desativação é somente da namespace `--text-*`) e estão cobertos pelas regras de uso em `src/app/globals.css` (T022) e `contracts/ui-contract.md` §3
- [x] T028 [US4] Provar o alinhamento tabular (SC-006) com elemento temporário: column render com valores `1, 22, 333, 4444, R$ 12.345,67` usando `text-code tabular-nums` e `text-body tabular-nums` — colunas alinham dígito a dígito (tnum confirmado no Geist — `research.md` D2); contraprova sem `tabular-nums` no sans desalinha; remover o elemento temporário ao final

**Checkpoint**: US4 independente; contrato pronto para SPE-07 (display + tabular no hero; body + tabular em células)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validação de ponta a ponta e gates da constituição

- [x] T029 [P] Atualizar o cabeçalho de documentação de `src/app/globals.css` (bloco `PassaNorte Design System`) para registrar a escala canônica e apontar para `specs/002-typography-foundation/contracts/ui-contract.md` (sem duplicar a tabela — referência, não cópia)
- [x] T030 Executar a validação completa de `specs/002-typography-foundation/quickstart.md` (§0–§7) e registrar os resultados: SC-001 (grep zero ad hoc), SC-002 (rede), fidelidade visual, SC-003 (troca de 1 ponto), SC-006 (tabular), SC-005 (leitor de tela), SC-007 (zoom 200%), FR-014 (contraste), PT-BR/glifos
- [x] T031 Fechar com quality gates (Constraint 6): `pnpm build` e `pnpm lint` sem erros, com o enforcement mecânico ativo; pré-condição para `/speckit-analyze` → `/speckit-implement`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: imediato — T001 registra na spec o delta descoberto pelo censo antes de qualquer mudança de código
- **Foundational (Phase 2, T003)**: BLOCKS todas as stories — a escala existir é pré-requisito; aditiva (não quebra o build)
- **US1 (Phase 3)**: requer T003 (T017 depende de T002, T004..T016)
- **US2 (Phase 4)**: requer apenas T003; **paralelizável com US1** (arquivos distintos — `layout.tsx`/rede vs. telas)
- **US3 (Phase 5)**: requer US1 completa (T016, T017) — audita a superfície migrada; T022 pode rodar em paralelo desde que T003 esteja feito
- **US4 (Phase 6)**: requer T016 (enforcement ativo) para provar os modificadores no estado final
- **Polish (Phase 7)**: todas as stories desejadas completas

### User Story Dependencies

- **US1 (P1)**: núcleo — após Foundational, sem dependência de outras stories
- **US2 (P1)**: independente de US1 (ponto único de decisão + rede) — pode rodar em paralelo
- **US3 (P2)**: integra com US1 (auditoria sobre a superfície migrada)
- **US4 (P2)**: independente de US3; prova do modificador assume enforcement (US1 finalizado)

### Parallel Opportunities

- T002 em paralelo com T001
- T004..T015 — TODOS marcados [P]: arquivos distintos, sem dependência entre si (executar em lote)
- US2 inteira em paralelo com US1 (dev diferente ou em sequência — não tocam nos mesmos arquivos)
- T029 em paralelo com as verificações de US3/US4

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup (T001–T002) → Foundational (T003)
2. US1: T004..T015 (paralelos) → T016 (enforcement) → T017 (fidelidade)
3. **STOP and VALIDATE**: quickstart §0 + §2 + comparar screenshots
4. A escala está aplicada e o contrato em vigor — SPE-02..07 já podem consumi-lo

### Incremental Delivery

1. Setup + Foundational → escala definida (sem efeito visual)
2. US1 → MVP auditável (SC-001, enforcement mecânico)
3. US2 (paralela) → decisão de família auditável (SC-002/SC-003)
4. US3 → regras + acessibilidade (SC-004/SC-005/SC-007, contraste)
5. US4 → tabular provado para SPE-07 (SC-006)
6. Polish → validação completa + gates

### Notes

- `src/shared/components/DataTable/index.tsx` está VAZIO (census D4) — não há task de refatoração para ele; célula de tabela é contratada (E3/cenário reserva) e nasce com a SPE-02/07 via tokens
- `LoadingState` e `PanelShell` não têm tipografia própria — nenhuma task
- `admin/{dashboard,events,employees,attractions,tours}` não têm tipografia própria (só PlaceholderSection) — cobertas por T005
- Refatoração fiel: as ÚNICAS mudanças visuais permitidas são os dois deltas registrados (login 20px, sidebar 12px — ver Clarifications atualizado pela T001); qualquer outra divergência na comparação (T017) é regressão, não ajuste
- Commit após cada task ou grupo lógico; parar em checkpoints para validar a story
