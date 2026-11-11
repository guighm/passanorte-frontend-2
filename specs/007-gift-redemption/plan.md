# Implementation Plan: Concessão de Brindes — Área do Funcionário (SPE-06)

**Branch**: `007-gift-redemption` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-gift-redemption/spec.md`

## Summary

Implementar a área de concessão de brindes do painel PassaNorte (RF21, RBAC
da SPE-01 — única área do funcionário): a página `/(panel)/benefits`
(**substitui o placeholder da SPE-01**) com o fluxo completo em **tela única**
e máquina de estados client-side (D6): leitura por **câmera com validação
automática ao ler** (clarificação Q4 de 2ª sessão, scanner `@zxing/browser`
— D1, lib nova MIT justificada pela Constraint 1) **e** entrada manual com
ação própria, **validação SEM consumir** o código (contrato **esperado**
`POST /redemptions/validate` — clarificação Q1 da 1ª sessão: mocks
governados + compare obrigatório, D4) apresentando **conferência** com rota
concluída, brinde, disponibilidade e ponto de retirada
(`SpotSelector` reuso da SPE-04/05, sugerido editável — clarify Q3 de 1ª
sessão), **dupla confirmação** com redigitação do código (clarificação Q2 de
1ª sessão, FR-004) e concessão pelo **endpoint real**
`POST /gamification/redemptions` (backend efetua baixa e invalida — Princípio
II) — com os **5 desfechos distintos** (sucesso/inválido/já utilizado/rota
incompleta/sem estoque) e tela pós-sucesso **pausada até "novo atendimento"**
(clarificação de 2ª sessão, FR-009). Camada de dados client-side via TanStack
Query + túnel BFF (padrão SPE-02/03/04/05); parsers puros campo a campo;
contrato REAL da concessão extraído do OpenAPI (2026-11-10,
`contracts/gamification-api.md`) com pendências P1–P5 resolvidas por **probe
com papéis reais** na primeira task.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Next.js 16.4.3 (App Router) +
React 19.3.0 — versões de `package.json` são a referência (Constraint 1);
documentação vigente em `node_modules/next/dist/docs/` lida antes do código
(Constraint 2, AGENTS.md).

**Primary Dependencies**: Tailwind CSS 4 (tokens da SPE-08), **TanStack
Query 5** (queries/mutações), **`@zxing/browser` 0.2.1 + `@zxing/library`
0.23.0 (dependência NOVA, MIT — D1/D-research)**: leitura por câmera com
controles explícitos de start/stop (pausar na conferência e no pós-sucesso
— FR-009; justificativa: RF21 exige leitura por câmera e nenhuma lib na
stack cobre; opção gratuita/open source e mantida — 2026-07), React Hook
Form + Zod (entrada manual do código 1–128 + comparação da redigitação),
`SpotSelector`/`useSpotCatalogQuery`/`spot-name` reusados de
`@/features/events` e `parseSpotListResponse` de `@/features/attractions`
(D3), estados de UI e `Button` de `src/shared/components`, classificador
`api-error.ts` e `bff.ts` de `src/shared/lib`, `cn`. Base UI (diálogo, se
aplicável ao desfecho pós-sucesso — preferiu-se estado inline na tela).

**Storage**: N/A no frontend — única memória client-side é o **último ponto
de retirada usado na sessão** (clarify Q3: sugerido editável, NÃO persistido
entre sessões); nenhum dado de turista além do identificador opaco (RNF08/
Princípio III); nada além do cache por `queryKey` do TanStack Query.

**Testing**: nenhum framework configurado (padrão do projeto) — validação por
`quickstart.md` (cenários US1–US3 com desfechos, contra a API real com
validação em modo mock até o compare) + `pnpm build`/`pnpm lint` (Constraint
6); **probe de contrato com papéis reais como primeira task** (P1–P5 de
`contracts/gamification-api.md`: `errorCode` por desfecho, papel do chamador,
semântica do `spotId`, "code stays valid", flip do compare).

**Target Platform**: navegador moderno (desktop — posto de atendimento com
webcam), `pnpm dev`/build; permissão de câmera degradável (FR-011 — entrada
manual na mesma tela).

**Project Type**: web application — módulo `src/features/benefits` (`api/`,
`components/`, `types/`), rota `/(panel)/benefits` (Server Component fino →
view client, **substitui o placeholder da SPE-01**); tela única com máquina
de estados (D6); **nenhum caminho novo** fora da árvore do Princípio IV e
**nenhuma mudança** em guardas/NAV (RBAC de superfície `/benefits` já libera
admin+employee).

**Performance Goals**: ciclo por atendimento < 30 s por câmera / < 60 s
manual (SC-001) — validação automática ao ler, seletor com sugestão pré-marcada,
redigitação como única etapa de digitação; registro pós-concessão exibido
imediatamente (SC-004); duplo envio travado; câmera pausada fora do
`idle-scanning` (re-leitura acidental eliminada na conferência).

**Constraints**: chamadas exclusivamente por `bff.ts` (Constraint 5 — sem
`fetch` feature-local); payload divergente ⇒ `ContractViolationError`
(Princípio I — parsers puros); **concessão NUNCA mockada** (endpoint real é
autoridade da baixa/invalidação; só `validateCode` tem mock governado com
flag única `VALIDATE_ENDPOINT_LIVE` — D4); **5 desfechos com mensagens
distintas** (FR-006 — fallback acionável até o probe confirmar variantes de
`errorCode`, padrão SPE-05); confirmação requer redigitação batendo (caixa/
extremos normalizados, FR-004); ponto de retirada **por atendimento** com
sugestão editável (clarify Q3); sem estoque indica código permanece válido
(FR-007); nova tentativa imediata (FR-008); câmera degradável (FR-011);
dependência nova `@zxing/browser` justificada nesta spec + emenda PATCH da
Constraint 1 na implementação (D1/D-governance).

**Scale/Scope**: 1 feature module novo; 1 rota real (`/benefits`, substituindo
placeholder); 2 endpoints do contrato (real `POST /redemptions` +
esperado `POST /redemptions/validate` com mock) + catálogo de pontos reusado
da SPE-03/04; 1 máquina de estados de 6 estados (D6); 1 fluxo de câmera + 1
formulário manual + conferência + registro de sucesso; probe com 3 papéis
(admin, employee, turista fixture).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação no design | Status |
| --- | --- | --- |
| I. API como Contrato Único | Contrato REAL da concessão registrado em `contracts/gamification-api.md` (OpenAPI 2026-11-10); validação como **contrato esperado** com mocks governados de 1 arquivo + flag única (D4 — mecanismo constitucional da Q1 da spec); parsers puros campo a campo (`RedemptionView` real, `RedemptionPreviewView` esperado) ⇒ `ContractViolationError`; compare obrigatório (P2/SC-007) | ✅ Pass |
| II. Backend É a Autoridade | Baixa de estoque, invalidação do código e validação definitiva são do backend — o painel só reflete `RedemptionView`/saldo; **nunca mockar a concessão** (flag limitada à validação); desfechos de 409 traduzidos, não reinterpretados; túnel BFF apenas transporta | ✅ Pass |
| III. Sessão Segura, Dados Mínimos | Token anexado apenas no túnel BFF (client — Constraint 5); sem PII de turista (identificador opaco); ponto de retirada só em memória de sessão, sem persistência (clarify Q3); lib nova gratuita/open source MIT (RNF15) | ✅ Pass |
| IV. Feature-Based e Portabilidade | `src/features/benefits` (nome segue árvore — `/benefits`); rota substitui placeholder da SPE-01, dentro do Princípio IV; transversais reusados — `SpotSelector`/`useSpotCatalogQuery`/`spot-name` de `@/features/events`, `parseSpotListResponse` de `@/features/attractions` (cadeia de reuso sancionada na SPE-04/SPE-05), `Button`/estados/`api-error.ts`/`bff.ts`/`cn` — nenhum utilitário duplicado; nada de dado da cidade no código (RNF06 — seletor via API) | ✅ Pass (dependência nova com justificativa em research D1/plan — emenda PATCH da Constraint 1 na implementação) |
| V. Estados de UI Explícitos | Máquina de estados com loading/erro/sucesso distinto por etapa; **5 desfechos com mensagens próprias** (FR-006); sem estoque reafirma código válido (FR-007); câmera pausada no pós-sucesso (FR-009, clarify de 2ª sessão); degradação da câmera com fallback manual na mesma tela (FR-011); duplo envio travado | ✅ Pass |

**Constraint 1 — dependência nova (`@zxing/browser` + peer
`@zxing/library`)**: exigida pelo RF21 (leitura por câmera); escolhida pela
manutenção ativa (0.2.1, 2026-07, MIT) e pelos controles explícitos de
câmera que FR-009 requer (D1); justificativa registrada em research/plan.
**Ação de governança**: emenda PATCH da Constraint 1 acrescentando a dupla
à lista sancionada, executada junto com a implementação.

**Gates pós-Phase 1** (re-check): nenhum componente precisa subir para
`shared` nesta feature (`SpotSelector` já reusa da events, mesmo padrão
SPE-05); guardas/NAV/`src/proxy.ts` inalterados (`/benefits` já no mapa de
RBAC da SPE-01). Sem violações a justificar em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/007-gift-redemption/
├── plan.md                    # This file (/speckit-plan command output)
├── research.md                # Phase 0 output (/speckit-plan command)
├── data-model.md              # Phase 1 output (/speckit-plan command)
├── quickstart.md              # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── gamification-api.md    # Contrato REAL (concessão) + ESPERADO (validação)
│                              # + pendências P1–P5 → probe / resultados
├── checklists/
│   └── requirements.md        # Spec quality checklist (/speckit-specify + clarify)
└── tasks.md                   # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (panel)/
│   │   └── benefits/
│   │       └── page.tsx             # Tela do fluxo (Server Component fino →
│   │                                # BenefitsView client) — SUBSTITUI o
│   │                                # placeholder da SPE-01
│   └── api/proxy/[...path]/         # Túnel BFF existente (Constraint 5) — inalterado
├── features/
│   └── benefits/
│       ├── api/
│       │   ├── contract.ts          # Parsers puros: RedemptionView (REAL),
│       │   │                        # RedemptionPreviewView (esperado/mock),
│       │   │                        # corpos RedemptionCreateBody
│       │   ├── messages.ts          # Mapeamento pt-BR dos 5 desfechos (FR-006)
│       │   ├── queries.ts           # useValidateCode (mock/real por flag),
│       │   │                        # useConfirmRedemption (POST real),
│       │   │                        # VALIDATE_ENDPOINT_LIVE (chave única)
│       │   └── mock.ts              # MOCK (temporary): remove when
│       │                            # /gamification/redemptions/validate is live
│       ├── components/
│       │   ├── BenefitsView.tsx     # Máquina de estados D6 (6 estados) +
│       │   │                        # degradação da câmera (FR-011)
│       │   ├── CodeScanner.tsx      # Câmera @zxing/browser: decode automático
│       │   │                        # (Q4), start/stop por controle (FR-009)
│       │   ├── ManualCodeEntry.tsx  # Entrada manual com ação validar (RHF+Zod)
│       │   ├── ConferenceView.tsx   # Conferência: rota/brinde/estoque + ponto
│       │   │                        # de retirada (sugestão editável, Q3) +
│       │   │                        # redigitação habilitando confirmação (FR-004)
│       │   └── ConcessionSuccess.tsx# Registro retornado + câmera pausada +
│       │                            # "novo atendimento" (FR-009)
│       └── types/                   # Tipos/schemas Zod (payloads do contrato)
├── features/auth/guards/            # INALTERADO — /benefits já libera
│                                    # admin+employee (RBAC de superfície)
├── features/events/attractions/     # INALTERADOS — seletor/catálogo reusados (D3)
└── shared/
    ├── components/                  # Button, estados, QueryProviders — inalterados
    └── lib/                         # bff.ts, api-error.ts, cn.ts, http.ts — inalterados
```

**Structure Decision**: estrutura única de app Next.js (backend é outro
repositório). Padrão client-side estabelecido (SPE-02 rodada 2, SPE-03,
SPE-04, SPE-05): mutações em TanStack Query via túnel BFF; parsers puros em
`contract.ts`; página Server Component fina. Módulo novo
`src/features/benefits` (nome da árvore de rotas do Princípio IV — a
entidade canônica de navegação permanece "benefícios", o fluxo é
"concessão de brindes" em tela única, clarificação D2/D6 do research).
Reuso de seletor/catálogo entre features no mesmo formato sancionado da
SPE-04/SPE-05 (D3). Único fluxo de câmera do painel — se `CodeScanner`
mostrar-se reutilizável por outra spec futura, a promoção a `shared` é
decisão do review (não agora). Nota: implementação deve seguir as
convenções do guia atual do App Router (`node_modules/next/dist/docs/`) e
não as de versões antigas do framework (AGENTS.md/Constraint 2);
componentes de câmera são 100% client-side (navegador).

## Complexity Tracking

> Sem violações de constituição a justificar. (Dependência nova está dentro
> do procedimento da Constraint 1 — justificativa registrada; emenda PATCH
> planejada na implementação.)
