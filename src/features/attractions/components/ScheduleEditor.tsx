"use client";

// ScheduleEditor (SPE-03 T012, FR-011): cronograma por dia da semana —
// checkbox por dia + inputs `type="time"` ( HH:MM do contrato
// `^\d{2}:\d{2}$`). Vocabulário de `weekday` enviado é o definido por
// esta UI (keys em inglês lowercase) — O PROBE T004 confirma o vocabulário
// real do backend; quando confirmado, ajustam-se as keys aqui (ver
// contracts/spots-api.md pendências — parse aceita string não-vazia, D7):
// nada é adivinhado no parse, o envio usa o chaveamento padronizado.
// Coerência validada em schemas.ts (fechamento após abertura) — o editor
// apenas coleta; erros por dia são exibidos no formulário.

import { SPOT_SCHEDULE_WEEKDAY_KEYS, type SpotScheduleEntry } from "@/features/attractions/types";

export interface ScheduleEditorProps {
  id?: string;
  value: SpotScheduleEntry[];
  onChange: (next: SpotScheduleEntry[]) => void;
}

/** Rótulos pt-BR das semanas (EXIBIÇÃO); keys conforme SPOT_SCHEDULE_WEEKDAY_KEYS. */
const WEEKDAY_LABELS: Record<string, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
};

function entryFor(value: SpotScheduleEntry[], weekday: string): SpotScheduleEntry | undefined {
  return value.find((entry) => entry.weekday === weekday);
}

export default function ScheduleEditor({ id, value, onChange }: ScheduleEditorProps) {
  function toggleDay(weekday: string, checked: boolean) {
    if (checked) {
      if (entryFor(value, weekday)) return;
      // dia recém-marcado: sem horários ainda — validação por campo no form
      onChange([...value, { weekday, opensAt: "", closesAt: "" }]);
      return;
    }
    onChange(value.filter((entry) => entry.weekday !== weekday));
  }

  function updateTime(weekday: string, field: "opensAt" | "closesAt", time: string) {
    onChange(
      value.map((entry) => (entry.weekday === weekday ? { ...entry, [field]: time } : entry)),
    );
  }

  return (
    <fieldset id={id} className="flex flex-col gap-2 rounded-md border border-border p-3">
      <legend className="text-title-4 px-1">Cronograma de funcionamento</legend>
      <div className="flex flex-col gap-1">
        {SPOT_SCHEDULE_WEEKDAY_KEYS.map((weekday) => {
          const entry = entryFor(value, weekday);
          return (
            <div key={weekday} className="text-body flex items-center gap-2">
              <label className="flex w-44 items-center gap-2">
                <input type="checkbox" checked={Boolean(entry)} onChange={(event) => toggleDay(weekday, event.target.checked)} />
                {WEEKDAY_LABELS[weekday] ?? weekday}
              </label>
              {entry ? (
                <span className="flex items-center gap-2">
                  <label className="flex items-center gap-1">
                    <span className="sr-only">Abertura de {WEEKDAY_LABELS[weekday]}</span>
                    <input
                      type="time"
                      className="text-body h-8 rounded-md border border-border bg-surface px-2"
                      value={entry.opensAt}
                      onChange={(event) => updateTime(weekday, "opensAt", event.target.value)}
                    />
                  </label>
                  <span aria-hidden="true">—</span>
                  <label className="flex items-center gap-1">
                    <span className="sr-only">Fechamento de {WEEKDAY_LABELS[weekday]}</span>
                    <input
                      type="time"
                      className="text-body h-8 rounded-md border border-border bg-surface px-2"
                      value={entry.closesAt}
                      onChange={(event) => updateTime(weekday, "closesAt", event.target.value)}
                    />
                  </label>
                </span>
              ) : (
                <span className="text-body text-foreground-muted">Fechado neste dia</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-body text-foreground-muted">
        Ao menos um dia com horários é obrigatório (contrato); horários em HH:MM, fechamento após abertura.
      </p>
    </fieldset>
  );
}
