# Quickstart: Fundações e Autenticação do Painel

**Feature**: 001-panel-foundation-auth · **Date**: 2026-11-06
*(reescrito para o MODO REAL — mocks removidos (T046) e contrato
re-confirmado contra a "Passanorte API")*

Guia de validação end-to-end da fundação. Cenários mapeados às user stories
da [spec](./spec.md); contratos em [contracts/](./contracts/).

## Pré-requisitos

- pnpm 12, Node (versões do `package.json`).
- **Modo real** (único modo — T046): `API_BASE_URL=http://localhost:8010`
  no `.env.local`, com a "Passanorte API" rodando (`GET /openapi.json`,
  título "Passanorte API"). O compare campo a campo do contrato foi
  executado (2026-11-06) e as pendências de `role` foram resolvidas por
  login real.
- **Credenciais de teste**: seeds reais do backend, fornecidas pelo owner
  a cada rodada de validação — credenciais NUNCA são registradas em
  artefatos, código ou logs (Princípio III).

## Preparação

```bash
pnpm install
pnpm dev      # http://localhost:3000
```

Gates obrigatórios antes de encerrar qualquer task (Constraint 5):

```bash
pnpm lint     # sem erros
pnpm build    # sem erros
```

## Cenários de validação

### C1 — Login por papel (US1)

1. Abrir `/` sem sessão → redirecionado a `/login?next=/` (FR-011, destino
   lembrado).
2. Seed de administrador (owner) → feedback de carregamento no envio; após
   sucesso, chega ao destino pretendido (`/`) com `username`+`Administrador`
   no cabeçalho e placeholders de todas as seções (C5) — registrar o tempo
   do envio até a chegada; SC-001 exige < 5s.
3. Logout (um clique, sem confirmação) → volta ao `/login`; navegar "para
   trás" não reabre `/` com dados.
4. Sair; seed de funcionário (owner) → chega a `/benefits` (nunca às rotas
   `/admin/*`).
5. Credencial inválida → mensagem de erro genérica e acionável, campos
   preservados, sem tela travada.
6. Backend desligado durante envio → erro explícito de comunicação, não
   "senha errada".

### C2 — Guardas por endereço (US2, SC-002/SC-005)

Com sessão de funcionário, abrir diretamente `/`, `/admin/employees`,
`/admin/attractions`, `/admin/events`, `/admin/tours`, `/admin/dashboard`
→ cada uma redireciona a `/benefits` sem renderizar a página bloqueada
(recarregar a página, não só navegar).
Com sessão de administrador, as mesmas rotas abrem placeholders.
Re-login após bloqueio devolve ao destino lembrado, clampado ao papel
(FR-011/T042).

### C3 — Ciclo de sessão (US3)

1. Operar até o token expirar (`expiresIn` real: 3600 s) → chamadas
   seguintes renovam e concluem sem tela de login nem erro visível
   (renovação transparente) — repetir com pelo menos 3 expirações
   distintas para conferir estabilidade (SC-003).
2. **Rotação (T043)**: após uma renovação, repetir — o novo `refreshToken`
   é de uso único; a re-gravação server-side (T036/T043) mantém a sessão
   renovável; uma renovação que falhe leva ao `/login` com aviso de sessão
   encerrada; **sem loop** de chamadas (observar a aba de rede).
3. Duas ações simultâneas com token expirado → **uma única** chamada a
   `/api/v1/auth/refresh` observada em rede; ambas concluem com o novo token.
4. Logout → `POST /api/v1/auth/logout` emitido; cookies de sessão
   eliminados; requisições protegidas subsequentes não levam o token antigo.

### C4 — Divergência de contrato (Princípio I)

Se a API responder com payload diferente do contrato confirmado
(`contracts/auth-api.md`), a UI mostra erro explícito — nunca dados
reinterpretados silenciosamente. A divergência é registrada e a
spec/contrato atualizados antes de prosseguir.

### C5 — Shell e placeholders (US4)

1. Como administrador em `/`: navegação lateral traz **todas** as seções
   (Início, Dashboard e Insights, Pontos Turísticos, Eventos, Rotas e
   Benefícios, Funcionários); cabeçalho mostra `username`+papel e logout.
2. Como funcionário em `/benefits`: navegação traz **apenas** o item
   Benefícios (`/` é rota administrativa — nunca listada).
3. Placeholders são estáticos (nenhum endpoint de seção nesta fundação);
   os componentes de estado carregamento / vazio / erro (T028) existem em
   `src/shared/components` prontos para as features seguintes.
4. Teclado: login, navegação e logout operáveis só por teclado, com rótulos
   nos campos (FR-019).

## Resultado esperado

Todos os cenários passam **no modo real** com `pnpm build` e `pnpm lint`
limpos; o compare de contrato está encerrado (2026-11-06) e os mocks
removidos — encerramento da SPE-01 depende apenas desta rodada manual.
