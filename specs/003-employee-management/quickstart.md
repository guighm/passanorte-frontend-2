# Quickstart: Gerenciamento de Funcionários (SPE-02)

**Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

> **REVISÃO 2 (2026-11-06):** camada de dados client-side — TanStack Query
> via túnel BFF (research D10). Diferenças nos cenários: a primeira visita
> mostra estado de carregamento do `useQuery`; revisitas vêm do cache
> (instantâneas); após toda mutação bem-sucedida a UI reflete o estado da
> API via **invalidação de cache** (`invalidateQueries` — FR-005), não via
> recarregamento de página/servidor. Demais cenários inalterados.

Cenários de validação de ponta a ponta da feature contra a **API real**
("Passanorte API" em `http://localhost:8010`). Executar após
`/speckit-implement` concluir as tasks. Referências: contrato
[contracts/employees-api.md](./contracts/employees-api.md), modelo
[data-model.md](./data-model.md), detalhes de decisão [research.md](./research.md).

## Pré-requisitos

```bash
# 1. API real rodando
curl -fsS http://localhost:8010/health    # {"status":"ok","database":"ok"}

# 2. Env do painel apontando para a API real (.env.local — nunca em artefatos)
API_BASE_URL=http://localhost:8010

# 3. Painel rodando
pnpm dev

# 4. Qualidade (definição de pronto — Constraint 6)
pnpm build && pnpm lint        # sem erros

# 5. Credenciais de seed do administrador: fornecidas pelo owner
#    APENAS interativamente (usar e descartar; NUNCA registrar em artefatos)
```

## Probe de contrato (T005 — antes dos cenários de UI)

Com sessão de administrador real (login via painel ou curl), executar e
registrar os valores em `contracts/employees-api.md`:

1. Criar funcionário de teste `probe-spe02` na **UI** (ou
   `POST /api/v1/employees`) → registrar formato de `createdAt`/
   `updatedAt` no payload real.
2. Preencher username já existente no cadastro → registrar `errorCode`
   do `ApiError`.
3. Revogar `probe-spe02` → registrar valor exato de `status` retornado
   na listagem.
4. Re-revogar o mesmo funcionário → registrar 204 idempotente ou erro.
5. `GET /api/v1/employees/999999` → registrar 404 / `errorCode`.

## Cenários de validação (spec US1–US4)

Faça login como **administrador** (funcionário verá apenas `/benefits`).

### US1 — Listagem

| # | Passo | Esperado |
| --- | --- | --- |
| 1.1 | Abrir `/admin/employees` | Tabela de todos os funcionários (nome, usuário, status, datas), total exibido, ordenação alfabética estável por nome |
| 1.2 | Observar entrada da rota (primeira visita; revisita deve vir do cache) | Carregamento distinto (`isLoading`/`isPending` do useQuery), sem flash de "sem dados"; revisita instantânea via cache (REVISÃO 2) |
| 1.3 | API sem funcionários (banco limpo) | `EmptyState` com chamada acionável para cadastrar |
| 1.4 | Derrubar a API (`API_BASE_URL` inválida ou parar `:8010`) e recarregar | `ErrorState` acionável com nova tentativa; tela não travada (SC-006) |

### US2 — Cadastro + credencial única

| # | Passo | Esperado |
| --- | --- | --- |
| 2.1 | Cadastrar funcionário com nome válido e username inédito | Carregamento no envio; ao 201, diálogo único com username + senha inicial, ação de copiar e aviso de não-reexibição |
| 2.2 | Fechar o diálogo e inspecionar listagem, edição, histórico, devtools | Senha não aparece em NENHUM lugar; sem cache/localStorage/log (SC-002) |
| 2.3 | Verificar a listagem | Novo funcionário ativo; papel nunca foi escolhido na UI (FR-002) |
| 2.4 | Cadastrar com username de 2 caracteres | Recusa cliente (3–100 do contrato), sem envio |
| 2.5 | Cadastrar com username duplicado | Erro acionável junto ao formulário; dados digitados preservados; nada apresentado como sucesso |
| 2.6 | Cadastrar com API derrubada | Erro de comunicação explícito; sem "carregando" infinito; sem credencial parcial apresentada |

### US3 — Edição cadastral

| # | Passo | Esperado |
| --- | --- | --- |
| 3.1 | Editar apenas o nome de um funcionário | PATCH com campo único; loading; listagem reflete sem reload completo |
| 3.2 | Editar o username | Aviso de reemissão de credencial no diálogo (clarificação 2026-11-06); ao salvar, listagem reflete |
| 3.3 | Salvar com dados que o backend recusa | Erro acionável no formulário; dados mantidos; listagem inalterada |
| 3.4 | Abrir edição de funcionário revogado | Campos editáveis, estado de acesso sinalizado |

### US4 — Revogação / reativação

| # | Passo | Esperado |
| --- | --- | --- |
| 4.1 | Revogar um funcionário ativo | Diálogo de confirmação nomeia funcionário + efeito; ao 204, listagem o exibe **revogado** (badge distinto) |
| 4.2 | Cancelar o diálogo de revogação | Nenhuma operação enviada; status inalterado |
| 4.3 | Confirmar login do funcionário revogado (sessão dele) | Backend recusa a credencial — o painel apenas reflete o status (Princípio II) |
| 4.4 | Reativar o funcionário revogado | Confirmação explícita; ao 200, listagem volta a **ativo** |
| 4.5 | Revogação/reativação com API falhando | Erro explícito; status permanece; diálogo não reabre sozinho |

### RBAC reforço (FR-001, SC-004)

| # | Passo | Esperado |
| --- | --- | --- |
| R.1 | Sair; logar como **funcionário** | Navegação não mostra "Funcionários"; `/admin/employees` por endereço redireciona à área permitida sem renderizar nada |
| R.2 | (Divergência) 403 em chamada de funcionário | Tratado como estado de erro da ação, nunca silencioso |

## Checklist de encerramento

- [ ] Probe de contrato executado; valores registrados em
      `contracts/employees-api.md`, `data-model.md` e spec
- [ ] SC-001…SC-006 confirmados pelos cenários acima
- [ ] `pnpm build` e `pnpm lint` sem erros
- [ ] Nenhuma credencial/senha em artefatos, logs ou histórico do shell
