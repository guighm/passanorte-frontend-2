# Quickstart: validação da fundação tipográfica — SPE-002

Prova end-to-end de que a escala canônica está aplicada e do cumprimento dos
critérios de sucesso (SC-001..SC-007). Referências: `research.md` (decisões),
`contracts/ui-contract.md` (contrato consumível).

## Pré-requisitos

- Repo na branch `002-typography-foundation` com as tasks implementadas.
- Dependências: `pnpm install`.

## 0. Quality gates da constituição (Constraint 6)

```bash
pnpm build   # sem erros
pnpm lint    # sem erros
```

Enforcement mecânico (ENF-01): no `src/`, não existe mais nenhum utilitário de
tamanho default (`text-sm`, `text-xl`, `text-[10px]`, …). Provar:

```bash
grep -rEn 'text-(xs|sm|base|lg|[0-9]xl|1xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b' src/
grep -rEn 'text-\[' src/            # nenhum valor arbitrário de tamanho
grep -rEn 'tracking-' src/          # tracking só via tokens (esperado: 0)
```

Esperado: **zero ocorrências** (SC-001). Utilitários válidos restantes:
`text-display|title-1..6|body|caption|code`, `tabular-nums`, `font-mono`,
cor (`text-foreground*`, estados, `text-primary`).

**FR-008 (ampliação da escala)**: novos níveis tipográficos entram SOMENTE
como nova entrada `--text-*` em `src/app/globals.css` + linha na tabela do
contrato — o enforcement (`--text-*: initial`) já torna um utilitário default
inválido, e o grep `text-\[` acima já bloqueia valores arbitrários; o
resultado esperado da auditoria cobre esta regra (formalização da cobertura
detectada no `/speckit-analyze`).

## 1. Auditar rede — zero CDN (SC-002)

`pnpm dev`, abrir login e painel, aba Network filtrada por `font` / `.woff2`:

- Toda fonte vem da própria origem (`/_next/static/media/*.woff2`).
- Nenhuma requisição a terceiros (fonts.googleapis.com, fonts.gstatic.com etc.).

Fallback declarado (edge case): com o DevTools "Request blocking" bloqueando
`*.woff2` (após cache frio) ou na ferramenta de override, o texto renderiza
com o fallback (`system-ui`), mantendo legibilidade e alinhamento tabular
sem quebra grosseira de layout.

## 2. Fidelidade visual (FR-011)

Comparar antes/depois (screenshots) de: login, moldura `(panel)`, home do
painel, benefits e um placeholder admin — nos **dois modos** (emular
`prefers-color-scheme` claro/escuro no DevTools). Esperado: mudança visível
apenas em (1) título do login 24→20px e (2) tag de spec da sidebar 10→12px —
os dois deltas registrados (`contracts/ui-contract.md` §7). Nada mais muda.

## 3. Token único — mudança reflete em todas as telas (CS independent / SC-001)

Em `globals.css`, alterar temporariamente `--text-title-2` (ex.: 1.125rem →
1rem): todo título de seção/card muda **em todas as telas** de uma vez, sem
editar componentes. Desfazer.

Troca de família em UM ponto (SC-003): em `layout.tsx`, trocar
`Geist` → `Geist_Mono` na variável `--font-geist-sans` ( só para o teste):
o painel inteiro troca de fonte sem tocar em telas. Desfazer.

## 4. Números tabulares (SC-006)

Num elemento de prova (ex.: tag de spec no dev ou um rótulo temporário) com
`text-code tabular-nums`, render uma coluna de números de dígitos variados
(1, 22, 333, 4444): as colunas alinham dígito a dígito (tnum confirmado no
Geist — `research.md` D2). Em `font-mono` o alinhamento é inerente.
Contraprova: sem `tabular-nums`, no sans os dígitos desalinham.

## 5. Hierarquia semântica + leitor de tela (SC-005)

Com o painel aberto (inspetor de acessibilidade ou leitor de tela):

- Cada tela tem no máximo um `<h1>` e não há saltos de nível (h1 → h2 → …).
- Login: `<h1>` "PassaNorte"; placeholders: `<h2>` de seção — estrutura
  anunciada segue página → seção.
- Rótulos/botões/username **não** são anunciados como títulos (tokens de
  destaque não alteram a semântica).

## 6. Zoom 200% (SC-007) e contraste (FR-014)

- Browser zoom 200% (e font-size do navegador agrandado), nos dois modos, em
  login + painel: nenhum texto essencial truncado/ilegível; layout não quebra
  de forma impeditiva (títulos quebram em vez de estourar).
- Contraste com ferramenta (DevTools/axe): pares token+cor-base nos fundos
  reais — 4,5:1 para `body`/`caption`/`code`/inputs/feedback; 3:1 para
  `title-1`/`title-2`/`display` — nos dois modos.

## 7. PT-BR e símbolos (edge case)

Renderizar `ç Ç ã õ ã é ê í ú à `“`”` e `R$ 1.234,56` num `text-body` e num
`text-code`: glifos corretos (subset latin + OFL — D1), sem fallback de glifo
(tofu).

## 8. Registro de execução (2026-11-06 — implementação da SPE-002)

| Verificação | Resultado |
|---|---|
| §0 Build/lint (T031) | `pnpm build` ✓ compiled; `pnpm lint` ✓ sem erros |
| §0 Auditoria grep (SC-001) | 0 ocorrências de `text-(xs..2xl)`, `text-[…]`, `tracking-*` em `src/` |
| Enforcement emitido | 9/10 tokens no CSS (caption sem consumer — tree-shaking); **0** utilitários default |
| §1 Rede (SC-002) | login + showcase, claro/escuro: **0 requisições externas**; fontes 100% `/_next/static/media/*.woff2` |
| §1 Fallback em uso | com `*.woff2` bloqueado, texto legível em `system-ui`, hierarquia preservada |
| §2 Fidelidade (FR-011) | screenshots antes/depois (claro/escuro): única diferença = os 2 deltas registrados (login 20px; tags de spec 12px) |
| §3 Troca em 1 ponto (SC-003) | Geist→Geist_Mono só em `layout.tsx`: todas as superfícies trocadas; revertido |
| §4 Tabular (SC-006) | coluna 1/22/333/4444/R$: alinhados dígito a dígito com `tabular-nums` (mono e sans); sem o modificador, desalinha |
| §5 Hierarquia (SC-005) | login: 1×H1; showcase: H1→H2×2; sem saltos; rótulos/botões não são headings |
| §5 Contraste (FR-014) | auditoria WCAG no DOM real (todos os pares texto/fundo): **0 falhas** em 5 varreduras (showcase/login, claro/escuro, incl. banner de sessão) |
| §5 Zoom 200% (SC-007) | texto dobra, reflui sem truncar essencial (login + showcase) |
| §7 Glifos | ç Ç ã õ é ê í ú à “” ‘ ’ — e R$ renderizam em `title-4` e `code`, sem tofu |

Notas de execução: rota temporária `spe002-showcase` (sem guarda na
`src/proxy.ts`) usada como veículo de screenshots antes/depois e foi **deletada
ao fim** (matcher do proxy revertido — arquivo sem diff). Sessões reais do
painel exigem o backend FastAPI; a auditória foi pela rota dev com props mock
(mesmos componentes da superfície — censo D4).
