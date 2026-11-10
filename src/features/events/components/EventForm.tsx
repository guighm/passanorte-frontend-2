"use client";

// Formulário ÚNICO de evento (SPE-04 T013 — Assumption: 4 campos, sem
// wizard) em páginas dedicadas (FR-013, research D3). RHF + Zod
// espelhando o contrato (spotId ≥ 1, occurrenceDate `YYYY-MM-DD` —
// datas passadas PERMITIDAS, clarificação Q1; description 1–2000;
// ticketPrice ≥ 0 normalizado para 2 casas — edge case da spec).
// Validação campo a campo ANTES do envio (FR-007/SC-003); botão em
// estado de progresso trava duplo envio (US2 edge); falhas da API
// (409 ponto fechado / 404 removido / contrato) acionáveis com dados
// preservados (FR-010); sessão encerrada ⇒ login (FR-007, padrão
// SPE-02/03). Edição (T016/D8): PATCH por diff — SÓ campos alterados.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import Button from "@/shared/components/Button";
import { SessionEndedError } from "@/features/auth/api/errors";
import {
  useCreateEventMutation,
  useUpdateEventMutation,
} from "@/features/events/api/queries";
import {
  describeEventActionFailure,
  failureFromError,
  SESSION_ENDED_PATH,
} from "@/features/events/api/messages";
import SpotSelector from "@/features/events/components/SpotSelector";
import { eventFormSchema } from "@/features/events/types/schemas";
import type { EventUpdateBody, EventView } from "@/features/events/types";

export type EventFormMode = { mode: "create" } | { mode: "edit"; event: EventView };

/** Valores crus do formulário (campos de entrada como texto). */
type RawFormValues = {
  spotId: string;
  occurrenceDate: string;
  description: string;
  ticketPrice: string;
};

const INPUT_CLASSES =
  "text-body h-10 rounded-md border border-border bg-surface px-3 text-foreground outline-none focus:border-primary";

/** Resolver RHF: converte crus → tipados e valida com o schema (Zod);
 * erros voltam campo a campo (FR-007). Preço aceita vírgula pt-BR. */
const rawResolver: Resolver<RawFormValues> = async (raw) => {
  const priceText = raw.ticketPrice.trim();
  const candidate = {
    spotId: raw.spotId === "" ? -1 : Number(raw.spotId),
    occurrenceDate: raw.occurrenceDate,
    description: raw.description,
    ticketPrice: priceText === "" ? Number.NaN : Number(priceText.replace(",", ".")),
  };
  const parsed = eventFormSchema.safeParse(candidate);
  if (parsed.success) {
    return { values: raw, errors: {} };
  }
  const errors: Record<string, { type: string; message: string }> = {};
  for (const issue of parsed.error.issues) {
    errors[String(issue.path[0])] = { type: "validation", message: issue.message };
  }
  return { values: {}, errors };
};

