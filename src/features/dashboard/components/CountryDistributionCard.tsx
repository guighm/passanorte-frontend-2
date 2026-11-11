"use client";

// Distribuição por país de origem (SPE-07 US4/T014 — RF09, FR-012):
// BARRAS HORIZONTAIS (clarificação Q4 — Recharts `BarChart layout="vertical"`),
// uma por país, com contagem e porcentagem VISÍVEIS (LabelList posicionado)
// — categoria identificável sem depender só de cor (FR-018/Constraint 6).
// Valores da API na ordem enviada (contract rule 2). `totalVisitors` 0 ⇒
// vazio claro (não gráfico sem contexto).

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
import { COUNTRIES_EMPTY_MESSAGE } from "@/features/dashboard/api/messages";
import { useVisitorCountriesQuery } from "@/features/dashboard/api/queries";
import type { DateWindow } from "@/features/dashboard/types/period";

const BAR_ROW_HEIGHT_PX = 36;
const CHART_MIN_HEIGHT_PX = 160;

const formatPercent = (value: number): string =>
  `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const formatNumber = (value: number): string => value.toLocaleString("pt-BR");

export interface CountryDistributionCardProps {
  window: DateWindow;
}

export default function CountryDistributionCard({ window }: CountryDistributionCardProps) {
  const query = useVisitorCountriesQuery(window);

  const data = query.data;
  const items = data?.items ?? [];
  const empty =
    !query.isPending && data !== undefined && (data.totalVisitors === 0 || items.length === 0);
  const chartHeight = Math.max(CHART_MIN_HEIGHT_PX, items.length * BAR_ROW_HEIGHT_PX + 40);

  // Rótulo da barra PRECOMPUTADO ("share% · contagem") — recharts v3
  // entrega `LabelList.formatter` sem o `entry`; o valor visível precisa
  // incluir contagem E porcentagem (FR-012), então o data leva o texto.
  const chartData = items.map((item) => ({
    country: item.country,
    share: item.share,
    tourists: item.tourists,
    label: `${item.share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% · ${formatNumber(item.tourists)}`,
  }));

  return (
    <DashboardCard
      title="Países de origem"
      description={
        data ? `${formatNumber(data.totalVisitors)} visitantes no período` : undefined
      }
      loading={query.isPending || query.isFetching}
      error={query.error}
      emptyMessage={empty ? COUNTRIES_EMPTY_MESSAGE : null}
      refetch={() => {
        void query.refetch();
      }}
    >
      {data && items.length > 0 ? (
        <div
          role="img"
          aria-label={`Distribuição de ${formatNumber(data.totalVisitors)} visitantes por país de origem`}
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
              <YAxis type="category" dataKey="country" fontSize={11} width={96} />
              <Tooltip
                formatter={(value, name) =>
                  name === "share"
                    ? formatPercent(Number(value))
                    : formatNumber(Number(value))
                }
              />
              <Bar dataKey="share" fill="var(--color-primary)" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="label" position="right" fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="sr-only">
            {items
              .map((item) => `${item.country}: ${formatNumber(item.tourists)} (${formatPercent(item.share)})`)
              .join("; ")}
          </p>
        </div>
      ) : null}
    </DashboardCard>
  );
}
