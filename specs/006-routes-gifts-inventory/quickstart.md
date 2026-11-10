# Quickstart: Rotas Turísticas e Estoque de Brindes (SPE-05)

Guia de validação end-to-end. Detalhes de contrato em
[contracts/gamification-api.md](./contracts/gamification-api.md); entidades em
[data-model.md](./data-model.md); decisões em [research.md](./research.md).

## Pré-requisitos

1. **API FastAPI real** ("Passanorte API") em execução em
   `http://localhost:8010` (`GET /openapi.json` responde) — com dados de
   seed: ≥ 1 administrador e ≥ 2 pontos turísticos existentes (catálogo da
   SPE-03 alimenta o formulário de rota).
2. **Painel** em execução (`pnpm dev`) — o túnel BFF
   (`src/app/api/proxy/[...path]`) apontando para a API (config da SPE-01).
3. Sessão de **administrador** (login por `src/app/login`). Uma sessão de
   **funcionário** é necessária apenas para o teste de RBAC (FR-001).

## Passo 0 — Probe de contrato (primeira task da implementação)

Antes da UI: executar os probes P1–P4 (em `contracts/gamification-api.md`)
com sessão de admin real via túnel BFF e registrar os resultados no próprio
arquivo de contrato. A UI NÃO avança dependendo deles antes do registro
padrão SPE-02 T005 / SPE-03 T004 / SPE-04). Probe mínimo: criar uma rota de
teste via `POST /api/proxy/api/v1/gamification/routes`, ler valores de
`status`, arquivar, ler com `includeArchived=true`, tocar o `PATCH` de
estoque.

## Validações (cada uma independente)

### V1 — RBAC (FR-001)

- **Dado**: sessão de funcionário não-admin.
- **Quando**: tenta navegar para `/admin/tours` (e `/admin/tours/new`).
- **Espera**: bloqueio de navegação pelo guarda da SPE-01 (redireção ao
  contexto do papel) — nenhuma listagem de rotas é exibida.

### V2 — Listagem + arquivadas + saldo (US2, FR-002/003/012, SC-002/006)

- **Dado**: sessão admin com ≥ 2 rotas (uma com brinde de saldo `> 0`,
  outra — seedada ou ajustada — com saldo `0`).
- **Quando**: abre `/admin/tours`.
- **Espera**: cada linha exibe nome, descrição, contagem de pontos, brinde,
  **saldo** e status; a linha com saldo `0` é reconhecível como esgotada
  sem ler tooltip (clarificação Q2 — sem estado "estoque baixo").
- **Quando**: ativa "exibir arquivadas".
- **Espera**: rotas arquivadas aparecem identificadas como arquivadas
  (rede mostra `GET /api/proxy/api/v1/gamification/routes?includeArchived=true`);
  desativando, elas desaparecem.
- **Quando**: API indisponível / resposta divergente do contrato.
- **Espera**: estado de erro acionável / `ContractViolationError`
  (Princípios V e I) — nunca tela em branco.

### V3 — Cadastro de rota (US1, FR-005/006/007/008, SC-001/003)

- **Dado**: sessão admin, `/admin/tours/new` aberta (substitui placeholder
  da SPE-01).
- **Quando**: preenche nome (≤ 200) e descrição (≤ 2000), adiciona ≥ 3
  pontos do catálogo (completo, cache único), reordena por **botões
  subir/descer** (com teclado e ponteiro), tenta adicionar o mesmo ponto
  duas vezes, informa brinde (nome ≤ 200 + estoque inicial ≥ 0) e salva.
- **Espera**: duplicata impedida no seletor; em salvar, `POST
  /api/proxy/api/v1/gamification/routes` com `spots` em `displayOrder` 1..n
  na ordem final e `prize` embutido; retorno à listagem com a rota nova e a
  ordem conferível na página de edição.
- **Quando**: salva sem nome/descrição/sem ponto/sem brinde, ou com texto
  acima dos limites, ou estoque inicial negativo.
- **Espera**: bloqueio em UI com indicação dos campos (Validação por
  formulário) — nenhum POST sai de má-forma.

### V4 — Edição e reordenação (US3, FR-009, SC-003)

- **Dado**: rota ativa com ≥ 2 pontos.
- **Quando**: abre `/admin/tours/[routeId]/edit` (lista ordenada carregada
  via `GET /gamification/routes/{id}`), inverte a ordem de dois pontos,
  remove um ponto (resta ≥ 1), altera a descrição e salva.
- **Espera**: `PATCH` contendo **somente os campos alterados** (diff);
  reabrir a edição mostra a nova ordem 1..n e a nova descrição.
- **Quando**: remove todos os pontos e tenta salvar.
- **Espera**: bloqueio (rota exige ≥ 1 ponto).
- **Espera adicional**: nome e estoque do brinde apenas-leitura no
  formulário de edição (FR-008) — com apontamento para o controle de
  estoque da listagem.

### V5 — Ajuste de estoque (US4, FR-004/010, SC-004)

- **Dado**: rota ativa selecionada na listagem.
- **Quando**: aciona a ação de estoque na **linha** (diálogo), informa um
  novo valor inteiro ≥ 0 e confirma.
- **Espera**: `PATCH /api/proxy/api/v1/gamification/prizes/{prizeId}`;
  saldo da linha atualiza imediatamente com o valor **retornado pela API**
  (invalidação de `["routes", ...]`); nenhum cálculo de saldo no cliente.
- **Quando**: informa valor negativo.
- **Espera**: bloqueio em UI; **Quando**: o backend rejeita (abaixo de
  reservas — probe P4), **Espera**: mensagem acionável e valor anterior
  preservado no diálogo.

### V6 — Arquivamento (US5, FR-011/012, SC-005)

- **Dado**: rota ativa na listagem.
- **Quando**: aciona "remover" e lê a confirmação.
- **Espera**: a mensagem descreve o efeito real (arquivamento com histórico
  preservado — não exclusão física) e nomeia a rota; cancelar não muda nada.
- **Quando**: confirma.
- **Espera**: `DELETE .../routes/{id}` → 204; rota sai da listagem padrão e
  reaparece identificada como arquivada ao ativar "exibir arquivadas";
  ações de editar/ajustar estoque não ofertadas para ela (backend nega com
  404 — probe P3).

### V7 — Fallback de ponto removido (FR-013, Edge Case 1)

- **Dado**: rota que referencia um ponto turístico removido via SPE-03
  (probe P2 define o comportamento real do backend antes).
- **Quando**: abre a listagem (e a página de edição da rota).
- **Espera**: rótulo de fallback identificável ("ponto turístico não
  encontrado") no lugar do nome; a rota não é ocultada nem quebra a página.

## Gate final da implementação

- `pnpm build` e `pnpm lint` **sem erros** (Constraint 6).
- Compare de contrato campo a campo contra o Swagger `/docs` antes de
  encerrar a feature (Governança 5) — divergências atualizam
  `contracts/gamification-api.md` + spec antes de reexecutar tasks.
