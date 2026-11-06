# Implementation Plan: Tipografia do Painel (Escala Canônica e Contrato de UI)

**Branch**: `002-typography-foundation` | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-typography-foundation/spec.md`

## Summary

Definir a família tipográfica do painel como uma única decisão documentada —
**ratificar Geist + Geist Mono**, já carregadas via `next/font/google`
(auto-hospedadas no build, zero CDN em runtime, OFL) — com fallback declarado,
e estabelecer a escala tipográfica canônica (display, título 1–6, corpo,
legenda, código) como tokens no `@theme` do Tailwind 4 em `src/app/globals.css`,
refatorando toda a superfície existente para consumir exclusivamente esses
tokens (**refatoração fiel**: os valores dos tokens reproduzem a tipografia
atual da tela, captada por censo em `research.md`). As features SPE-02..07
consomem o contrato de UI resultante (tokens + modificadores `mono` e
`tabular`) sem declarar valores locais.

## Technical Context

**Language/Version**: TypeScript (Next.js 16.4.3, App Router) + React 19.3.0

**Primary Dependencies**: Tailwind CSS 4 (tokens em `@theme inline`), `next/font/google` (Geist, Geist_Mono), cva + `cn` (componentes). Nenhuma dependência nova.

**Storage**: N/A (não há persistência nesta feature)

**Testing**: `pnpm build` + `pnpm lint` (Constraint 6); validação visual/manual via `quickstart.md` (auditoria de rede, contraste, zoom 200%, tabular)

**Target Platform**: Desktop e tablet (painel admin), modos claro/escuro via `prefers-color-scheme`

**Project Type**: Web app (PWA-free), frontend Next.js consumidor de API FastAPI

**Performance Goals**: Zero bytes de fonte vindos de rede externa em runtime (fontes auto-hospedadas no build); fallback automático de fonte (`adjustFontFallback`, default) para reduzir CLS

**Constraints**: Sem CDN de fonte (Princípio III / FR-002); família trocável em UM único ponto (FR-003); pisos corporais: corpo ≥ 14px, apoio/código ≥ 12px (FR-014); refatoração fiel — nenhuma mudança visual inesperada (FR-011)

**Scale/Scope**: ~14 componentes/telas existentes + `globals.css` + `layout.tsx`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio/Constraint | Verificação | Status |
|---|---|---|
| III (dados mínimos, preferir open source) | Geist/Geist Mono sob SIL OFL 1.1, carregadas localmente pelo framework; nenhuma requisição a serviço de terceiros (verificado em `research.md` — `tnum` confirmado no woff2 servido pelo build) | ✅ |
| III (sem chave/segredo em código) | N/A — nenhuma integração externa | ✅ |
| IV (estrutura feature-based, portabilidade) | Tokens no ponto único de fundação: `@theme` de `src/app/globals.css`; família em `src/app/layout.tsx`; nenhuma fonte nova fora da árvore sancionada | ✅ |
| IV (nenhum dado fixado no código) | N/A — só tipografia | ✅ |
| Constraint 1 (stack sancionada) | Nenhuma dependência nova; Tailwind 4 `@theme` é o mecanismo sancionado de tema | ✅ |
| Constraint 2 (docs vigentes antes de código) | `node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md` consultado; `next/font/google` sem deprecação no Next 16.4.3 | ✅ |
| V (estados de UI explícitos) | Refatoração preserva estados (loading/empty/error) — só métricas tipográficas mudam de fonte (tokens) | ✅ |
| Constraint 6 (build/lint sem erros + acessibilidade mínima) | Pré-condição de cada task; `quickstart.md` verifica hierarquia semântica (FR-015), zoom 200% (FR-016) e contraste AA (FR-014) | ✅ |

**Post-design re-check**: nenhuma violação introduzida pela fase 1 — o contrato
de UI em `contracts/` é a única peça nova e vive 100% dentro da fundação
sancionada (`globals.css` + `layout.tsx`). Nada a registrar em Complexity
Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-typography-foundation/
├── spec.md              # existente (clarifications de 2026-11-06)
├── plan.md              # este arquivo
├── research.md          # decisões de família/escala + censo fiel da superfície
├── data-model.md        # entidades: token, escala canônica, contexto de uso
├── quickstart.md        # validação de ponta a ponta (build, rede, a11y, tabular)
└── contracts/
    └── ui-contract.md   # contrato de UI tipográfica consumido por SPE-02..07
└── tasks.md             # fase 2 (/speckit-tasks) — não criado aqui
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx        # PONTO ÚNICO de decisão de família (next/font/google)
│   └── globals.css       # fundação de estilo: tokens da escala em @theme inline
├── shared/components/*   # refatorados para consumir tokens (FR-009)
├── features/auth/components/*  # refatorados para consumir tokens (FR-010)
└── ...                   # telas: login, (panel), admin/*, benefits
```

**Structure Decision**: nenhum arquivo novo de código é criado neste projeto —
a fundação já existe (`globals.css` como tema único, `layout.tsx` como ponto
único de fonte). A mudança é: (1) ratificar/declarar a família em `layout.tsx`
com fallback explícito, (2) acrescentar os tokens `--text-*` da escala ao bloco
`@theme inline` de `globals.css` (e desativar as escalas default do Tailwind —
ver decisão ENF-01 em `research.md`), (3) refatorar os ~14 componentes/telas
para usar os novos utilitários de token (ex.: `text-title-1`) em vez de
utilitários default (`text-xl`, `text-sm`, `text-[10px]`).

## Complexity Tracking

> Sem violações da constituição — nada a justificar.
