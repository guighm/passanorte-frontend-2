# Quickstart: Fundações e Autenticação do Painel

**Feature**: 001-panel-foundation-auth · **Date**: 2026-10-30

Guia de validação end-to-end da fundação. Cenários mapeados às user stories
da [spec](./spec.md); contratos em [contracts/](./contracts/).

## Pré-requisitos

- pnpm 12, Node (versões do `package.json`).
- **Modo mock** (backend não acessível — clarificação Q2): não definir
  `API_BASE_URL`; a camada `src/features/auth/api` responde com fixtures
  marcadas `MOCK (temporary)` (ver `research.md` D6). Credenciais de
  exemplo fixtures: `admin` / `admin` (papel `administrador`) e
  `funcionario` / `funcionario` (papel `funcionário`) — ajustadas às
  fixtures criadas na implementação.
- **Modo real**: `API_BASE_URL=https://<backend>` no `.env.local`, backend
  FastAPI rodando, e conferência do contrato (Princípio I) antes de validar
  como conclusão da SPE-01.

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

1. Abrir `/` sem sessão → redirecionado a `/login`.
2. `admin`/`admin` → feedback de carregamento no envio; após sucesso, chega
   a `/` com nome+`administrador` no cabeçalho e placeholders de todas as
   seções (C5) — registrar o tempo do envio até a chegada; SC-001 exige < 5s.
3. Logout → volta ao `/login`; navegar "para trás" não reabre `/` com dados.
4. Sair; `funcionario`/`funcionario` → chega a `/beneficios` (nunca `/`).
5. Credencial inválida → mensagem de erro genérica e acionável, campos
   preservados, sem tela travada.
6. (Modo real) Backend desligado durante envio → erro explícito de
   comunicação, não "senha errada".

### C2 — Guardas por endereço (US2, SC-002/SC-005)

Com sessão `funcionário`, abrir diretamente `/`, `/admin/funcionarios`,
`/admin/pontos`, `/admin/eventos`, `/admin/rotas`, `/admin/dashboard` → cada
uma redireciona a `/beneficios` sem renderizar a página bloqueada (recarregar
a página, não só navegar).
Com sessão `administrador`, as mesmas rotas abrem placeholders.

### C3 — Ciclo de sessão (US3)

1. Definir expiração curta nos mocks (ou aguardar no backend real): fazer
   ações após o token expirar → chamada renova e conclui sem tela de login
   nem erro visível (renovação transparente) — repetir com pelo menos 3
   expirações distintas para conferir estabilidade (SC-003).
2. Invalidar também o refresh (ou usar `refresh_token` expirado) → próxima
   ação leva ao `/login` com aviso de sessão encerrada; **sem loop** de
   chamadas (observar a aba de rede).
3. Duas ações simultâneas com token expirado → **uma única** chamada a
   `/auth/refresh` observada em rede; ambas concluem com o novo token.
4. Logout → `POST /auth/logout` emitido (modo real); cookies de sessão
   eliminados; requisições protegidas subsequentes não levam o token antigo.

### C4 — Divergência de contrato (Princípio I)

Modo real: se a FastAPI responder com payload diferente do baseline
(contratos/auth-api.md), a UI mostra erro explícito — nunca dados
reinterpretados silenciosamente. A divergência é registrada e a spec/contrato
atualizada antes de prosseguir.

### C5 — Shell e placeholders (US4)

1. Como `administrador` em `/`: navegação lateral traz **todas** as seções
   (Dashboard, Pontos, Eventos, Rotas e Benefícios, Funcionários);
   cabeçalho mostra usuário+papel e logout.
2. Como `funcionário` em `/beneficios`: navegação traz **apenas**
   Benefícios.
3. Placeholders são estáticos (E1: nenhum endpoint de seção nesta
   fundação); os componentes de estado carregamento / vazio / erro (T028)
   existem em `src/shared/components` prontos para as features seguintes.
4. Teclado: login, navegação e logout operáveis só por teclado, com rótulos
   nos campos (FR-019).

## Resultado esperado

Todos os cenários passam no modo mock **e** no modo real, com `pnpm build` e
`pnpm lint` limpos. O compare do contrato contra o Swagger real — quando o
backend subir — é pré-condição para dar a SPE-01 por encerrada (Assumptions
da spec).