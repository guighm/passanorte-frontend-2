# Quickstart: Gerenciamento de Pontos Turísticos (SPE-03)

**Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Cenários de validação ponta a ponta contra a **API real** ("Passanorte API"
em `http://localhost:8010`). Camada de dados client-side (TanStack Query +
túnel BFF — padrão SPE-02). Referências: [contracts/spots-api.md](./contracts/spots-api.md)
· [data-model.md](./data-model.md) · [research.md](./research.md).

## Pré-requisitos

```bash
curl -fsS http://localhost:8010/health    # {"status":"ok","database":"ok"}
API_BASE_URL=http://localhost:8010        # .env.local (nunca em artefatos)
# Mapa: OpenStreetMap via react-leaflet (emenda 2.0.0) — sem chave nem billing
pnpm dev ; pnpm build && pnpm lint        # sem erros (Constraint 6)
```

Credenciais de seed do administrador: fornecidas pelo owner **apenas
interativamente** (nunca em artefatos).

## Probe de contrato (T inicial — antes das tasks de formulário)

Com sessão admin real, executar e registrar em `contracts/spots-api.md`:
1. `GET /api/v1/tourists/interest-categories` → catálogo real; **criar um
   spot de teste com uma categoria do catálogo e conferir se a chave
   sobrevive** (correspondência de chaves — obrigatório para o seletor).
2. Criar spot de teste → registrar formato real de `schedule[].weekday`
   e de `createdAt`/`updatedAt`.
3. POST com coordenada fora de faixa / horário inválido → registrar
   `errorCode` (é `HTTPValidationError` ou `ApiError`?).
4. DELETE de id inexistente → registrar 404/`errorCode`.
5. Recriar e confirmar o `status` default do backend quando omitido.

## Cenários de validação (spec US1–US4)

Login como **administrador** (funcionário verá apenas `/benefits`); abrir
`/admin/attractions`.

### US1 — Listagem + filtros + paginação

| # | Passo | Esperado |
| --- | --- | --- |
| 1.1 | Abrir a área | Tabela (nome, categorias, status, datas), total, controles prev/next refletindo `page/pageSize` da API |
| 1.2 | Primeira visita vs revisita | Primeira: estado de carregamento distinto; revisita: instantânea via cache |
| 1.3 | Filtrar por cada status | Consulta recarrega com `status=` na query; total/controles refletem o filtro |
| 1.4 | Filtrar por categoria | Apenas pontos com a categoria (na página carregada — limitação client-side); filtro preservado ao paginar |
| 1.5 | Sem resultados no filtro | Vazio acionável (sugere limpar filtro / cadastrar) |
| 1.6 | API derrubada ou payload fora do contrato | Erro explícito acionável com nova tentativa; nada silencioso |

### US2 — Cadastro

| # | Passo | Esperado |
| --- | --- | --- |
| 2.1 | Abrir formulário com catálogo OK | Categorias do catálogo (rótulos pt); mapa OSM carregado centrado no primeiro ponto (ou visão global se vazio) |
| 2.2 | Marcar posição no mapa | lat/lng preenchidas; digitar coordenadas reposiciona o marcador (SC-004) |
| 2.3 | Preencher tudo e salvar | Carregamento; ao 201, ponto na listagem (invalidação) |
| 2.4 | Salvar sem categoria / sem cronograma / horário inválido / coordenada fora de faixa | Recusa cliente junto ao campo, sem envio |
| 2.5 | Salvar com campo que o backend recusa | Erro acionável no formulário, dados preservados, listagem inalterada |
| 2.6 | (histórico da rodada Google — removido pela emenda 2.0.0; OSM não exige chave) | — |
| 2.7 | Catálogo indisponível | Erro no seletor com nova tentativa; nenhuma categoria inventada |

### US3 — Edição

| # | Passo | Esperado |
| --- | --- | --- |
| 3.1 | Editar só o nome | PATCH parcial; listagem reflete via invalidação, sem reload de página |
| 3.2 | Reposicionar marcador e salvar | Nova lat/lng enviada e refletida |
| 3.3 | Alterar status para temporariamente fechado | PATCH com `status`; badge distinto na listagem |
| 3.4 | Backend recusa | Erro no formulário; dados preservados; listagem inalterada |

### US4 — Remoção (permanente)

| # | Passo | Esperado |
| --- | --- | --- |
| 4.1 | Remover com confirmação (diálogo nomeia ponto + "permanente") | Ao 204, ponto sai da listagem |
| 4.2 | Cancelar diálogo | Nada enviado; listagem inalterada |
| 4.3 | Remover ponto já removido (ou API indisponível) | Erro acionável; listagem reflete estado real após revalidação |

### RBAC (FR-001 / SC-004 da SPE-02)

| # | Passo | Esperado |
| --- | --- | --- |
| R.1 | Login como funcionário; tentar `/admin/attractions` | Sem item na navegação; por endereço, redirecionado sem renderização |
| R.2 | 403 de alguma chamada com sessão de funcionário | Estado de erro da ação, nunca silencioso |

## Checklist de encerramento

- [x] Probe de contrato executado (2026-11-06, sessão admin real — task
      T004); pendências resolvidas em `contracts/spots-api.md` +
      `data-model.md` + spec (incl. divergência 422→`ApiError` unificado)
- [ ] SC-001…SC-006 confirmados pelos cenários acima
- [ ] `pnpm build` e `pnpm lint` sem erros
- [ ] Nenhum dado de cidade/categoria/centro hard-coded (inspeção)
- [ ] Nenhuma credencial/chave registrada em artefatos ou logs (mapa OSM não usa chave)
