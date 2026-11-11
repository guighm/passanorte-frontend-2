# Data Model: Concessão de Brindes — Área do Funcionário (SPE-06)

**Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md) | **Contrato**:
[contracts/gamification-api.md](./contracts/gamification-api.md)

O painel **não modela** este domínio — ele o **lê** do backend (Princípio II):
código nasce no backend (RF36, app do turista), concessão/baixa/invalidação
acontecem no backend. Os tipos abaixo descrevem o que a UI transporta e exibe;
validações client-side são apenas gate de UX (autoridade sempre do backend).

## Entidades (payloads da API — camelCase, contrato]

### RedemptionCreateRequest — entrada de validação E concessão

| Campo | Tipo/regra | Origem de dados na UI |
| --- | --- | --- |
| `code` | string 1–128 | câmera (decode automático ao ler — clarify Q4) ou entrada manual |
| `spotId` | int ≥ 1 | `SpotSelector` da SPE-03, sugerido como o último usado na sessão, editável na conferência (clarify Q3) |

Usado por `POST /redemptions/validate` (esperado — mock até o compare, D4) e
`POST /redemptions` (real). Nenhum outro campo — `additionalProperties: false`.

### RedemptionPreviewView — conferência (contrato ESPERADO; mock D4)

| Campo | Tipo | Uso na UI |
| --- | --- | --- |
| `code` | string | exibido; referência para a redigitação de confirmação (FR-004; comparação ignora caixa e espaços das extremidades) |
| `codeStatus` | string (`"valid"`) | exibido; divergência ⇒ `ContractViolationError` |
| `route` | `{ id: int, name: string }` | conferência (nome da rota concluída; fallback de `spotId` órfão do catálogo não se aplica à rota) |
| `enrollmentStatus` | string (`"completed"`) | conferência; caso não `completed` desencadeia desfecho de rota não concluída |
| `prize` | `{ id: int, name: string, stockQuantity: int ≥ 0, available: boolean }` | conferência (brinde + disponibilidade); `available: false` ⇒ caminho de desfecho sem estoque |
| `pickupSpotId?` | int ≥ 1 (opcional) | se presente, pré-marca o seletor do ponto (cross-check com o `spotId` escolhido — probe P4) |

### RedemptionView — concessão confirmada (contrato REAL, verificado)

| Campo | Tipo | Uso na UI |
| --- | --- | --- |
| `code` | string 1–128 | registro de sucesso (código consumido — FR-009) |
| `prize` | `{ id: int, name: string, stockQuantity: int ≥ 0 }` | registro; **saldo pós-baixa** (FR-004 da SPE-05) — a UI exibe, nunca recomputa |
| `routeId` | int | registro (nome resolvido via catálogo de rotas se exibido) |
| `touristId` | int | registro (identificador opaco — sem PII de turista na UI, RNF08/Princípio III) |
| `pickupSpotId` | int ≥ 1 | registro do ponto de retirada efetivo |
| `concededBy` | string | registro (quem concedeu — operador da sessão) |
| `usedAt` | string ISO date-time | registro (instante da concessão) |

### Entidades referenciadas (somente leitura, nascidas em outras specs)

- **Brinde (Prize)** — SPE-05: nasce com a rota; estoque ajustado pelo admin;
  aqui aparece embutido (`prize` nos dois payloads). O painel não altera dados
  do brinde nesta feature.
- **Inscrição concluída (Enrollment)** — backend RF29/RF30: `status`
  `inProgress`/`completed`; só `completed` gera o código (RF36). O painel não
  consulta enrollments diretamente — o statusvem embutido na validação.
- **Ponto de retirada (TouristSpot)** — SPE-03, por `spotId`; nomes via
  catálogo de `@/features/events` (com rótulo de fallback, padrão FR-013 da
  SPE-05 se o ponto deixar de existir).

## Ciclo de vida do código de resgate

```text
(backend, RF36 — fora do painel)   (painel — apenas lê)
  rota concluída ──▶ código "valid" ──▶ [validate] valida SEM consumir (mock live/real)
                        │                    │ desfechos negativos: inválido (404) /
                        │                    │ já utilizado (409) / rota incompleta (409) /
                        │                    │ sem estoque (409) — código PERMANECE válido
                        ▼
                 [POST /redemptions] 201 ──▶ código CONSUMIDO + baixa de estoque (backend)
                        │                        + RedemptionView (registro na UI)
                        └── 409 já utilizado / sem estoque — código permanece válido
```

Invariantes garantidas pelo backend e refletidas no painel:

1. **Validação não consome** — nenhuma leitura/validação altera estoque ou
   estado do código (FR-003; clarificação Q4).
2. **Um código, uma concessão** — depois do 201, revalidação/concessão ⇒ 409
   "já utilizado" (FR-006; SC-004).
3. **Falha não destrói valor** — desfechos negativos mantêm o código válido
   (409 sem estoque documentado no `summary` real; confirmar os demais em
   probe P1/P5) (SC-003).
4. **Baixa automática no backend** — `stockQuantity` retornado na concessão é
   pós-baixa; o painel nunca calcula (Princípio II; FR-005).

## Máquina de estados da UI (client-side, D6)

| Estado | Entrada | Saída |
| --- | --- | --- |
| `idle-scanning` | tela inicial; câmera ativa + entrada manual | `validating`: decode (automático) ou submit manual |
| `validating` | código em conferência na API | `conference` (200/mock ok) ou `outcome-failure` (404/409/erro) |
| `conference` | dados exibidos; seletor de ponto (sugestão editável); redigitação do código habilita confirmação | `conceding` (confirmar) ou `idle-scanning` (cancelar) |
| `conceding` | POST /redemptions em curso (botão em progresso, envio travado) | `success` (201) ou `outcome-failure` |
| `success` | registro exibido; **câmera pausada** (FR-009) | `idle-scanning` ao acionar "novo atendimento" |
| `outcome-failure` | mensagem distinta por desfecho (FR-006); sem estoque reafirma que o código permanece válido (FR-007) | `idle-scanning` (nova tentativa imediata — FR-008) |

Estados transversais de UI (`isPending`/`isError`/vazio, Princípio V) cobrem
cada estado com feedback distinto; duplo envio travado no `conference`/`success`
(padrão SPE-05).

## Dados de sessão

Nenhum dado sensível de turista é exibido além do identificador opaco
(`touristId`); nada de turista em `localStorage`/logs (RNF08, Princípio III).
O último ponto de retirada usado é memória client-side da sessão da tela
(não persistida entre sessões — clarify Q3).
