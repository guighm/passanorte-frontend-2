# Data Model: Gerenciamento de Eventos (SPE-04)

**Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md) | **Contrato**: [contracts/events-api.md](./contracts/events-api.md)

Modelo derivado EXCLUSIVAMENTE do OpenAPI real (Princípio I) —
`components.schemas`: `EventCreateRequest`, `EventUpdateRequest`,
`EventView`, `EventListResponse`. Nenhum campo inventado.

## Entidades

### Evento (`EventView`)

Registro carregado pelo backend em TODAS as leituras (criação, edição,
listagem). Identificador atribuído pelo backend.

| Campo            | Tipo     | Regras do contrato / validações client                        |
| ---------------- | -------- | --------------------------------------------------------------- |
| `id`             | integer  | identificador — nunca digitado; chave do cache e das rotas de edição |
| `spotId`         | integer  | ≥ 1; vínculo obrigatório com ponto turístico existente; revalidado pelo backend em POST/PATCH (404 desconhecido / 409 permanentemente fechado) |
| `occurrenceDate` | string `date` | formato `YYYY-MM-DD` puro (sem horário/fuso); **sem restrição de período no cliente** — datas passadas permitidas (clarificação 2026-11-10) |
| `description`    | string   | 1–2000 caracteres; obrigatório                                  |
| `ticketPrice`    | number   | ≥ 0; duas casas decimais (exactness por centavos no backend); 0 = gratuito; leitura SEMPRE number |

**Sem status, sem createdAt/updatedAt, sem nome do ponto embutido** — o
contrato não carrega; nada é exibido além do que o contrato entrega
(Princípio I). O nome do ponto é resolvido no cliente via catálogo da
SPE-03 (abaixo).

### Ponto Turístico (`SpotView` — reuso da SPE-03)

Entidade de referência — **não é re-moldada aqui**: events importa os
parsers/constantes de `@/features/attractions` (research D6). Usos:

- **Seletor** (`SpotSelector`): catálogo COMPLETO (laço de todas as
  páginas, `pageSize` máximo) — FR-006; habilita seleção só com catálogo
  integral (nunca parcial).
- **Listagem de eventos**: `spotId` → nome (`spot-name.ts`); fallback
  identificável "ponto turístico não encontrado" quando não resolvido.
- **Validação de negócio**: `status: "permanentlyClosed"` reprovado no
  lado do backend (409) — o cliente NÃO proíbe (Princípio II), apenas
  exibe a falha acionável.

## Formas de escrita

### `EventCreateBody` (POST — todos obrigatórios)

| Campo            | Envelope client                          |
| ---------------- | ----------------------------------------- |
| `spotId`         | number                                    |
| `occurrenceDate` | string `YYYY-MM-DD`                       |
| `description`    | string 1–2000                             |
| `ticketPrice`    | number ≥ 0 (2 casas; probe 2 registra padrão) |

`additionalProperties: false` — nenhum campo extra.

### `EventUpdateBody` (PATCH — TODOS opcionais, campos OMITIDOS permanecem)

Mesmos campos nulos-possíveis. O cliente envia **somente o diff** atual →
digitado (research D8); patch vazio é evitado (se nada mudou, não há
submit). `spotId` revalidado pelo backend (404/409).

## Relações e integridade

- Evento **1:1** Ponto Turístico (vínculo único por `spotId`); um ponto
  acumula N eventos.
- Sem unicidade imposto pelo contrato (mesma data + mesmo ponto é
  permitido — decisão do administrador; registrado na spec como edge
  case).
- **Remoção de ponto** (DELETE físico na SPE-03): comportamento sobre os
  eventos dependentes é pendência 4 do probe (erro/cascata/órfão);
  interim client: fallback identificável, evento nunca oculto (FR-012).

## Ciclo de vida

```text
[ — ] --POST /events (201)-->           Evento existente
Evento existente --PATCH /events/{id} (200)-->  Evento (parcial)
Evento existente --DELETE /events/{id} (204)--> [ — ] (remoção física)
POST/PATCH --409--> permanece (falha acionável)
DELETE/edição sobre removido --404--> permanece na UI (falha acional + listagem revalidada)
```

Sem estados de status no evento (contrato não tem): "passado"/"próximo"
não é dado — listagem ordena por `occurrenceDate,id` (ordem da API
respeitada).

## Cache TanStack Query

| `queryKey`                         | Conteúdo                          | Invalidação                        |
| ---------------------------------- | ---------------------------------- | ---------------------------------- |
| `["events", spotId|null]`          | `EventListResponse` por filtro     | mutações create/update/delete e 404 em delete |
| `["events"]` (base)                | invalidação total nas mutações     | idem                               |
| `["spot-catalog"]` (feature events)| `SpotView[]` completo (todas as páginas) | decisão (research D6): cache PRÓPRIO, desconectado da invalidação `["spots"]` da SPE-03 — a SPE-03 não conhece este cache; o catálogo é revalidado ao remontar o `SpotSelector`/a página (`staleTime` curto). Limitação aceita detalhada abaixo |

**Nota honesta**: a invalidação cruzada entre caches de features
distintas é limitação aceita (volume acadêmico; catálogo recarrega ao
remontar a página de formulário). Se um evento criado apontar para ponto
criado na MESMA sessão, o `SpotSelector` revalida no mount (refetch
on stale) — registrado como limitação em `tasks`/implementation.

## Tipagem client (módulo `src/features/events`)

```ts
type EventView = { id: number; spotId: number;
  occurrenceDate: string; description: string; ticketPrice: number };
type EventListResponse = { items: EventView[] };
type EventCreateBody = { spotId: number; occurrenceDate: string;
  description: string; ticketPrice: number };
type EventUpdateBody = Partial<EventCreateBody>; // omitido permanece
```

Enum fechado? Não existe enum na entidade — nada a violar; violações de
tipo/limite entram como `ContractViolationError` pelos parsers puros
(padronizando com SPE-03: `parseEventView`, `parseEventListResponse`).
