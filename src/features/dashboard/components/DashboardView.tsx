"use client";

// View do dashboard (SPE-07 T007 — FR-014/clarificação Q1): seletor GLOBAL
// único de período (hoje/semana/mês/configurável por datas) alimentando os
// 4 cards com janela; o ranking tem controles próprios (FR-010). Tradução
// D4 das janelas em `types/period.ts` (semana = segunda→domingo; mês =
// calendário corrente). Sob demanda (FR-020): nada de polling — os cards
// refetch ao entrar, por mudança de período e pelo refetch manual do card.
// Período custom inválido NÃO dispara query (edge case da spec): o COMMIT
// acontece apenas em seleção/janela válida nos handlers (sem setState em
// effect — lint) — os cards mantêm a última janela válida e o seletor
// explica o porquê.

import { useState } from "react";
import AccessCountsCard from "@/features/dashboard/components/AccessCountsCard";
import CountryDistributionCard from "@/features/dashboard/components/CountryDistributionCard";
import HeatmapCard from "@/features/dashboard/components/HeatmapCard";
import InterestDistributionCard from "@/features/dashboard/components/InterestDistributionCard";
import SpotRankingCard from "@/features/dashboard/components/SpotRankingCard";
import {
  PERIOD_OPTION_LABELS,
  resolvePeriodSelection,
  toISODate,
  type DateWindow,
  type PeriodKind,
} from "@/features/dashboard/types/period";

const PERIOD_KINDS: PeriodKind[] = ["today", "week", "month", "custom"];

/** Seleção COMMITADA — sempre com janela válida (nunca disparada vazia). */
interface CommittedPeriod {
  kind: PeriodKind;
  window: DateWindow;
}

export default function DashboardView() {
  const [kind, setKind] = useState<PeriodKind>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [committed, setCommitted] = useState<CommittedPeriod>(() => {
    const today = toISODate(new Date());
    return { kind: "today", window: { startDate: today, endDate: today } };
  });

  const commitNamed = (option: Exclude<PeriodKind, "custom">): void => {
    const resolved = resolvePeriodSelection(option, new Date());
    if (resolved.window) {
      setKind(option);
      setCommitted({ kind: option, window: resolved.window });
    }
  };

  const commitCustom = (startDate: string, endDate: string): void => {
    const resolved = resolvePeriodSelection("custom", new Date(), { startDate, endDate });
    setCustomStart(startDate);
    setCustomEnd(endDate);
    if (resolved.window) {
      setCommitted({ kind: "custom", window: resolved.window }); // início ≤ fim (D4)
    }
  };

  const customActive = kind === "custom";
  const customValid = customActive && committed.kind === "custom";

  const { window } = committed;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-title-2">Dashboard e insights</h1>
        <p className="text-caption text-foreground-muted">
          Visões analíticas do uso do app Passaporte — coletadas pelo backend (RF06–RF10).
        </p>
      </header>

      {/* Seletor GLOBAL de período (FR-014) — única fonte de janela da página. */}
      <fieldset
        aria-label="Período do dashboard"
        className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3"
      >
        <legend className="sr-only">Período do dashboard</legend>
        {PERIOD_KINDS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === kind}
            onClick={() =>
              option === "custom" ? setKind("custom") : commitNamed(option)
            }
            className={`cursor-pointer rounded-md px-4 py-2 text-title-4 transition-colors ${
              option === kind
                ? "bg-primary text-primary-foreground"
                : "bg-surface-muted text-foreground hover:bg-border"
            }`}
          >
            {PERIOD_OPTION_LABELS[option]}
          </button>
        ))}
        {customActive ? (
          <div className="flex flex-wrap items-center gap-2 text-body">
            <label className="flex items-center gap-1">
              Início
              <input
                type="date"
                value={customStart}
                onChange={(event) => commitCustom(event.target.value, customEnd)}
                className="rounded-md border border-border bg-surface px-2 py-1.5"
                aria-invalid={!customValid}
              />
            </label>
            <label className="flex items-center gap-1">
              Fim
              <input
                type="date"
                value={customEnd}
                onChange={(event) => commitCustom(customStart, event.target.value)}
                className="rounded-md border border-border bg-surface px-2 py-1.5"
                aria-invalid={!customValid}
              />
            </label>
            <span role="status" className="text-caption text-foreground-muted">
              {customValid
                ? `Janela inclusiva: ${window.startDate} a ${window.endDate}.`
                : "Escolha início e fim com início ≤ fim — os cards mantêm o período anterior."}
            </span>
          </div>
        ) : null}
      </fieldset>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <HeatmapCard window={window} />
        </div>
        <AccessCountsCard selection={committed} />
        <SpotRankingCard />
        <CountryDistributionCard window={window} />
        <InterestDistributionCard window={window} />
      </div>
    </div>
  );
}
