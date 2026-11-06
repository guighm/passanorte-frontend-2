# Data Model: Fundações e Autenticação do Painel

**Feature**: 001-panel-foundation-auth · **Date**: 2026-11-06 *(re-confirmado
contra a API real "Passanorte API" — `http://localhost:8010`)*

O painel não persiste dados de negócio (back-end FastAPI é o dono). O modelo
abaixo descreve os objetos de sessão e identidade que atravessam o painel.

## Entidades

### Operator (Operador da sessão)

Origem: `POST /api/v1/auth/login` devolve papéis na raiz **sem
`username`** — a identidade é o username submetido ao login; o
`GET /api/v1/auth/me` devolve `{ "username": string, "role": string }` e
revalida a identidade da sessão (T029). Nunca contém credenciais nem dados
de turista (RNF08); **não há `id` nem `name`** em nenhuma resposta do
contrato confirmado (T039/M2).

| Campo | Tipo | Regras |
| --- | --- | --- |
| `username` | string | exibição no cabeçalho do shell; nunca como dado sensível |
| `role` | enum | `"admin"` \| `"employee"` (**valores exatos confirmados por login real, 2026-11-06**); valor fora do enum ⇒ falha de sessão (edge case da spec) |

Validações (Princípio II): o painel NUNCA deduz ou edita `role` — mapeia
explicitamente os dois valores canônicos e consome o valor retornado;
`role` ausente/inválido ⇒ invalidar sessão.

### PanelSession (Sessão local do painel)

Origem: criada no login, renovada via `/api/v1/auth/refresh`, destruída no
logout. Residência: httpOnly cookies gravados por Route Handlers —
inacessíveis ao JS do navegador (FR-005).

| Campo | Onde vive | Regras |
| --- | --- | --- |
| `session` | cookie httpOnly | carrega o par de tokens/vigência repassado à API; nome `passanorte.session` |
| `refresh` | cookie httpOnly | token de renovação (string opaca, uso único); usado apenas server-side |
| expiração | atributos do cookie | alinhados a `expiresIn` do contrato (**3600 s observados**); renovação server-side antes de expirar por uso |

Transições de estado (todas server-side):

```text
ausente --login 200--> ativa
ativa   --/api/v1/auth/refresh 200--> ativa (NOVO token de renovação — ROTACIONADO, T043)
ativa   --logout 204--> nula (cookies expirados; + POST /api/v1/auth/logout — confirmado)
ativa   --/api/v1/auth/refresh 401--> nula (redireção ao login com aviso)
ativa   --resposta divergente do contrato--> nula + erro explícito (Princípio I)
```

Concorrência (US3 cenário 4): uma única renovação em curso por vez,
server-side; requisições simultâneas aguardam o mesmo resultado.

### Role (Papel)

Valor superficial de navegação consumido por `src/features/auth/guards`:

| Papel (valor da API) | Rotas no painel |
| --- | --- |
| `admin` | `/`, `/admin/*`, `/benefits` |
| `employee` | `/benefits` |
| sem sessão | `/login` apenas |

Regra cardinal (Princípio II): o papel governa navegação; a autorização real
é verificada pelo backend em cada chamada (403 ⇒ estado de erro da ação).

## Relações

- `Operator ─1:1→ PanelSession` (uma sessão ativa por operador no painel;
  sessões em abas múltiplas compartilham os mesmos cookies).
- `Role` é atributo de `Operator`; nenhuma tabela local de papéis.

## Não modelado (deliberado)

- Perfil completo de turista (fora de escopo, RNF08/LGPD).
- Dados de pontos/eventos/rotas — chegam nas SPE-03..05 via API.
- Nenhum dado da cidade fixado (RNF06).
