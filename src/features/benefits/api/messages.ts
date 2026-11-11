// Mapeamento de desfechos da feature benefits para mensagens acionáveis
// (SPE-06 T007 — padrão attractions/employees/events/tours). Mapeamento de
// classes→kind é TRANSVERSAL em src/shared/lib/api-error.ts (Princípio IV);
// aqui só as mensagens pt-BR das concessões.
//
// Requisito FR-006: os CINCO desfechos do fluxo (sucesso / código inválido /
// já utilizado / rota não concluída / sem estoque) têm mensagens DISTINTAS —
// nunca colapsadas em erro genérico. Baseline de `errorCode` do probe T005
// (contracts/gamification-api.md "Resultados"): 404 ⇒ `resource_not_found`;
// 409 ⇒ `conflict` (valor real observado em `POST /tourists` duplicado).
// Sub-casos de 409 (já utilizado × sem estoque × rota incompleta) não são
// distinguíveis por `errorCode` genérico NESTE runtime — a distinção usa
// `backendMessage` quando disponível (baseline do mock: "already used" /
// "insufficient prize stock") e re-verifica no compare de contrato (T019),
// com fallback acionável quando nenhuma assinatura casa (padrão SPE-05).

export { failureFromError } from "@/shared/lib/api-error";
export type { ActionFailure as RedemptionActionFailure } from "@/shared/lib/api-error";
export { SESSION_ENDED_PATH } from "@/features/employees/api/messages";
import type { ActionFailure } from "@/shared/lib/api-error";

/** Assinaturas (backendMessage) dos sub-casos de 409 — baseline do probe;
 * confirmadas no compare (T019/P1). */
const ALREADY_USED_SIGNATURES = ["already used", "já utilizado", "já usad"];
const NO_STOCK_SIGNATURES = ["insufficient", "sem estoque", "estoque"];

function conflictSubKind(backendMessage: string): "already-used" | "no-stock" | "incomplete" | "generic" {
  const msg = backendMessage.toLowerCase();
  if (ALREADY_USED_SIGNATURES.some((s) => msg.includes(s))) return "already-used";
  if (NO_STOCK_SIGNATURES.some((s) => msg.includes(s))) return "no-stock";
  if (msg.includes("incomplet") || msg.includes("not completed")) return "incomplete";
  return "generic";
}

/** Desfechos negativos da VALIDAÇÃO (US1 — conferência nunca começa). */
export function describeRedemptionValidationFailure(failure: ActionFailure): string {
  if (failure.kind === "api" && failure.errorCode === "resource_not_found") {
    return "Código de resgate não encontrado — confirme o código exibido no app do turista e tente novamente.";
  }
  if (failure.kind === "api" && failure.errorCode === "conflict") {
    const sub = conflictSubKind(failure.message);
    if (sub === "already-used") {
      return "Este código já foi utilizado — a concessão já aconteceu antes em outro atendimento.";
    }
    if (sub === "no-stock") {
      return "O brinde desta rota está sem estoque — o código permanece válido para retirada após a reposição pelo administrador.";
    }
    if (sub === "incomplete") {
      return "A rota ainda não foi concluída pelo turista no app — sem brinde disponível para resgate.";
    }
    return "Não foi possível validar este código no momento — verifique com o turista e tente novamente.";
  }
  return describeGenericFailure(failure);
}

/** Desfechos negativos da CONCESSÃO (US2 — falha nunca consome o código). */
export function describeRedemptionConcessionFailure(failure: ActionFailure): string {
  if (failure.kind === "api" && failure.errorCode === "resource_not_found") {
    return "Concessão não encontrada pelo backend — código desconhecido ou ponto de retirada inválido; revise e tente novamente (o código não foi consumido).";
  }
  if (failure.kind === "api" && failure.errorCode === "conflict") {
    const sub = conflictSubKind(failure.message);
    if (sub === "already-used") {
      return "Este código já foi utilizado — a concessão já aconteceu antes em outro atendimento.";
    }
    if (sub === "no-stock") {
      return "O brinde desta rota está sem estoque — a concessão não aconteceu e o código continua válido para retirada após a reposição pelo administrador.";
    }
    if (sub === "incomplete") {
      return "A rota ainda não foi concluída pelo turista no app — a concessão não aconteceu.";
    }
    return "Não foi possível concluir a concessão no momento — o código não foi consumido; tente novamente.";
  }
  return describeGenericFailure(failure);
}

/** Classes transversais (Princípio V) — idênticas às demais features. */
function describeGenericFailure(failure: ActionFailure): string {
  switch (failure.kind) {
    case "denied":
      return "Operação não autorizada para o seu papel.";
    case "contract":
      return failure.message || "Resposta da API fora do contrato — operação abortada.";
    case "unavailable":
      return "Falha de comunicação com a API — tente novamente.";
    case "validation":
      return "Dados inválidos: revise o código e o ponto e tente novamente.";
    case "session":
      return "Sessão encerrada.";
    default:
      return failure.message || "Não foi possível concluir a operação.";
  }
}
