"use client";

// Diálogo unificado de cadastro/edição de pontos turísticos (SPE-03
// T014/T016 — D6; rewire TanStack Query, padrão SpotFormDialog da SPE-02):
// RHF + Zod espelhando o contrato (name 1–200, description 1–2000, lat
// −90…90, lng  −180…180, tolerância>0 opcional, categories ≥1 do catálogo,
// schedule ≥1 dia HH:MM, status enum) com SpotMapPicker (única integração
// de mapa — Constraint 3) e entrada manual bidirecional (SC-004).
// Envio parcial em edição (FR-012; schedule resubmitida inteira quando
// alterada — D6). Estados carregamento/erro distintos (Princípio V);
// dados preservados em erro; sessão encerrada ⇒ login (FR-007).

import { Dialog } from "@base-ui/react/dialog";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "@/shared/components/Button";
import { SessionEndedError } from "@/features/auth/api/errors";
import {
  useCreateSpotMutation,
  useUpdateSpotMutation,
} from "@/features/attractions/api/queries";
import {
  describeActionFailure,
  failureFromError,
  SESSION_ENDED_PATH,
} from "@/features/attractions/api/messages";
import CategorySelector from "@/features/attractions/components/CategorySelector";
import ScheduleEditor from "@/features/attractions/components/ScheduleEditor";
import SpotMapPicker from "@/features/attractions/components/SpotMapPicker";
import {
  SPOT_STATUSES,
  SPOT_STATUS_OPEN,
  type SpotScheduleEntry,
  type SpotStatus,
  type SpotView,
} from "@/features/attractions/types";
import { spotFormSchema, spotUpdateSchema } from "@/features/attractions/types/schemas";

export interface SpotFormDialogProps {
  mode: "create" | "edit";
  spot?: SpotView;
  /** Centro p/ picker no cadastro (FR-009: primeiro ponto da listagem ou null). */
  fallbackCenter: { latitude: number; longitude: number } | null;
  onSaved: () => void;
  onClose: () => void;
}

type FormValues = {
  name: string;
  description: string;
  latitude: string; // como texto no form — convertido/validado no submit
  longitude: string;
  toleranceRadiusM: string;
  categories: string[];
  schedule: SpotScheduleEntry[];
  status: SpotStatus;
};

const INPUT_CLASSES =
  "text-body h-10 rounded-md border border-border bg-surface px-3 text-foreground outline-none focus:border-primary";

