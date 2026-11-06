# Research: Gerenciamento de Funcionários (SPE-02)

**Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## D1. Estado real do `DataTable` — stub vazio a implementar

- **Finding**: `src/shared/components/DataTable/index.tsx` é **vazio (0
  bytes) no working tree E no git HEAD** (`e1fd3bb`, "SPE-01" — o arquivo
  foi comitado vazio). A spec e a constituição (Princípio IV) assumem
  reuso de um componente que na prática não foi implementado pela SPE-01.
- **Decision**: SPE-02 implementa o `DataTable` em
  `src/shared/components` com **TanStack Table** (biblioteca sancionada
  pela Constraint 1 para tabelas), como componente transversal genérico:
  colunas declarativas (`headers` + acesso a campo), dados tipados,
  ordenação client-side estável e conteúdo de célula customizável (badge
  de status, datas). Primeiro consumidor é a listagem de funcionários;
  SPE-03/04/05 reusam o mesmo componente.
- **Rationale**: implementá-lo fora de `src/shared/components`
  violaria o Princípio IV (duplicar componente transversal); implementá-lo
  "por conta" sem biblioteca reinventaria ordenação/memória de colunas.
- **Alternatives considered**:
  - Implementar o componente dentro de `src/features/employees` —
    rejeitado (transversal por definição; SPE-03 o consumiria).
  - Usar marcação `<table>` simples sem TanStack Table — rejeitado
    (biblioteca já sancionada e instalada; ordenação estável do FR-003 é
    exatamente o caso de uso dela).
- **Ação para tarefas**: task específica de implementação do DataTable +
  reavaliação: se a SPE-01 deixou outros stubs, não são destas tarefas.

## D2. Caminho de dados: servidor (Server Functions) em vez de BFF + TanStack Query

> **SUPERSEDED (2026-11-06, REVISÃO 2 — decisão do owner):** esta feature
> passa a usar **TanStack Query via túnel BFF client-side** — ver
> **D10** abaixo. O registro abaixo (e D4) permanece como histórico da
> rodada 1 e como padrão para features server-side; a análise que o gerou
> ainda vale para SPE-03/04/05 onde nenhum dono decidir o contrário.

- **Decision**: leitura da listagem por **Server Component**
  (`src/app/(panel)/admin/employees/page.tsx`) e mutações
  (cadastrar/editar/revogar/reativar) por **Server Functions**
  (`"use server"`, em `src/features/employees/actions`) — todas as calls
  via `apiFetch`/`apiJson` de `src/shared/lib/http.ts`, com
  `revalidatePath("/admin/employees")` após sucesso (FR-005).
- **Rationale**: a fundação já resolve renovação 401, anexo de sessão e
  violação de contrato no server-side (`http.ts`); usar o túnel BFF
  duplicaria essa política no cliente para zero ganho nesta feature
  (nenhum dado em tempo real, nenhum polling). Server Component elimina
  até o flash de carregamento de dados na entrada da rota (SC-006), com
  `loading.tsx` para a viagem de revalidação.
- **Alternatives considered**:
  - TanStack Query no cliente consumindo o BFF — rejeitado nesta
    feature (superfície extra para estados de erro/renovação já
    resolvidos server-side; TanStack Query permanece sancionado para
    specs que precisem de dados assíncronos client-side).
  - Client-side via BFF para as mutações — rejeitado: erros
    (`ApiError`, 403) seriam reclassificados no cliente (Princípio I
    requer classificação única e server-side).
- **Nota (Constraint 2)**: convenções verificadas em
  `node_modules/next/dist/docs` — Server Functions (`"use server"`) e
  `revalidatePath` vigentes, sem deprecation notice na versão 16.4.3.

## D3. Parse defensivo do contrato de funcionários (Princípio I)

- **Decision**: parsers explícitos em `src/features/employees/api` para
  `EmployeeView`, `EmployeeListResponse` e `EmployeeCreatedResponse`:
  validam tipos/limites do contrato (`items`/`total` na listagem;
  `id`, `name`, `username`, `status`, `createdAt`, `updatedAt` em cada
  view; `initialPassword` **presente e não-vazia** apenas na resposta de
  criação). Campo ausente/tipo inesperado ⇒ `ContractViolationError`
  com o caminho do endpoint e o campo divergente (edge case da spec).
- **Rationale**: mesmo padrão do `parseSessionResponse` da SPE-01;
  divergência nunca reinterpretada silenciosamente.
- **Nota**: o OpenAPI não tipa `createdAt`/`updatedAt` (pendência de
  probe) — o parser exige `string` não-vazia (formato de exibição é
  decisão de renderização, não de contrato).

## D4. Erros de negócio: parse do payload unificado `ApiError`

- **Finding**: `apiJson` (`src/shared/lib/http.ts`) lança
  `ApiUnavailableError("HTTP <status> em <path>")` para qualquer não-ok —
  descarta o corpo `ApiError { errorCode, message, details }` do backend
  (contrato confirmado na SPE-01). Para "username já existente" (FR-007),
  a mensagem acionável depende desse payload.
