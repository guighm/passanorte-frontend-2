# Quickstart: Gerenciamento de Eventos (SPE-04)

Guia de validação end-to-end. Detalhes de contrato em
[contracts/events-api.md](./contracts/events-api.md); entidades em
[data-model.md](./data-model.md); decisões em [research.md](./research.md).

## Pré-requisitos

1. **API FastAPI real** ("Passanorte API") em execução em
   `http://localhost:8010` (`GET /openapi.json` responde) — com dados de
   seed: ≥ 1 administrador e ≥ 1 ponto turístico existente. Se um fluxo
   exige ponto "fechado permanentemente", seedar/cadastrar um.
2. **Painel** em execução (`pnpm dev`) — o túnel BFF
   (`src/app/api/proxy/[...path]`) apontando para a API
   (config da SPE-01).
3. Sessão de **administrador** (login por `src/app/login`). Uma sessão de
   **funcionário** é necessária apenas para o teste de RBAC (RF-001).

## Passo 0 — Probe de contrato (primeira task da implementação)

Antes da UI: executar os probes de contrato (pendências 1–5 em
`contracts/events-api.md`) com sessão de admin real via túnel BFF e
registrar resultados no próprio arquivo de contrato. A UI NÃO avança em
depender deles antes do registro (padrão SPE-02 T005 / SPE-03 T004).

## Validações (cada uma independente)

### V1 — RBAC (FR-001)

- **Dado**: sessão de funcionário não-admin.
- **Quando**: tenta navegar para `/admin/events` (e `/admin/events/new`).
- **Espera**: bloqueio de navegação pelo guarda da SPE-01 (redireção ao
  contexto do papel) — nenhuma listagem de eventos é exibida.

### V2 — Listagem + filtro por ponto (US1, FR-002/003, SC-001/006)

- **Dado**: sessão admin com eventos seedados (≥ 2 pontos distintos).
- **Quando**: abre `/admin/events`.
- **Espera**: todos os eventos, com **nome do ponto**, data (formato
  pt-BR), descrição e preço em moeda; ordenação por data de ocorrência
  (ordem da API).
- **Quando**: seleciona um ponto no filtro.
- **Espera**: somente eventos daquele ponto (server-side — rede mostra
  `GET /api/proxy/api/v1/events?spotId=…`); limpar o filtro restaura tudo.
- **Quando**: filtro sem resultados.
- **Espera**: estado de vazio acionável (não tela branca/erro).

### V3 — Cadastro (US2, FR-005/006/007, SC-002/003)

- **Dado**: sessão admin, `/admin/events/new` aberta.
- **Espera**: seletor habilita SOMENTE com catálogo completo de pontos
  (todas as páginas carregadas — habilitar com parcial é falha de FR-006).
- **Quando**: tenta submeter vazio/inválido (sem ponto, data ruim, preço
  negativo, descrição vazia).
- **Espera**: nenhuma requisição sai; erro campo a campo.
- **Quando**: submete válido (ponto, `2026-12-01`, descrição, preço
  `25.50`).
- **Espera**: `201`; navegação de volta à listagem; evento visível com os
  dados e preço `R$ 25,50` — **sem recarregar a página manualmente**.
- **Quando**: submete para um ponto "fechado permanentemente".
- **Espera**: mensagem acionável do 409; campos preservados.

### V4 — Edição parcial (US3, FR-008, D8)

- **Dado**: evento existente; abre `/admin/events/[id]/edit`.
- **Espera**: formulário preenchido com o estado atual.
- **Quando**: altera somente a descrição e submete.
- **Espera**: rede traz PATCH só com `{"description": "…"}`; listagem
  reflete; demais campos inalterados (comparar com o registro seed).
- **Quando**: re-vincula a outro ponto e submete.
- **Espera**: PATCH com `spotId`; listagem exibe o novo vínculo (resolvido
  pelo catálogo).
- **Quando**: descarta.
- **Espera**: nada enviado; registro inalterado.

### V5 — Remoção com confirmação (US4, FR-009, SC-004)

- **Quando**: aciona remover e **cancela**.
- **Espera**: nenhuma requisição destrutiva; evento permanece.
- **Quando**: aciona remover e **confirma**.
- **Espera**: diálogo identificava o evento (ponto resolvido + data);
  `DELETE` ⇒ `204`; evento sai da listagem sem recarregar a página.

### V6 — Falhas acionáveis (FR-010, SC-005)

- **404 em removidos**: remover em outra aba/sessão e re-tentar ⇒
  mensagem "não existe mais"; listagem revalidada.
- **403**: com token de funcionário em devtools (ou interceptando) ⇒
  mensagem de acesso negado — nunca silencioso.
- **Datas passadas**: cadastrar evento com data passada ⇒ aceito
  (clarificação Q1 — nenhuma validação bloqueia).

### V7 — Quedas da API (estados distintos)

- **Dado**: API em execução **parada**.
- **Quando**: abre a listagem / envia formulário.
- **Espera**: estados de erro distintos e acionáveis (retry na listagem);
  dados digitados preservados; nenhum travamento sem feedback.

## Gate de pronto (Constraint 6)

- `pnpm build` e `pnpm lint` sem erros.
- **Navegação por teclado** no formulário, seletor, diálogo e ações de
  linha; labels em todos os campos.
- Contrato registrado em `contracts/events-api.md` atualizado com os
  resultados dos probes (compare de contrato obrigatório antes de
  declarar a feature encerrada — governança §5).
