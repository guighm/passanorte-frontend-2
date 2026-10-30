# Data Model: Fundações e Autenticação do Painel

**Feature**: 001-panel-foundation-auth · **Date**: 2026-10-30

O painel não persiste dados de negócio (back-end FastAPI é o dono). O modelo
abaixo descreve os objetos de sessão e identidade que atravessam o painel.

## Entidades

### Operator (Operador da sessão)

Origem: resposta de `POST /auth/login` (e `GET /auth/me`). Nunca contém
credenciais nem dados de turista (RNF08).

| Campo | Tipo | Regras |
| --- | --- | --- |
| `id` | string | identificador vindo da API; imutável no painel |
| `username` | string | exibido onde relevante; nunca como dado sensível |
| `name` | string | exibição no cabeçalho do shell |
| `role` | enum | `"administrador"` \| `"funcionário"` — obrigatório; valor fora do enum ⇒ falha de sessão (edge case da spec) |

Validações (Princípio II): o painel NUNCA deduz ou edita `role` — apenas
consome o valor retornado; `role` ausente/inválido ⇒ invalidar sessão.

### PanelSession (Sessão local do painel)

Origem: criada no login, renovada via `/auth/refresh`, destruída no logout.
Residência: httpOnly cookies gravados por Route Handlers — inacessíveis ao
JS do navegador (FR-005).

| Campo | Onde vive | Regras |
| --- | --- | --- |
| `session` | cookie httpOnly | carrega o par de tokens/vigência repassado à API; nome sugerido `passanorte.session` |
| `refresh` | cookie httpOnly | token de renovação; usado apenas server-side |
| expiração | atributos do cookie | alinhados a `expires_in` do contrato; renovação server-side antes de expirar por uso |

Transições de estado (todas server-side):

```text
ausente --login 200--> ativa
ativa   --/auth/refresh 200--> ativa (novos tokens, mesma sessão)
ativa   --logout 204--> nula (cookies expirados; + POST /auth/logout se previsto)
ativa   --/auth/refresh 401--> nula (redireção ao login com aviso)
ativa   --resposta divergente do contrato--> nula + erro explícito (Princípio I)
```

Concorrência (US3 cenário 4): uma única renovação em curso por vez,
server-side; requisições simultâneas aguardam o mesmo resultado.

### Role (Papel)

Valor superficial de navegação consumido por `src/features/auth/guards`:

| Papel | Rotas no painel |
| --- | --- |
| `administrador` | `/`, `/admin/*`, `/beneficios` |
| `funcionário` | `/beneficios` |
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