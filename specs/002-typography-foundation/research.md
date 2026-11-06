# Research: Tipografia do Painel — SPE-002

**Feature**: 002-typography-foundation | **Data**: 2026-11-06

Este documento resolve todas as decisões técnicas do plan e registra o censo
fiel da tipografia existente, que define os valores da escala (FR-011).

---

## D1 — Família tipográfica (FR-001/FR-002/FR-003): ratificar Geist + Geist Mono

**Decision**: Ratificar a família atual — **Geist** (texto) + **Geist Mono**
(código e dados), carregadas por `next/font/google` em `src/app/layout.tsx`.
A decisão vive em **um único ponto** (`layout.tsx`); tokens de família no
`@theme` consomem as CSS variables expostas por `next/font`.

**Rationale**:
1. **Conformidade imediata com Princípio III/RNF15/FR-002**: Geist é SIL OFL
   1.1 (confirmado em vercel.com/font) e `next/font` auto-hospeda a fonte no
   build — nenhuma requisição a CDN em runtime (SC-002 já garantido pelo
   mecanismo; a auditoria do quickstart prova).
2. **Números tabulares (FR-005) verificados na fonte real**: o WOFF2 variável
   do Geist servido pelo build local (`.next/static/chunks` →
   `@font-face { font-family: Geist; font-weight: 100 900 }`) contém as
   features OpenType **`tnum` e `pnum`** (além de `case`/`zero`). Geist Mono é
   monoespaçada — dígitos já têm largura fixa por construção. O modificador
   tabular (`font-variant-numeric: tabular-nums`) funciona sem nova fonte.
3. **Cobertura PT-BR**: subset `latin` cobre 387 línguas latinas (Shaperglot,
   vercel.com/font) — acentos, cedilha, aspas tipográficas; `R$` usa `R`+`$`
   base. Verificação visual complementa no quickstart.
4. **Refatoração fiel (FR-011)**: trocar de família agora revalidaria toda a
   superfície; ratificar preserva o visual em 100% e a troca futura continua
   sendo editável em um único ponto (SC-003).

**Alternatives considered**:
- *IBM Plex Sans* (caráter institucional): requereria revalidar toda a
  superfície — entra em conflito direto com a refatoração fiel decidida em
  Clarifications. Rejeitado para esta feature (reavaliável em refinamento
  futuro, junto com ajustes deliberados de escala).
- *Inter*: padrão de mercado para painéis, também tem `tnum`; ganho real sobre
  Geist é pequeno.
- *Stack de sistema* (`system-ui` só): zero bytes de fonte e fallback que
  nunca falha, mas abre mão do controle de `tnum` (depende da fonte do SO) e
  da consistência cross-platform — enfraquece o contrato da FR-005 para a
  SPE-07. Rejeitado.

**Fallback declarado (SC-001 da decisão / edge case)**: já presente em
`globals.css` e ratificado aqui como parte da decisão:
`--font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif`
`--font-mono: var(--font-geist-mono), ui-monospace, monospace`. O
`adjustFontFallback` do `next/font` (default, mantido) ainda acrescenta um
fallback métrico automático para reduzir CLS antes do carregamento. Com o
fallback, hierarquia e alinhamento tabular se preservam (métricas visuais
podem variar; `system-ui` de um SO moderno mantém `tabular-nums` no
`font-variant-numeric` na maioria das plataformas — verificado no quickstart).

---

## D2 — Verificação de `tnum` no Geist (método)

`vercel.com/font` não enumera features OpenType por nome, então a verificação
foi feita no artefato real: decompressão do stream brotli dos WOFF2 gerados
pelo build (`.next/static/media/*.woff2`) e busca dos tags na tabela de
features. Resultado: o arquivo referenciado pelo `@font-face` de família
`Geist` (variável, pesos 100–900) contém `tnum` + `pnum`; os demais arquivos
são Geist Mono (mono ⇒ dígitos tabulares inerentes). Validação visual de
`tabular-nums` continua no quickstart como prova end-to-end (SC-006).

---

## D3 — Mecanismo dos tokens no Tailwind 4 (FR-004/FR-007)