export default function EventForm({ mode }: { mode: EventFormMode }) {
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);

  const current = mode.mode === "edit" ? mode.event : null;
  const createMutation = useCreateEventMutation();
  const updateMutation = useUpdateEventMutation();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RawFormValues>({
    resolver: rawResolver,
    defaultValues: current
      ? {
          spotId: String(current.spotId),
          occurrenceDate: current.occurrenceDate,
          description: current.description,
          ticketPrice: String(current.ticketPrice),
        }
      : {
          spotId: "",
          occurrenceDate: "",
          description: "",
          ticketPrice: "",
        },
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  function handleMutationError(error: unknown): boolean {
    if (error instanceof SessionEndedError) {
      router.replace(SESSION_ENDED_PATH); // FR-007 — não é "erro da ação"
      return true;
    }
    setFailure(describeEventActionFailure(failureFromError(error)));
    return false;
  }

  async function onSubmit(raw: RawFormValues) {
    setFailure(null);
    // O resolver já validou — reparse seguro para dados tipados (e preço
    // NORMALIZADO para 2 casas pelo transform do schema — edge case).
    const parsed = eventFormSchema.safeParse({
      spotId: Number(raw.spotId),
      occurrenceDate: raw.occurrenceDate,
      description: raw.description,
      ticketPrice: raw.ticketPrice.trim() === "" ? Number.NaN : Number(raw.ticketPrice.trim().replace(",", ".")),
    });
    if (!parsed.success) return; // inalcançável com resolver ok — guard
    const typed = parsed.data;

    if (mode.mode === "create") {
      try {
        await createMutation.mutateAsync(typed);
        router.push("/admin/events"); // SC-002 — listagem reflete sem reload
      } catch (error) {
        handleMutationError(error); // falha acionável; dados preservados
      }
      return;
    }

    // PATCH por diff (D8): apenas campos alterados; omitted permanece.
    const body: EventUpdateBody = {};
    if (typed.spotId !== current?.spotId) body.spotId = typed.spotId;
    if (typed.occurrenceDate !== current?.occurrenceDate) body.occurrenceDate = typed.occurrenceDate;
    if (typed.description !== current?.description) body.description = typed.description;
    if (typed.ticketPrice !== current?.ticketPrice) body.ticketPrice = typed.ticketPrice;
    if (Object.keys(body).length === 0) {
      router.push("/admin/events"); // nada mudou — voltar sem PATCH
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: current!.id, body });
      router.push("/admin/events");
    } catch (error) {
      handleMutationError(error);
    }
  }

  const spotIdWatch = watch("spotId");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
      noValidate
    >
      {failure ? (
        <div role="alert" className="text-body rounded-md bg-danger-soft px-3 py-2 text-danger-soft-foreground">
          {failure}
        </div>
      ) : null}

      <div className="text-title-4 flex flex-col gap-1">
        <label htmlFor="event-spot">Ponto turístico</label>
        <SpotSelector
          id="event-spot"
          value={spotIdWatch === "" ? null : Number(spotIdWatch)}
          onChange={(next) => {
            setValue("spotId", next === null ? "" : String(next));
            setFailure(null);
          }}
          errorMessage={errors.spotId?.message ?? null}
        />
      </div>

      {mode.mode === "edit" ? (
        <p className="text-body text-foreground-muted">
          Somente os campos alterados são enviados ao backend (PATCH parcial).
        </p>
      ) : null}

      <p className="sr-only">Campos do evento</p>

      <label className="text-title-4 flex flex-col gap-1" htmlFor="event-date">
        Data de ocorrência
        <input
          id="event-date"
          type="date"
          autoComplete="off"
          className={INPUT_CLASSES}
          {...register("occurrenceDate")}
        />
        {errors.occurrenceDate ? (
          <span className="text-body text-danger" role="alert">
            {errors.occurrenceDate.message}
          </span>
        ) : null}
      </label>

      <label className="text-title-4 flex flex-col gap-1" htmlFor="event-description">
        Descrição
        <textarea
          id="event-description"
          rows={4}
          className="text-body rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-primary"
          {...register("description")}
        />
        {errors.description ? (
          <span className="text-body text-danger" role="alert">
            {errors.description.message}
          </span>
        ) : null}
      </label>

      <label className="text-title-4 flex flex-col gap-1" htmlFor="event-price">
        Preço do ingresso (R$)
        <span className="text-body text-foreground-muted">0 = gratuito</span>
        <input
          id="event-price"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className={INPUT_CLASSES}
          {...register("ticketPrice")}
        />
        {errors.ticketPrice ? (
          <span className="text-body text-danger" role="alert">
            {errors.ticketPrice.message}
          </span>
        ) : null}
      </label>

      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          disabled={pending || isSubmitting}
          onClick={() => router.push("/admin/events")}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || isSubmitting}>
          {pending || isSubmitting ? "Salvando…" : mode.mode === "create" ? "Criar evento" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
