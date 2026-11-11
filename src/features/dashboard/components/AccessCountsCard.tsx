"use client";

// Contador de acessos ao app Passaporte (SPE-07 US3/T012 — RF07,
// FR-007/008): `period` nomeado SEMPRE (hoje/semana/mês) e, com custom,
// as duas datas (clarificação Q1/helpers D4 — `accessCountQuery`). Totais
// em destaque com numerais tabulares + período vigente identificado (eco
// `period` da resposta) + SÉRIE DIÁRIA como gráfico de linha compacto
// (clarificação Q2 — Recharts, Constraint 4 emenda 2.2.0). Zero legítimo
// ⇒ vazio explícito (não erro). Nenhuma coleta aqui: dados brutos são do
// backend a partir do uso do app do turista (FR-009).

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DashboardCard from "@/features/dashboard/components/DashboardCard";
import { ACCESS_COUNTS_EMPTY_MESSAGE } from "@/features/dashboard/api/messages";
import { useAccessCountsQuery } from "@/features/dashboard/api/queries";
import { accessCountQuery, PERIOD_OPTION_LABELS, type PeriodSelection } from "@/features/dashboard/types/period";

const CHART_HEIGHT_PX = 160;

const formatNumber = (value: number): string => value.toLocaleString("pt-BR");
const formatDay = (isoDate: string): string => {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
};

export interface AccessCountsCardProps {
  /** Seleção global resolvida (kind + janela válida) — ver DashboardView. */
  selection: PeriodSelection;
}

export default function AccessCountsCard({ selection }: AccessCountsCardProps) {
  const { period, startDate, endDate } = accessCountQuery(selection);
  const query = useAccessCountsQuery(period, { startDate, endDate });

  const data = query.data;
  const empty =
    !query.isPending &&
    data !== undefined &&
    data.uniqueTouristDays === 0 &&
    data.totalAccessEvents === 0 &&
    data.daily.length === 0;

  return (
    <DashboardCard
      title="Acessos ao app"
      description={
        data ? `Período: ${PERIOD_OPTION_LABELS[data.period as PeriodSelection["kind"]] ?? data.period}` : undefined
      }
      loading={query.isPending || query.isFetching}
      error={query.error}
      emptyMessage={empty ? ACCESS_COUNTS_EMPTY_MESSAGE : null}
      refetch={() => {
        void query.refetch();
      }}
    >
      {data ? (
        <div className="flex flex-col gap-3" aria-label="Acessos ao app Passaporte no período">
          <div className="flex gap-4">
            <div className="flex flex-1 flex-col rounded-md border border-border p-3">
              <span className="text-title-1 tabular-nums">{formatNumber(data.uniqueTouristDays)}</span>
              <span className="text-caption text-foreground-muted">turistas que acessaram</span>
            </div>
            <div className="flex flex-1 flex-col rounded-md border border-border p-3">
              <span className="text-title-1 tabular-nums">{formatNumber(data.totalAccessEvents)}</span>
              <span className="text-caption text-foreground-muted">eventos de acesso</span>
            </div>
          </div>
          {data.daily.length > 0 ? (
            <div
              className="rounded-md border border-border p-2"
              role="img"
              aria-label={`Série diária de acessos de ${data.daily[0].date} a ${
                data.daily[data.daily.length - 1].date
              }`}
            >
              <ResponsiveContainer width="100%" height={CHART_HEIGHT_PX}>
                <LineChart data={data.daily} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <XAxis dataKey="date" tickFormatter={formatDay} fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={11} width={40} />
                  <Tooltip
                    formatter={(value) =>
                      typeof value === "number" ? formatNumber(value) : String(value)
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="accessEvents"
                    name="Eventos de acesso"
                    stroke="var(--color-primary)"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="uniqueTourists"
                    name="Turistas únicos"
                    strokeDasharray="4 2"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="sr-only">
                Série diária: {data.daily.map((entry) => `${entry.date}: ${entry.accessEvents} acessos, ${entry.uniqueTourists} turistas únicos`).join("; ")}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </DashboardCard>
  );
}