**Decision**: a escala nasce como entradas `--text-*` no bloco `@theme inline`
de `src/app/globals.css`, usando o namespace nativo do Tailwind v4:

```css
--text-title-1: 1.25rem;
--text-title-1--line-height: 1.75rem;
--text-title-1--font-weight: 600;
--text-title-1--letter-spacing: 0em;
```

Cada entrada gera um utilitário (ex.: `text-title-1`) que fixa tamanho + altura
de linha + peso + tracking de uma vez — exatamente os atributos da FR-004. A
cor segue sendo aplicada por tokens de cor existentes (`text-foreground` etc.),
com a cor base de cada nível registrada no contrato (`contracts/ui-contract.md`)
— contexto de feedback substitui apenas a cor pelo token de estado
(`danger-*`, `info-*`...), nunca as métricas (decisão registrada; validada no
`/speckit-analyze`).

**Valores = censo da superfície** (D4): os níveis com consumer hoje copiam o
visual atual; os sem consumer recebem valores interpolados da progressão
canônica e não alteram nada nas telas de hoje (Clarifications, 2026-11-06).

## ENF-01 — Enforcement mecânico do contrato (FR-006, SC-001)

**Decision**: no `@theme`, desativar a escala default do Tailwind com
`--text-*: initial;` antes de declarar os tokens da escala. Com isso os
utilitários `text-sm`, `text-xl`, `text-[10px]` etc. deixam de existir no
projeto: qualquer valor fora da escala vira erro de compilação/utilitário
desconhecido, tornando a auditoria SC-001 ("zero ad hoc") mecânica e não só
por revisão. Útilidades `tracking-*`/`leading-*`/`font-variant-numeric`
(tabular-nums) e `font-mono` permanecem, restringidos pelas regras de uso do
contrato (tracking só via token; `font-mono` e `tabular-nums` são
modificadores documentados).

**Rationale**: o próprio `text-[10px]` da sidebar (censo, D4) mostra que valor
ad hoc entra silenciosamente; o enforcement no tema torna o contrato
auto-aplicável. Alternativa (confiar apenas em revisão) rejeitada — não escala
para SPE-02..07.

---

## D4 — Censo fiel da tipografia existente (entrada da refatoração)

Censo completo de todos os `.tsx` de `src/` (2026-11-06). Equivalências
Tailwind: `text-xs`=12/16, `text-sm`=14/20, `text-lg`=18/28, `text-xl`=20/28,
`text-2xl`=24/32. **Ausências sistemáticas**: nenhum `tracking-*`, nenhum
`leading-*` explícito, nenhuma `font-variant-numeric`, nenhum peso fora de
400/500/600, nenhuma família fora de sans/mono.

### Registros por arquivo

