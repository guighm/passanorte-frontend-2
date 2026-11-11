"use client";

// Distribuição por interesses (SPE-07 US5/T016 — RF10, FR-013): BARRAS
// HORIZONTAIS idênticas ao padrão do T014 (Recharts, Constraint 4) —
// rótulos de `interestLabel`, chave por `interestKey`. % sobre o total de
// DECLARAÇÕES de interesse (`totalSelections` — turista com N interesses
// conta N vezes): a nota UI da multiplicação fica visível (clarificação
// Q4 + edge case da spec — INTERESTS_MULTIPLIER_NOTE). 0 declarações ⇒
// vazio claro. Ordem da API preservada (contract rule 2).

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DashboardCard from "@/features/dashboard/components/DashboardCard";
import { INTERESTS_EMPTY_MESSAGE, INTERESTS_MULTIPLIER_NOTE } from "@/features/dashboard/api/messages";
import { useVisitorInterestsQuery } from "@/features/dashboard/api/queries";
import type { DateWindow } from "@/features/dashboard/types/period";

const BAR_ROW_HEIGHT_PX = 36;
const CHART_MIN_HEIGHT_PX = 160;

const formatPercent = (value: number): string =>
  `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const formatNumber = (value: number): string => value.toLocaleString("pt-BR");

export interface InterestDistributionCardProps {
  window: DateWindow;
}

export default function InterestDistributionCard({ window }: InterestDistributionCardProps) {
  const query = useVisitorInterestsQuery(window);

  const data = query.data;
  const items = data?.items ?? [];
  const empty =
    !query.isPending &&
    data !== undefined &&
    (data.totalSelections === 0 || items.length === 0);
  const chartHeight = Math.max(CHART_MIN_HEIGHT_PX, items.length * BAR_ROW_HEIGHT_PX + 40);

  // Rótulo PRECOMPUTADO ("share% · contagem") — mesma solução do T014
  // (recharts v3: LabelList.formatter não entrega o entry).
  const chartData = items.map((item) => ({
    interestKey: item.interestKey,
    interestLabel: item.interestLabel,
    share: item.share,
    label: `${item.share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% · ${formatNumber(item.tourists)}`,
  }));

  return (
    <DashboardCard
      title="Interesses"
      description={
        data
          ? `${formatNumber(data.totalSelections)} declarações de interesse · ${formatNumber(data.totalVisitors)} visitantes`
          : undefined
      }
      loading={query.isPending || query.isFetching}
      error={query.error}
      emptyMessage={empty ? INTERESTS_EMPTY_MESSAGE : null}
      refetch={() => {
        void query.refetch();
      }}
    >
      {data && items.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div
            role="img"
            aria-label={`Distribuição de visitantes por ${formatNumber(data.totalSelections)} declarações de interesse`}
            className="rounded-md border border-border p-2"
          >
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 96, bottom: 0, left: 0 }}
              >
                <CartesianGrid horizontal={false} stroke="var(--color-border)" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(value: number) => formatPercent(Number(value))}
                  fontSize={11}
                />
                <YAxis type="category" dataKey="interestLabel" fontSize={11} width={130} />
                <Tooltip
                  formatter={(value, name) =>
                    name === "share" ? formatPercent(Number(value)) : formatNumber(Number(value))
                  }
                />
                <Bar dataKey="share" fill="var(--color-primary)" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="label" position="right" fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="sr-only">
              {items
                .map(
                  (item) =>
                    `${item.interestLabel}: ${formatNumber(item.tourists)} (${formatPercent(item.share)})`,
                )
                .join("; ")}
            </p>
          </div>
          <p className="text-caption text-foreground-muted" role="note">
            {INTERESTS_MULTIPLIER_NOTE}
          </p>
        </div>
      ) : null}
    </DashboardCard>
  );
}
