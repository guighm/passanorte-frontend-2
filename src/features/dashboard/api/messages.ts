// Mensagens pt-BR da feature dashboard (SPE-07 T003 — padrão `messages.ts`
// da SPE-03). Classificação erro→kind é TRANSVERSAL em
// `src/shared/lib/api-error.ts` (`failureFromError` — Princípio IV);
// aqui só as frases de leitura dos cards (FR-015 — mensagens acionáveis,
// RNF13). Nenhuma duplicação de classificador.

import { failureFromError } from "@/shared/lib/api-error";

/** Erros de LEITURA (queries) → mensagem acionável por card. */
export function describeReadError(error: unknown): string {
  const failure = failureFromError(error);
  switch (failure.kind) {
    case "denied":
      return "Visão analítica não autorizada para o papel da sessão.";
    case "contract":
      return failure.message || "Resposta da API fora do contrato — card abortado.";
    case "unavailable":
      return "Falha de comunicação com a API — tente recarregar o card.";
    case "session":
      return "Sessão encerrada — entre novamente para ver os dados.";
    case "validation":
      return "Parâmetros de consulta inválidos — revise o período e tente novamente.";
    default:
      return "Falha inesperada ao ler os dados — tente recarregar o card.";
  }
}

// ---------------------------------------------------------------- vazio --

export const HEATMAP_EMPTY_MESSAGE = "Nenhuma visita registrada neste período.";
export const RANKING_EMPTY_MESSAGE = "Nenhum ponto visitado neste período.";
export const ACCESS_COUNTS_EMPTY_MESSAGE = "Nenhum acesso no período.";
export const COUNTRIES_EMPTY_MESSAGE = "Nenhum visitante registrado neste período.";
export const INTERESTS_EMPTY_MESSAGE = "Nenhuma declaração de interesse neste período.";

// ------------------------------------------------------------- rótulos --

export const RETRY_LABEL = "Recarregar";
export const INTERESTS_MULTIPLIER_NOTE =
  "Um turista conta em cada interesse declarado — as parcelas representam o total de declarações de interesse e podem somar mais de 100%.";
