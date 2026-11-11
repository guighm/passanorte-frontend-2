# Quickstart: Concessão de Brindes — Área do Funcionário (SPE-06)

Guia de validação end-to-end. Pré-requisitos, cenários dos frs (US1–US3) e
desfechos esperados. Contrato: [contracts/gamification-api.md](./contracts/gamification-api.md);
modelo: [data-model.md](./data-model.md).

## Pré-requisitos

1. **API real no ar** em `API_BASE_URL` (`http://localhost:8010` —
   `.env.local`); conferir `GET /api/v1/health`.
2. **Contas**: administrador existente (seed da SPE-01) **e** funcionário —
   criar via painel (SPE-02) com credenciais geradas exibidas uma única vez;
   credenciais em variáveis locais (nunca em código, RNF10/Princípio III).
3. **Fixture de dados** (via painel/admin ou probe D7):
   - 1 ponto turístico ativo (SPE-03);
   - 1 rota ativa com brinde com **estoque ≥ 1** (SPE-05);
   - **turista fixture** registrado via `POST /api/v1/tourists` + login, com
     **enrollment** na rota e visitas marcadas em todos os pontos
     (`POST /visitation/spots/{spot_id}/visits` com GPS na coordenada do
     ponto) ⇒ código real obtido em `GET /gamification/enrollments/{id}`
     (`redemptionCode`). Copiar o código para o QR de teste (ex.: gerar PNG
     QR do código com qualquer gerador local).
4. Painel no ar: `pnpm dev` (Next 16 — seguir `AGENTS.md`).
5. Estado da chave de validação: sem endpoint publicado, `VALIDATE_ENDPOINT_LIVE
   = false` (mock governado, D4) — após compare, flip a `true` e refazer os
   cenários contra o backend real (P2).

## Cenários

### US1 — Ler o código e conferir dados (FR-002/003/010)

1. Login como **funcionário** ⇒ redireciona a `/benefits` (única área
   visível no menu — US3.1). Câmera pede permissão ⇒ aceitar.
2. Apresentar o QR do código (ou digitar em "entrada manual" e acionar
   **validar**).
3. **Esperado**: validação automática ao ler (sem botão, clarify Q4);
   conferência exibindo **rota concluída**, **brinde + disponibilidade**,
   ponto de retirada **sugerido** (último uso da sessão; editável), código
   exibido. **O estoque não muda** (recarregar a listagem de rotas como admin
   confirma — validação não consome, FR-003/SC-003).
4. **Negativos**: código desconhecido/malformado ⇒ desfecho "código
   inválido" **distinto** e imediata nova tentativa (FR-006/FR-008); rota não
   concluída (turista sem todas as visitas) ⇒ desfecho distinto sem dados
   concessionáveis.

### US2 — Confirmar a concessão e desfechos (FR-004..FR-009)

1. Em conferência com dados válidos: redigir o código (botão só habilita
   com o código batendo — clara/espaços ignorados, FR-004) e confirmar.
2. **Esperado**: registro da concessão exibido (brinde, código consumido,
   `concededBy` = operador da sessão) — câmera **pausada**; tela permanece
   até "novo atendimento" (FR-009). Saldo na listagem de rotas (admin)
   reflete a **baixa** (SC-004). Revalidar/conceder o mesmo código ⇒ 409
   "já utilizado" (FR-006).
3. **Sem estoque**: fixture com brinde zerado (ajuste via SPE-05) ⇒ desfecho
   distinto indicando que **o código permanece válido** (FR-007); tentar
   novamente após repor estoque ⇒ concessão completa (SC-003).
4. **Cancelamento**: em conferência, cancelar ⇒ volta ao leitor sem efeito.

### US3 — RBAC (FR-001)

1. Login como funcionário ⇒ navegação expõe apenas `/benefits`; `pnpm` do
   shell mostra **nenhum** item admin (US3.1/SC-006).
2. Digitar manualmente `/admin/tours` ⇒ guarda da SPE-01 redireciona para a
   área própria (US3.2).
3. Login como **administrador** ⇒ `/benefits` opera o mesmo fluxo (US3.3).
4. 403 do backend (se o probe P1 negar um papel) ⇒ mensagem acionável, não
   tela em branco (US3.4).

## Gates de pronto

- `pnpm build` e `pnpm lint` **sem erros** (Constraint 6).
- Probe de contrato executado (P1–P5) e
  `contracts/gamification-api.md` atualizado **antes** da UI depender dos
  `errorCode`s; compare do endpoint de validação encerrado (flip da chave —
  Governança 5; SC-007).
- Acessibilidade mínima: entrada manual, confirmação e "novo atendimento"
  operáveis por teclado, com labels (FR-014).