| Arquivo | Papel do texto | Classes | Valores efetivos |
|---|---|---|---|
| `src/app/login/page.tsx` | `<h1>` título | `text-2xl font-semibold text-foreground` | 24/32·600 |
| ” | subtítulo/descrição | `text-sm text-foreground-muted` | 14/20·400 muted |
| ” | aviso de sessão (info) | `text-sm text-info-soft-foreground` | 14/20·400 |
| `src/features/auth/components/LoginForm.tsx` | `<label>` campo | `text-sm font-medium` | 14/20·500 |
| ” | `<input>` valor | `text-sm text-foreground` | 14/20·400 |
| ” | mensagem de erro (role=alert) | `text-sm text-danger-soft-foreground` | 14/20·400 |
| `src/features/auth/components/PanelSidebar.tsx` | wordmark | `font-mono text-sm font-semibold text-primary` | mono 14/20·600 |
| ” | item de navegação | `text-sm text-foreground` | 14/20·400 |
| ” | tag de spec | `font-mono text-[10px] text-foreground-muted` | mono **10px**·400 — único valor arbitrário |
| `src/features/auth/components/PanelHeader.tsx` | username (strong) | `font-medium` sobre `text-sm` | 14/20·500 |
| ” | papel do operador | herda `text-sm text-foreground-muted` | 14/20·400 muted |
| `src/features/auth/components/LogoutButton.tsx` | botão | `text-sm font-medium` | 14/20·500 |
| `src/shared/components/Button/index.tsx` | botão (cva base) | `text-sm font-medium` | 14/20·500 |
| `src/shared/components/PlaceholderSection/index.tsx` | `<h2>` título de seção | `text-lg font-semibold` | 18/28·600 |
| ” | tag de spec no header | `font-mono text-xs text-foreground-muted` | mono 12/16·400 |
| ” | descrição | `text-sm text-foreground-muted` | 14/20·400 muted |
| ” | spec inline no `<p>` | `font-mono text-xs` | mono 12/16 |
| `src/shared/components/EmptyState/index.tsx` | mensagem de vazio | `text-sm text-foreground-muted` | 14/20·400 muted |
| `src/shared/components/ErrorState/index.tsx` | linha principal | `font-medium` sobre `text-sm` | 14/20·500 |
| ” | detail técnico | `font-mono text-xs opacity-80` | mono 12/16·400 |
| `src/shared/components/LoadingState/index.tsx` | label | `sr-only` | — |
| `src/app/(panel)/layout.tsx` | fallback "Carregando painel…" | `text-sm text-foreground-muted` | 14/20·400 muted |
| `src/app/(panel)/page.tsx` | `<h1>` título de página | `text-xl font-semibold` | 20/28·600 |
| ” | parágrafo introdutório | `text-sm text-foreground-muted` | 14/20·400 muted |
| ” | caminho inline | `font-mono` (herda tamanho) | mono 14/20·400 |
| `src/app/(panel)/benefits/page.tsx` | `<h1>` título de página | `text-xl font-semibold` | 20/28·600 |
| `(panel)/admin/{dashboard,events,employees,attractions,tours}` | só `<PlaceholderSection>` | — | (via placeholder) |
| `src/shared/components/PanelShell.tsx` | sem texto próprio | — | — |
| `src/shared/components/DataTable/index.tsx` | **arquivo vazio (0 bytes)** | — | sem base fiel para células |

### Fidelity deltas registrados (FR-011 / piso FR-014)

1. **Título de página**: login 24px → **20px** (valor predominante do painel).
   *Já registrado na spec (Clarifications, 2026-11-06) — a única exceção
   declarada lá.*
2. **Tag de spec na sidebar**: 10px → **12px** (token `código`). Motivo: o
   piso FR-014 (apoio/código ≥ 12px) é requisito — o 10px não pode existir na
   escala. **Este delta é adicional ao único registrado na spec**; a spec
   pressupôs "12px em detalhes mono" como piso já vigente. Resolver o registro
   da spec antes do implement (anotação no Clarifications/follow-up no
   `/speckit-analyze`); a mudança visual (10→12px) é deliberada e exigida por
   requisito, não escolha estética.
3. **Tag de spec do PlaceholderSection e mono inline do `<p>`**: sem mudança
   visual — tags (12px mono) mapeiam ao token `código`; o caminho inline
   (14px mono) mapeia a `corpo` + modificador família mono.
4. **Linha principal do ErrorState (14/500) vs. mensagens de estado (14/400)**:
   contextos distintos — a linha principal mapeia ao token `título-4` (que
   coincide com os destaques de corpo 14/500); mensagens de erro/feedback
   mapeiam a `corpo`. Nenhuma mudança visual.

## D5 — Interpolação dos níveis sem consumer (FR-004)

Progressão canônica a partir do corpo (14/20·400), com pesos de hierarquia
padrão (títulos 600, níveis baixos aliviando para 500); nenhum efeito visual
nas telas atuais:

- `título-3`: 16/24·600 (sem h3 hoje — interpolado)
- `título-6`: 12/16·500 (sem h6 hoje — interpolado)
- `display`: 32/40·600, tracking −0.02em (reservado ao hero numérico da
  SPE-07, Clarifications; tamanho distinto de qualquer título e coerente com
  destaque de contador — refinement da métrica é livre pois sem efeito hoje)

Níveis **com** consumer (fiel): `título-1` 20/28·600 · `título-2` 18/28·600 ·
`título-4` 14/20·500 · `título-5` 14/20·600 (wordmark mono) · `corpo` 14/20·400 ·
`legenda` 12/16·400 muted · `código` 12/16·400 mono muted.
