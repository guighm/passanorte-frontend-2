# Data Model: Tipografia do Painel — SPE-002

**Feature**: 002-typography-foundation | **Data**: 2026-11-06

Não há entidades de negócio nem dados da API nesta feature — as entidades são
os artefatos da fundação tipográfica ("contrato de UI").

---

## E1 — Token tipográfico

Entrada nomeada na escala canônica. **Atributos**: tamanho, altura de linha,
peso, espaçamento de letra (tracking), cor base (modos claro/escuro), família
e situação de consumer (fiel vs. interpolado). Implementado como entrada
`--text-*` no `@theme inline` de `src/app/globals.css` (ver D3 do
`research.md`).

### Tabela de tokens (valores canônicos)

| Token (utilitário) | Tamanho/LH | Peso | Tracking | Família | Cor base | Consumer hoje |
|---|---|---|---|---|---|---|
| `display` | 32/40 | 600 | −0.02em | sans | foreground | **nenhum — reservado SPE-07** |
| `title-1` | 20/28 | 600 | 0 | sans | foreground | títulos de página (login unifica 24→20, delta registrado) |
| `title-2` | 18/28 | 600 | 0 | sans | foreground | `<h2>` PlaceholderSection (título de seção/card) |
| `title-3` | 16/24 | 600 | 0 | sans | foreground | nenhum — interpolado |
| `title-4` | 14/20 | 500 | 0 | sans | foreground | rótulos, botões, linha principal do ErrorState, username |
| `title-5` | 14/20 | 600 | 0 | mono | primary (cor de marca) | wordmark da sidebar |
| `title-6` | 12/16 | 500 | 0 | sans | foreground | nenhum — interpolado |
| `body` | 14/20 | 400 | 0 | sans | foreground | itens de nav, valores de input, parágrafos, mensagens de estado |
| `caption` | 12/16 | 400 | 0 | sans | foreground-muted | nenhum hoje (reserva para legenda sans) |
| `code` | 12/16 | 400 | 0 | mono | foreground-muted | tags de spec (sidebar unifica 10→12, delta registrado), detail do ErrorState |

**Cores base**: `foreground` usa os tokens `--foreground`; `foreground-muted`
usa `--foreground-muted` (ambos trocam por modo no claro/escuro existentes). As
cores são aplicadas por utilitários de cor (`text-foreground` etc.) e a
combinação token + cor-base é fixada pelo contrato de uso — o contexto de
feedback troca **apenas** a cor pelo token de estado
(`--info-soft-foreground`, `--danger-soft-foreground`, `--primary`,
`--primary-soft-foreground`…), nunca as métricas (peso/tamanho/lh/tracking).

### Regras de validação dos tokens

- Nenhum token pode ficar abaixo dos pisos FR-014: `body`/`title-*` ≥ 14px;
  `caption`/`code`/`title-6` ≥ 12px. `title-6` (12px) é título sem consumer —
  permitido pelo piso (o piso vincula corpo ≥ 14 e apoio/código ≥ 12).
- Contraste (FR-014): 4,5:1 nas cores de `body`/`caption`/`code`/estado sobre
  os fundos do tema; 3:1 nos títulos (texto grande ≥ 18.66px bold ou 24px —
  `title-1`/`title-2` qualificam; `title-4`/`title-5` não qualificam como
  texto grande e a cor usada nos contextos em que aparecem cumpre 4,5:1).
- A ampliação da escala (FR-008) acontece SOMENTE por nova entrada `--text-*`
  em `globals.css` — nunca valor local em componente.

---

## E2 — Escala canônica

A coleção única de tokens (E1), definida exclusivamente em
`src/app/globals.css`. **Relação**: 1 para N tokens; consumida por todos os
componentes/telas (FR-006) e pelo contrato de UI (E3).

### Regras de validação da escala

- Único ponto de definição (FR-007): todo `--text-*` do projeto vive neste
  bloco; o `@theme` desativa a escala default do Tailwind (`--text-*: initial;`
  — ENF-01) para que utilitários fora da escala não existam.
- A família vive em `src/app/layout.tsx` (`next/font/google`); trocável num
  único ponto (FR-003, SC-003).
- Modificadores aplicáveis a qualquer token: **`tabular`**
  (`font-variant-numeric: tabular-nums`) e **família `mono`**
  (`font-mono`) — nunca criam token novo (FR-005).

---

## E3 — Contexto de uso

Categoria de texto do painel mapeada unicamente a um token (FR-012). Regras
completas de consumo em `contracts/ui-contract.md` (fonte da verdade
consumível por SPE-02..07); resumo:

| Contexto | Token | Modificadores/observações |
|---|---|---|
| Destaque numérico/hero do dashboard | `display` | + `tabular` (reserva SPE-07) |
| Título de página | `title-1` | |
| Título de seção/card | `title-2` | |
| Subtítulo | `title-3` | sem consumer hoje |
| Item de navegação (ativo/inativo) | `body` | cor `foreground`; índice visual por superfície, não por tipografia |
| Identidade do wordmark na navegação | `title-5` | família `mono`, cor `primary` |
| Rótulo de campo de formulário | `title-4` | |
| Texto de entrada (input) | `body` | |
| Texto de botão/ação | `title-4` | todas as variantes (primária/secundária/danger) |
| Identidade do operador (username) | `title-4` | |
| Papel/descrição de apoio em linha | `body` + cor `foreground-muted` | |
| Mensagem de erro/feedback | `body` | cor por token de estado (`danger-soft-foreground`, `info-soft-foreground`…) |
| Cabeçalho (linha principal) de estado de erro | `title-4` | cor de estado |
| Texto de apoio/legenda (sans) | `caption` | reserva — nenhum consumer hoje |
| Código/tag técnica | `code` | família mono inerente |
| Código inline dentro de parágrafo | `body` | modificador família `mono` |
| Célula de tabela (texto) | `body` | DataTable ainda vazia — fica no contrato |
| Célula de tabela (número) | `body` | + `tabular` |
| Dado numérico (contador/valor) | corpo/título conforme destaque | + `tabular` |

**Regras de validação (contexto)**: cada texto real mapeia a exatamente um
token + no máximo os modificadores tabular/mono (SC-004); nenhum texto "sem
regra".
