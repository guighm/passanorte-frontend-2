// Estado do seletor global de período (SPE-07 T002/FR-014 — clarificação
// Q1) e a tradução D4 para janelas de datas: opções nomeadas hoje/semana/
// mês/configurável; janelas calêndricas correntes NO FUSO LOCAL DO BROWSER
// (granularidade de dia; research D4 — a divergência browser vs cidade só
// afeta o limite do dia perto da meia-noite, assunção registrada).
// Semana corrente = segunda (seg) a domingo; mês = calendário corrente.
// Módulo puro (sem React/leaflet — consumido por queries e cards).

export type PeriodKind = "today" | "week" | "month" | "custom";

/** Janela inclusiva em ISO YYYY-MM-DD (componentes locais do browser). */
export interface DateWindow {
  startDate: string;
  endDate: string;
}

export interface PeriodSelection {
  kind: PeriodKind;
  /** Janela traduzida (D4) — `custom` usa as datas escolhidas pelo
   * administrador; inválidas (início > fim) ⇒ null (o chamador NÃO
   * dispara query — FR-014/edge case da spec). */
  window: DateWindow | null;
}

/** Data corrente no formato ISO local (pad do zero por componente). */
export function toISODate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Adiciona dias (aritmética simples de dia — D4). */
function addDays(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

/** Janela calêndrica corrente da opção nomeada (D4/clarificação da 2ª
 * sessão de clarify): semana = segunda→domingo; mês = mês do calendário. */
function namedWindow(kind: Exclude<PeriodKind, "custom">, now: Date): DateWindow {
  if (kind === "today") {
    const iso = toISODate(now);
    return { startDate: iso, endDate: iso };
  }
  if (kind === "week") {
    const weekday = now.getDay(); // 0 = domingo
    const monday = addDays(now, weekday === 0 ? -6 : 1 - weekday);
    const sunday = addDays(monday, 6);
    return { startDate: toISODate(monday), endDate: toISODate(sunday) };
  }
  // month
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: toISODate(first), endDate: toISODate(last) };
}

/** Resolve a seleção global em janela. `custom` exige as DUAS datas
 * (contract: `period=custom` exige startDate+endDate) com início ≤ fim. */
export function resolvePeriodSelection(
  kind: PeriodKind,
  now: Date,
  custom?: { startDate: string; endDate: string },
): PeriodSelection {
  if (kind === "custom") {
    if (!custom) return { kind, window: null };
    const start = custom.startDate;
    const end = custom.endDate;
    if (!start || !end || start > end) return { kind, window: null }; // ISO compara lexicográfico
    return { kind, window: { startDate: start, endDate: end } };
  }
  return { kind, window: namedWindow(kind, now) };
}

/** Query do contador (RF07): o `period` nomeado é enviado SEMPRE; datas
 * apenas com `custom` (contract — named periods não aceitam datas). */
export function accessCountQuery(selection: PeriodSelection): {
  period: PeriodKind;
  startDate: string | null;
  endDate: string | null;
} {
  if (selection.kind === "custom" && selection.window) {
    return {
      period: "custom",
      startDate: selection.window.startDate,
      endDate: selection.window.endDate,
    };
  }
  return { period: selection.kind, startDate: null, endDate: null };
}

/** Labels pt-BR das opções (única fonte — nenhum texto ad hoc fora da
 * feature; reuso obrigatório nos controles dos cards). */
export const PERIOD_OPTION_LABELS: Record<PeriodKind, string> = {
  today: "Hoje",
  week: "Semana",
  month: "Mês",
  custom: "Configurável",
};
