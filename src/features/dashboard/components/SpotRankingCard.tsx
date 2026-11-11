"use client";

// Ranking de pontos turísticos (SPE-07 US2/T010 — RF08, FR-010/011):
// controles PRÓPRIOS do card (segmento day|month|year com padrão `day`,
// referenceDate editável com padrão hoje, limite editável — padrão 5,
// domínio 1–100 do contrato). Linhas na ORDEM da API (contract rule 2 —
// `position`/`visits` NUNCA recalculados no cliente, Princípio II). O
// período vigente do card fica visível (eco `granularity`/`referenceDate`
// da resposta). Numerais tabulares (SPE-08).

import { useState } from "react";
import DashboardCard from "@/features/dashboard/components/DashboardCard";
import { RANKING_EMPTY_MESSAGE } from "@/features/dashboard/api/messages";
import { useSpotRankingQuery } from "@/features/dashboard/api/queries";
import { toISODate } from "@/features/dashboard/types/period";

const GRANULARITY_OPTIONS = [
  { value: "day", label: "Dia" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
] as const;

type Granularity = (typeof GRANULARITY_OPTIONS)[number]["value"];

const GRANULARITY_LABELS: Record<Granularity, string> = Object.fromEntries(
  GRANULARITY_OPTIONS.map((option) => [option.value, option.label]),
) as Record<Granularity, string>;

const LIMIT_OPTIONS = [5, 10, 20, 50] as const;

export default function SpotRankingCard() {
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [referenceDate, setReferenceDate] = useState(() => toISODate(new Date()));
  const [limit, setLimit] = useState<number>(5); // padrão do contrato (FR-010)

  const query = useSpotRankingQuery(granularity, referenceDate, limit);

  const items = query.data?.items ?? [];
  const empty = !query.isPending && query.data !== undefined && items.length === 0;

  const segmentLabel =
    query.data && GRANULARITY_LABELS[query.data.granularity as Granularity]
      ? GRANULARITY_LABELS[query.data.granularity as Granularity]
      : undefined;

  return (
    <DashboardCard
      title="Ranking de pontos"
      description={
        query.data
          ? `Segmento: ${segmentLabel ?? query.data.granularity}${
              query.data.referenceDate ? ` — referência ${query.data.referenceDate}` : ""
            }`
          : undefined
      }
      loading={query.isPending || query.isFetching}
      error={query.error}
      emptyMessage={empty ? RANKING_EMPTY_MESSAGE : null}
      refetch={() => {
        void query.refetch();
      }}
    >
      <div className="flex flex-col gap-3">
        <div
          role="group"
          aria-label="Segmento do ranking"
          className="flex w-fit gap-1 rounded-md bg-surface-muted p-1"
        >
          {GRANULARITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={granularity === option.value}
              onClick={() => setGranularity(option.value)}
              className={`cursor-pointer rounded px-3 py-1 text-caption transition-colors ${
                granularity === option.value
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:text-primary"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-body">
          <label className="flex items-center gap-1">
            Referência
            <input
              type="date"
              value={referenceDate}
              onChange={(event) => setReferenceDate(event.target.value)}
              className="rounded-md border border-border bg-surface px-2 py-1.5"
            />
          </label>
          <label className="flex items-center gap-1">
            Tamanho
            <select
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              className="rounded-md border border-border bg-surface px-2 py-1.5"
            >
              {LIMIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  Top {option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ol className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <li
              key={item.spotId}
              className="flex items-baseline justify-between gap-2 py-2 text-body"
            >
              <span className="flex items-baseline gap-2">
                <span className="min-w-6 text-center text-title-4 text-foreground-muted tabular-nums">
                  {item.position}
                </span>
                <span className="font-medium">{item.name}</span>
              </span>
              <span className="tabular-nums">
                {item.visits.toLocaleString("pt-BR")}{" "}
                <span className="text-foreground-muted">
                  {item.visits === 1 ? "visita" : "visitas"}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </DashboardCard>
  );
}
