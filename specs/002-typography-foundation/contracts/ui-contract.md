# UI Contract: Tipografia do Painel (SPE-002)

**Consumidores**: SPE-01 (ratificação), SPE-02..07 e qualquer tela/componente
futuro de `src/`. Este contrato é a parte consumível da escala — as regras de
uso por contexto descritas aqui são fr-012/FR-013 materializadas. Fonte dos
valores: `data-model.md` E1; referência estrutural: `globals.css` (`@theme`)
e `layout.tsx`.

## 1. Família tipográfica (decisão única — FR-001/FR-003)

- Primária: **Geist** (sans); Código/dados: **Geist Mono**.
- Decisão em UM único ponto: `src/app/layout.tsx` (consts `next/font`).
- Fallback declarado: `ui-sans-serif, system-ui, sans-serif` / `ui-monospace,
  monospace` (ratificado em `globals.css` `@theme` → `--font-sans`,
  `--font-mono`).
- Proibido (FR-002): importar fonte de CDN/URL externa, `@font-face` local fora
  do mecanismo `next/font`, ou nova família via `font-family` inline/ad hoc.

## 2. Tokens disponíveis (nível + métricas)

Utilitários gerados pelo `@theme` (a escala default do Tailwind está
desativada — `--text-*: initial`): `text-display`, `text-title-1` …
`text-title-6`, `text-body`, `text-caption`, `text-code`.

| Tokens | Contrato de uso resumido |
|---|---|
| `text-display` | destaque numérico/hero do dashboard (SPE-07) — reserva |
| `text-title-1` | título de página |
| `text-title-2` | título de seção/card |
| `text-title-3` | subtítulo |
| `text-title-4` | rótulo, botão, username, linha principal de estado |
| `text-title-5` | wordmark (família mono, cor de marca) |
| `text-title-6` | (reserva — nível interpolado) |
| `text-body` | corpo de leitura, navegação, entrada, feedback |
| `text-caption` | legenda/texto de apoio (sans) |
| `text-code` | código/tag técnica |

A tabela completa de métricas e valores está em `data-model.md` (E1);
**qualquer alteração de valor acontece somente na entrada `--text-*`
correspondente em `globals.css`** — os consumidores não declaram valores.

## 3. Modificadores (aplicáveis a qualquer token)

- `tabular` → utilitário `tabular-nums` (dígitos de largura fixa). Obrigatório
  nos contextos **dado numérico** (contadores, valores monetários, ranking,
  estoque) e **célula de tabela numérica**. Padrão para SPE-07: `display +
  tabular` nos contadores hero; `body + tabular` em células.
- `mono` → utilitário `font-mono`. Obrigatório nos contextos **código/tag
  técnica** (o token `code` já é mono) e **código inline em parágrafo**
  (`body` + `font-mono`). Uso de `font-mono` fora desses contextos é violação
  do contrato.

## 4. Regras de uso por contexto (FR-012 — tabela canônica)

Ver E3 do `data-model.md`. Cada contexto de texto mapeia a **exatamente um
token** (+ modificadores). Esclarecimento de fronteira: "subtítulo"
(`title-3`, reserva) designa subtítulo de título de página em features
futuras; descrições/subtítulos de tela **existentes** (ex.: subtítulo do
login) mapeiam `body` + cor `foreground-muted` (fiel ao censo — não usam
`title-3`). Novos contextos estendem a tabela aqui no contrato
(ou, se for nova métrica, estendem a escala em `globals.css`) — FR-008.

### Cores

- Cor base por token: títulos/`body` → `text-foreground`; `caption`/`code` →
  `text-foreground-muted`.
- Só dois contextos trocam **a cor** (nunca métricas): **feedback/estado** usa
  a cor do estado (`text-danger-soft-foreground`, `text-info-soft-foreground`,
  `text-success-*`, `text-warning-*`) e a **identidade de marca/navegação**
  usa `text-primary`.
- Contraste exigido: 4,5:1 (texto normal), 3:1 (texto grande) — ambos os
  modos `prefers-color-scheme` (FR-014).

## 5. Hierarquia semântica (FR-015)

- `title-1` ↔ `<h1>` da página; `title-2` ↔ `<h2>`; níveis seguintes seguem a
  ordem do documento (não existe salto; o nível **visual** nunca substitui o
  semântico). Textos como rótulo/botão/username usam tokens de destaque
  (`title-4`) **sem** marcarem heading — o utilitário é visual, o papel
  semântico vem do elemento (`<label>`, `<button>`, `<strong>`).

## 6. Política de mudança

1. Trocar de família → editar **somente** `layout.tsx` (+ fallback já declarado
   no `@theme`, que continua apontando para as CSS variables). SC-003.
2. Alterar valor de um nível → editar somente a entrada `--text-*` do nível em
   `globals.css`. Todos os consumidores mudam juntos (SC-001/CS-002).
3. Novo nível tipográfico (raro) → nova entrada `--text-*` + linha nesta
   tabela no contrato + regra de contexto. Jamais valor local.
4. Desativar escala default (`--text-*: initial`) permanece em vigor; um
   utilitário de tamanho fora dos listados aqui NÃO compila — isto é o
   enforcement mecânico (ENF-01, `research.md`).

## 7. Exceções de fidelidade desta feature (registro)

1. Login: título 24→20 (`title-1`) — registrado na spec (Clarifications).
2. Sidebar: tag de spec 10→12px (`code`) — exigido pelo piso FR-014; registrar
   no spec Clarifications antes do implement.
3. Nenhuma outra mudança visual esperada — comparar antes/depois pelo
   `quickstart.md`.