- **Decision**: ampliar `src/shared/lib/http.ts` (utilitário
  transversal — Princípio IV) com parse do corpo `ApiError` em
  não-oks: novo `ApiRequestError` transportando `status`, `errorCode`,
  `message` e `details`; `401 ⇒ SessionEndedError`,
  `403 ⇒ AuthorizationDeniedError` e `ContractViolationError`
  **preservados com semântica atual**. `features/employees` mapeia
  `errorCode` → mensagem de UI; `errorCode` desconhecido mostra
  `message` genérica e acionável.
- **Rationale**: classificação do erro ocorre uma única vez, no ponto
  único de chamada (D2); specs seguintes (SPE-03..07) reusam o mesmo
  `ApiRequestError`.
- **Alternatives considered**: parser de ApiError dentro de
  `features/employees` — rejeitado (duplicaria utilitário transversal;
  `http.ts` já alcança `features/auth` para erros de sessão por design).

## D5. Exposição única da credencial (FR-008, Princípios III/V)

- **Decision**: a Server Function de cadastro devolve
  `{ employeeId, username, initialPassword }` **uma única vez** ao
  componente cliente do formulário; o `OneTimeCredentialDialog` exibe
  com ação de copiar e aviso de não-reexibição; ao fechar, o valor
  some **com o componente** (estado local apenas). Nenhuma persistência:
  sem cache (não há TanStack Query nesta feature), sem
  `localStorage`/`sessionStorage`, sem log da senha (logs registram
  apenas `employeeId`/username e desfecho — RNF08/Princípio III).
- **Rationale**: SC-002 (zero reexibições/persistência) é verificável
  por construção: a senha nunca sai do estado do diálogo.
- **Edge registrado**: sessão encerrada no meio do cadastro ⇒
  `SessionEndedError` ⇒ redireção ao login (helper já existente);
  **nenhuma credencial é considerada criada sem resposta 201**
  (visto que não há reexibição, o admin deve repetir o cadastro se cair
  no login sem ver a senha — o backend pode ter criado o funcionário;
  nesse caso o cadastro repetido com username duplicado mostra o erro
  acionável e a listagem já mostra o funcionário).

## D6. Formulário: React Hook Form + Zod, limites espelhados do contrato

- **Decision**: `EmployeeFormDialog` (client) para **cadastro e edição**,
  com validação Zod espelhando o contrato (nome 1–200; username 3–100) —
  recusa local antes do envio (edge case de username fora dos limites).
  Edição envia PATCH **total** dos dois campos quando alterados (o
  contrato aceita parcial; o formulário editável completo é mais simples
  e atende FR-009) — **apenas campos alterados** são incluídos no corpo
  (envio parcial real), com aviso de reemissão de credencial quando o
  username mudar (clarificação 2026-11-06).
- **Alternatives considered**: modal separado para edição — rejeitado (um
  diálogo com modo `create|edit` evita duplicação de validação/UI).

## D7. Ordenação estável (FR-003, SC-005)

- **Decision**: ordenação alfabética por `name` aplicada na renderização
  (client-side, no próprio `DataTable` via sua ordenação) — locale
  `pt-BR`, `Intl.Collator` com `sensitivity: "base"` (nomes próprios);
  estável entre revalidações: mesmo dataset ⇒ mesma ordem.
- **Rationale**: a API não define ordem (contrato sem query params);
  decidir na exibição, como clarificado.

## D8. Pendências de contrato — probe na API real (decisão da clarificação)

- **Status**: `status` revogado, `errorCode` de username duplicado,
  comportamento de re-revogação e 404 de id inexistente — a confirmar
  por **probe** (revogar funcionário de teste com sessão admin e
  observar respostas), no padrão da SPE-01 (T040).
- **Bloqueio**: a sonda exige credenciais de administrador, que
  **NUNCA ficam registradas em artefatos** (SPE-01): o owner executa ou
  as fornece interativamente no início da implementação (task **T005**
  de `tasks.md` espera isso antes do parse de `status` da listagem).
- **Interim design**: enquanto a sonda não rodar, o parser trata
  `status` como enum aberto e renderiza badge genérico ("revogado" para
  qualquer valor ≠ `"active"`), MAS qualquer valor diferente de
  `"revoked"` confirmado deve virar violação registrada — o probe
  resolve antes das tasks de UI.
- **Ação**: task **T005** em `tasks.md` (probe + registro em
  `contracts/employees-api.md` e nesta spec).

## D9. Guarda de rota e RBAC (FR-001)

- **Finding**: `/admin/employees` já está em `src/app/(panel)/admin/*` →
  guardas da SPE-01 (`src/proxy.ts` + `ROLE_RULES` de
  `features/auth/guards`) bloqueiam funcionário **antes de renderizar**
  (roles `admin` only) e a navegação é condicionada pelo shell. Sem
  código novo de RBAC nesta feature — apenas reforço: a rota real
  mantém o mesmo path (não mover).
- **Alternatives considered**: duplicar guarda na feature — rejeitado
  (Princípio IV: nenhuma duplicação de utilitário transversal).

## Resumo de decisiones cruzadas