export default function SpotFormDialog({
  mode,
  spot,
  fallbackCenter,
  onSaved,
  onClose,
}: SpotFormDialogProps) {
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);
  const [fieldIssues, setFieldIssues] = useState<
    Partial<Record<"name" | "description" | "latitude" | "longitude" | "toleranceRadiusM" | "categories" | "schedule", string>>
  >({});
  const createMutation = useCreateSpotMutation();
  const updateMutation = useUpdateSpotMutation();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: spot?.name ?? "",
      description: spot?.description ?? "",
      latitude: spot ? String(spot.latitude) : "",
      longitude: spot ? String(spot.longitude) : "",
      toleranceRadiusM: spot?.toleranceRadiusM != null ? String(spot.toleranceRadiusM) : "",
      categories: spot?.categories ?? [],
      schedule: spot?.schedule ?? [],
      status: spot?.status ?? SPOT_STATUS_OPEN,
    },
  });
  const categories = watch("categories");
  const schedule = watch("schedule");
  const latitudeText = watch("latitude");
  const longitudeText = watch("longitude");
  const isPending = mode === "create" ? createMutation.isPending : updateMutation.isPending;

  function setErrorIssue(field: keyof FormValues, message: string) {
    if (
      field === "name" ||
      field === "description" ||
      field === "latitude" ||
      field === "longitude" ||
      field === "toleranceRadiusM" ||
      field === "categories" ||
      field === "schedule"
    ) {
      setFieldIssues((current) => ({ ...current, [field]: message }));
    }
  }

  function applyIssues(issues: readonly { path: ReadonlyArray<unknown>; message: string }[]) {
    setFieldIssues({});
    for (const issue of issues) {
      const key = String(issue.path[0]);
      setErrorIssue(key as keyof FormValues, issue.message);
    }
  }

  function onMutationError(error: unknown): boolean {
    if (error instanceof SessionEndedError) {
      router.replace(SESSION_ENDED_PATH); // FR-007 — não é "erro da ação"
      return true;
    }
    setFailure(describeActionFailure(failureFromError(error)));
    return false;
  }

  function toNumberOrIssue(text: string, field: "latitude" | "longitude" | "toleranceRadiusM", message: string): { ok: true; value?: number | undefined } | { ok: false } {
    if (text.trim() === "") {
      if (field === "toleranceRadiusM") return { ok: true, value: undefined };
      setErrorIssue(field, message);
      return { ok: false };
    }
    const parsed = Number(text.replace(",", "."));
    if (Number.isNaN(parsed)) {
      setErrorIssue(field, field === "toleranceRadiusM" ? "Raio deve ser um número de metros." : "Informe um número válido.");
      return { ok: false };
    }
    return { ok: true, value: parsed };
  }

  const submit = handleSubmit((values) => {
    setFailure(null);
    setFieldIssues({});
    const latCheck = toNumberOrIssue(values.latitude, "latitude", "Informe a latitude.");
    if (!latCheck.ok) return;
    const lngCheck = toNumberOrIssue(values.longitude, "longitude", "Informe a longitude.");
    if (!lngCheck.ok) return;
    const radiusCheck = toNumberOrIssue(values.toleranceRadiusM, "toleranceRadiusM", "Informe um número.");
    if (!radiusCheck.ok) return;

    if (mode === "create") {
      const parsed = spotFormSchema.safeParse({
        name: values.name,
        description: values.description,
        latitude: latCheck.value!,
        longitude: lngCheck.value!,
        toleranceRadiusM: radiusCheck.value ?? null,
        categories: values.categories,
        schedule: values.schedule,
        status: values.status,
      });
      if (!parsed.success) {
        applyIssues(parsed.error.issues);
        return;
      }
      createMutation
        .mutateAsync({
          name: parsed.data.name,
          description: parsed.data.description,
          latitude: parsed.data.latitude,
          longitude: parsed.data.longitude,
          ...(parsed.data.toleranceRadiusM != null
            ? { toleranceRadiusM: parsed.data.toleranceRadiusM }
            : {}),
          categories: parsed.data.categories,
          schedule: parsed.data.schedule,
          status: parsed.data.status,
        })
        .then(() => onSaved())
        .catch((error: unknown) => {
          onMutationError(error);
        });
      return;
    }
    // Edit: PATCH PARCIAL — somente campos alterados (FR-012/D6).
    const original = spot!;
    const edited: Record<string, unknown> = {};
    if (values.name.trim() !== original.name) edited.name = values.name.trim();
    if (values.description.trim() !== original.description) edited.description = values.description.trim();
    if (Number(values.latitude.replace(",", ".")) !== original.latitude) {
      edited.latitude = latCheck.value!;
    }
    if (Number(values.longitude.replace(",", ".")) !== original.longitude) {
      edited.longitude = lngCheck.value!;
    }
    const originalRadius = original.toleranceRadiusM ?? null;
    const radiusValue = radiusCheck.value ?? null;
    if (radiusValue !== originalRadius) {
      // contrato de update aceita number|null (limpar o raio)
      edited.toleranceRadiusM = radiusValue;
    }
    if (values.status !== original.status) edited.status = values.status;
    const sameCategories =
      values.categories.length === original.categories.length &&
      [...values.categories].sort().every((key, index) => [...original.categories].sort()[index] === key);
    if (!sameCategories) edited.categories = values.categories;
    if (JSON.stringify(values.schedule) !== JSON.stringify(original.schedule)) {
      edited.schedule = values.schedule; // lista resubmitida inteira quando alterada (D6)
    }
    if (Object.keys(edited).length === 0) {
      setFailure("Nenhum campo foi alterado.");
      return;
    }
    const parsed = spotUpdateSchema.safeParse(edited);
    if (!parsed.success) {
      applyIssues(parsed.error.issues);
      return;
    }
    updateMutation
      .mutateAsync({ id: original.id, body: parsed.data })
      .then(() => onSaved())
      .catch((error: unknown) => {
        onMutationError(error);
      });
  });

  return (
    <Dialog.Root open onOpenChange={(next: boolean) => !next && !isPending && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/30" />
        <Dialog.Popup className="fixed left-1/2 top-4 z-10 max-h-[calc(100dvh-2rem)] w-11/12 max-w-2xl -translate-x-1/2 overflow-y-auto rounded-md bg-surface p-5 shadow-lg">
          <Dialog.Title className="text-title-2">
            {mode === "create" ? "Cadastrar ponto turístico" : "Editar ponto turístico"}
          </Dialog.Title>
          <Dialog.Description className="text-body text-foreground-muted">
            {mode === "create"
              ? "Informe os dados do ponto, marque a localização no mapa (ou digite as coordenadas) e o cronograma de funcionamento."
              : "Salve apenas os campos alterados. O efeito do status ao turista é decisão do backend."}
          </Dialog.Description>
          <form noValidate onSubmit={submit} className="mt-4 flex flex-col gap-4">
            <label className="text-title-4 flex flex-col gap-1">
              Nome
              <input type="text" autoComplete="off" className={INPUT_CLASSES} {...register("name")} />
              {errors.name || fieldIssues.name ? (
                <span role="alert" className="text-body text-danger-soft-foreground">
                  {errors.name?.message ?? fieldIssues.name}
                </span>
              ) : null}
            </label>
            <label className="text-title-4 flex flex-col gap-1">
              Descrição
              <textarea rows={3} className="text-body rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-primary" {...register("description")} />
              {errors.description || fieldIssues.description ? (
                <span role="alert" className="text-body text-danger-soft-foreground">
                  {errors.description?.message ?? fieldIssues.description}
                </span>
              ) : null}
            </label>

            <CategorySelector
              id="spot-categories"
              value={categories}
              onChange={(next) => setValue("categories", next)}
            />
            {fieldIssues.categories ? (
              <span role="alert" className="text-body text-danger-soft-foreground">
                {fieldIssues.categories}
              </span>
            ) : null}

            <div className="flex flex-col gap-2">
              <span className="text-title-4">Localização</span>
              <div className="text-body flex items-end gap-3">
                <label className="flex flex-col gap-1 text-title-4">
                  Latitude (−90…90)
                  <input type="text" inputMode="decimal" autoComplete="off" className={INPUT_CLASSES} {...register("latitude")} />
                </label>
                <label className="flex flex-col gap-1 text-title-4">
                  Longitude (−180…180)
                  <input type="text" inputMode="decimal" autoComplete="off" className={INPUT_CLASSES} {...register("longitude")} />
                </label>
              </div>
              {fieldIssues.latitude ? (
                <span role="alert" className="text-body text-danger-soft-foreground">{fieldIssues.latitude}</span>
              ) : null}
              {fieldIssues.longitude ? (
                <span role="alert" className="text-body text-danger-soft-foreground">{fieldIssues.longitude}</span>
              ) : null}
              <SpotMapPicker
                latitude={Number(latitudeText.replace(",", ".")) || null}
                longitude={Number(longitudeText.replace(",", ".")) || null}
                fallbackCenter={fallbackCenter}
                onChange={(lat, lng) => {
                  setValue("latitude", String(lat));
                  setValue("longitude", String(lng));
                }}
              />
              <p className="text-body text-foreground-muted">
                Clique no mapa para posicionar o marcador — digitar as coordenadas acima também posiciona (os dois se complementam).
              </p>
            </div>

            <label className="text-title-4 flex flex-col gap-1">
              Raio de tolerância em metros (opcional — geocerca do app do turista)
              <input type="text" inputMode="decimal" autoComplete="off" className={INPUT_CLASSES} {...register("toleranceRadiusM")} />
              {fieldIssues.toleranceRadiusM ? (
                <span role="alert" className="text-body text-danger-soft-foreground">
                  {fieldIssues.toleranceRadiusM}
                </span>
              ) : null}
            </label>

            <ScheduleEditor
              id="spot-schedule"
              value={schedule}
              onChange={(next) => setValue("schedule", next)}
            />
            {fieldIssues.schedule ? (
              <span role="alert" className="text-body text-danger-soft-foreground">
                {fieldIssues.schedule}
              </span>
            ) : null}

            <fieldset className="flex flex-col gap-2 rounded-md border border-border p-3">
              <legend className="text-title-4 px-1">Status de operação</legend>
              <div className="flex flex-wrap gap-3">
                {SPOT_STATUSES.map((status) => (
                  <label key={status} className="text-body flex items-center gap-2">
                    <input
                      type="radio"
                      name="status"
                      value={status}
                      checked={watch("status") === status}
                      onChange={() => setValue("status", status)}
                    />
                    {status === SPOT_STATUS_OPEN ? "Aberto ao público" : status === "temporarilyClosed" ? "Temporariamente fechado" : "Fechado permanentemente"}
                  </label>
                ))}
              </div>
            </fieldset>

            {failure ? (
              <div role="alert" className="text-body rounded-md bg-danger-soft px-3 py-2 text-danger-soft-foreground">
                {failure}
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" disabled={isPending} onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando…" : mode === "create" ? "Cadastrar" : "Salvar"}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