| # | Decisão | Impacto nas tasks |
| --- | --- | --- |
| D1 | DataTable: implementação genérica com TanStack Table | task transversal antes da listagem |
| D2 | Server Component + Server Functions (sem BFF/Query) | api/actions server-side |
| D3 | Parsers defensivos por endpoint | camada api/ antes das telas |
| D4 | `ApiRequestError` em `shared/lib/http.ts` | extensão transversal reusável |
| D5 | Credencial única em estado efêmero do diálogo | componente dedicado + teste manual SC-002 |
| D6 | RHF + Zod espelhando limites do contrato | um diálogo para criar/editar |
| D7 | Ordenação alfabética pt-BR no DataTable | configuração de coluna |
| D8 | Probe pendente (credenciais) | T005 antes da UI |

---

## D10. Caminho de dados REVISÃO 2: TanStack Query (`useQuery` + `useMutation`) via túnel BFF

- **Contexto**: decisão do owner (re-plan de 2026-11-06): "usar o TanStack
  Query para cachear as requisições, e usar as mutations". Supersedes D2
  p/ esta feature; library já sancionada (Constraint 1) e instalada
  (`@tanstack/react-query` 5.105).
- **Decision**:
  - Leitura: `useQuery` (`queryKey: ["employees"]`) consumindo
    EXCLUSIVAMENTE o túnel BFF `src/app/api/proxy/[...path]` — a sessão
    continua anexada server-side (Constraint 5), e a renovação 401 +
    replay continuam única no túnel (política da SPE-01).
  - Mutações (cadastrar/editar/revogar/reativar): `useMutation` pelo
    mesmo túnel; em sucesso `queryClient.invalidateQueries({ queryKey:
    ["employees"] })` — substitui `revalidatePath` na FR-005 (a UI
    reflete o estado retornado pela API, nada otimista confirmado).
  - Cache: resposta de CRIAÇÃO (com `initialPassword`) NUNCA entra no
    cache do QueryClient — o valor flui do `onSuccess` da mutação para o
    estado do `OneTimeCredentialDialog` e morre com ele (Princípio III/SC-002;
    mutações não são cacheadas por definição; nunca ler
    `initialPassword` de volta de `mutationCache`/DevTools).
  - Provider transversal novo: `src/shared/components/QueryProviders/`
    (client) montado em `src/app/(panel)/layout.tsx` — specs futuras
    (SPE-03..07) reusam o mesmo provider.
  - Erros: classificação EM MÓDULO PURO COMPARTILHADO
    `src/shared/lib/api-error.ts` (remediação U1 — sem duplicação entre
    `http.ts` server e `bff.ts` client) e cliente do túnel novo
    `src/shared/lib/bff.ts` (client-safe) com a MESMA semântica de
    `throwApiErrorResponse`: `ApiError` ⇒ `ApiRequestError`;
    `HTTPValidationError` (422) ⇒
    `validation_error`; 401 (renovação do túnel falhou) ⇒ retorno ao
    login (`/login?reason=session-expired`); 403 ⇒ estado de erro da
    ação. Parsers puros do contrato migram para
    `features/employees/api/contract.ts` (client-safe, sem dependências
    de servidor) — Princípio I mantido no cliente.
- **Rationale**: atende o pedido do owner (cache + mutations), reusa o
  túnel como caminho único (Constraint 5 — nada da sessão vaza ao
  client) e é o desenho que a SPE-01 já planejou para specs client-side
  (D3 da fundação: "BFF mínimo ... necessário nas próximas specs").
- **Alternatives considered**:
  - Manter Server Functions (rodada 1) e usar `useMutation` apenas como
    wrapper das actions — rejeitado: `useQuery` sem fetch HTTP real não
    cachearia nada (o pedido do owner), e duplicaria caminhos de dados.
  - `staleTime` longo para "caching" mais agressivo — rejeitado: com
    `invalidateQueries` pós-operação, default (fresh on refocus? usar
    `staleTime: default`) basta; inventar política sem necessidade viola
    simplicidade; ajuste fino fica para plan de specs seguintes.
- **Impacto nas tasks**: substitui `features/employees/actions` e camadas
  `api/index.ts` server-side (T010–T011, T015–T016, T019–T022 da rodada 1)
  por: provider transversal, `bff.ts`, `contract.ts`, `queries.ts` e
  rewire de `EmployeesView`/page (ver tasks re-geradas em `/speckit-tasks`).

## D11. Ícones via lucide-react (REVISÃO 2 da mesma decisão do owner)

- **Decision**: ícones das ações (novo funcionário, editar, revogar,
  reativar, copiar) usam **lucide-react** (já instalado, 1.64 —
  sancionado na Constraint 1, escolha "gratis/open source" RNF15).
  Import por ícone (tree-shaking) e tamanho/cores via tokens de cor do
  tema (`currentColor`), sem novo ícone ad hoc em SVG inline.
- **Rationale**: biblioteca já sancionada — nenhuma nova dependência;
  consistentes entre specs.
- **Impacto**: `EmployeesView`/`RowActions`/diálogos ganham ícones; textos
  pt-BR permanecem (ícone complementa, nunca substitui o rótulo —
  acessibilidade FR-016).
