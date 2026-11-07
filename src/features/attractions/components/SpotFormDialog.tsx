"use client";

// Diálogo unificado de cadastro/edição de pontos turísticos em WIZARD de
// 4 etapas (SPE-03 T014/T016 — D6; decisão do owner 2026-11-06, clarificação
// na spec): 1) Identificação; 2) Categorias; 3) Localização; 4) Funcionamento.
// Validação POR ETAPA (Zod parcial — spotFormSchema.pick) antes de avançar;
// submit ÚNICO no fim (contrato inalterado). RHF + Zod espelhando o contrato
// (name 1–200, description 1–2000, lat −90…90, lng −180…180, tolerância>0
// opcional, categories ≥1, schedule ≥1 HH:MM, status enum). Envio parcial em
// edição (FR-012; schedule resubmitida inteira quando alterada — D6).
// SpotMapPicker (única integração de mapa — Constraint 3/emenda 2.0.0 OSM) e
// entrada manual bidirecional (SC-004). Estados carregamento/erro distintos
// (Princípio V); dados preservados em erro; sessão encerrada ⇒ login (FR-007).

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

type FieldName = "name" | "description" | "latitude" | "longitude" | "toleranceRadiusM" | "categories" | "schedule" | "status";

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

/** Etapas do wizard (decisão do owner — clarificação 2026-11-06). */
const STEPS = [
  { key: "identification", label: "Identificação", fields: ["name", "description"] },
  { key: "categories", label: "Categorias", fields: ["categories"] },
  { key: "location", label: "Localização", fields: ["latitude", "longitude", "toleranceRadiusM"] },
  { key: "operation", label: "Funcionamento", fields: ["schedule", "status"] },
] as const;

export default function SpotFormDialog({
  mode,
  spot,
  fallbackCenter,
  onSaved,
  onClose,
}: SpotFormDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);
  const [fieldIssues, setFieldIssues] = useState<Partial<Record<FieldName, string>>>({});
  const createMutation = useCreateSpotMutation();
  const updateMutation = useUpdateSpotMutation();
  const {
    watch,
    setValue,
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
  const nameText = watch("name");
  const descriptionText = watch("description");
  const radiusText = watch("toleranceRadiusM");
  const categories = watch("categories");
  const schedule = watch("schedule");
  const latitudeText = watch("latitude");
  const longitudeText = watch("longitude");
  const isPending = mode === "create" ? createMutation.isPending : updateMutation.isPending;

  /** Converte texto → número com mensagem específica por campo. */
  function toNumberOrIssue(text: string, field: "latitude" | "longitude" | "toleranceRadiusM"): { ok: boolean; value?: number } {
    if (text.trim() === "") {
      if (field === "toleranceRadiusM") return { ok: true }; // opcional
      setFieldIssues((current) => ({ ...current, [field]: "Informe a coordenada." }));
      return { ok: false };
    }
    const parsed = Number(text.replace(",", "."));
    if (Number.isNaN(parsed)) {
      setFieldIssues((current) => ({
        ...current,
        [field]: field === "toleranceRadiusM" ? "Raio deve ser um número de metros." : "Informe um número válido.",
      }));
      return { ok: false };
    }
    return { ok: true, value: parsed };
  }

  function setErrorIssue(field: FieldName, message: string) {
    setFieldIssues((current) => ({ ...current, [field]: message }));
  }

  function applyIssues(issues: readonly { path: ReadonlyArray<unknown>; message: string }[]) {
    setFieldIssues({});
    for (const issue of issues) {
      setErrorIssue(String(issue.path[0]) as FieldName, issue.message);
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

  /** Validação POR ETAPA (Zod parcial via pick) — bloqueia avançar (US2). */
  function validateCurrentStep(): boolean {
    const values: FormValues = {
      name: nameText,
      description: descriptionText,
      latitude: latitudeText,
      longitude: longitudeText,
      toleranceRadiusM: radiusText,
      categories,
      schedule,
      status: watch("status"),
    };
    setFieldIssues({});
    setFailure(null);
    const stepKey = STEPS[step].key;
    if (stepKey === "identification") {
      const parsed = spotFormSchema.pick({ name: true, description: true }).safeParse({
        name: values.name,
        description: values.description,
      });
      if (!parsed.success) {
        applyIssues(parsed.error.issues);
        return false;
      }
      return true;
    }
    if (stepKey === "categories") {
      const parsed = spotFormSchema.pick({ categories: true }).safeParse({ categories: values.categories });
      if (!parsed.success) {
        applyIssues(parsed.error.issues);
        return false;
      }
      return true;
    }
    if (stepKey === "location") {
      const latCheck = toNumberOrIssue(values.latitude, "latitude");
      const lngCheck = toNumberOrIssue(values.longitude, "longitude");
      const radiusCheck = toNumberOrIssue(values.toleranceRadiusM, "toleranceRadiusM");
      if (!latCheck.ok || !lngCheck.ok || !radiusCheck.ok) return false;
      const parsed = spotFormSchema
        .pick({ latitude: true, longitude: true, toleranceRadiusM: true })
        .safeParse({
          latitude: latCheck.value!,
          longitude: lngCheck.value!,
          toleranceRadiusM: radiusCheck.value ?? null,
        });
      if (!parsed.success) {
        applyIssues(parsed.error.issues);
        return false;
      }
      return true;
    }
    // Funcionamento: cronograma + status
    const parsed = spotFormSchema.pick({ schedule: true, status: true }).safeParse({
      schedule: values.schedule,
      status: values.status,
    });
    if (!parsed.success) {
      applyIssues(parsed.error.issues);
      return false;
    }
    return true;
  }

  function nextStep() {
    if (!validateCurrentStep()) return;
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  }

  function prevStep() {
    setFailure(null);
    setFieldIssues({});
    setStep((current) => Math.max(0, current - 1));
  }

  /** Submit final (único — contrato): validação completa + mutação. */
  function submitFinal() {
    const values: FormValues = {
      name: nameText,
      description: descriptionText,
      latitude: latitudeText,
      longitude: longitudeText,
      toleranceRadiusM: radiusText,
      categories,
      schedule,
      status: watch("status"),
    };
    setFailure(null);
    setFieldIssues({});
    const latCheck = toNumberOrIssue(values.latitude, "latitude");
    const lngCheck = toNumberOrIssue(values.longitude, "longitude");
    const radiusCheck = toNumberOrIssue(values.toleranceRadiusM, "toleranceRadiusM");
    if (!latCheck.ok || !lngCheck.ok || !radiusCheck.ok) {
      setStep(2); // Localização
      return;
    }
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
        // Volta à primeira etapa com falha (caminho mais curto até o problema)
        setStep(0);
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
    if (Number(values.latitude.replace(",", ".")) !== original.latitude) edited.latitude = latCheck.value!;
    if (Number(values.longitude.replace(",", ".")) !== original.longitude) edited.longitude = lngCheck.value!;
    const originalRadius = original.toleranceRadiusM ?? null;
    const radiusValue = radiusCheck.value ?? null;
    if (radiusValue !== originalRadius) edited.toleranceRadiusM = radiusValue; // contrat de update aceita null
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
  }

  function issueFor(field: FieldName): string | undefined {
    return fieldIssues[field];
  }

  return (
    <Dialog.Root open onOpenChange={(next: boolean) => !next && !isPending && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/30" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-10 max-h-[calc(100dvh-2rem)] w-11/12 max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md bg-surface p-5 shadow-lg">
          <Dialog.Title className="text-title-2">
            {mode === "create" ? "Cadastrar ponto turístico" : "Editar ponto turístico"}
          </Dialog.Title>
          <Dialog.Description className="text-body text-foreground-muted">
            {mode === "create"
              ? "Preencha as etapas e salve — a senha não existe aqui; só dados do ponto."
              : "Revise e salve as etapas alteradas. O efeito do status ao turista é decisão do backend."}
          </Dialog.Description>

          {/* Indicador de etapas acessível (aria-current + contagem) */}
          <ol className="mt-4 flex flex-wrap items-center gap-2" aria-label={`Etapa ${step + 1} de ${STEPS.length}`}>
            {STEPS.map((item, index) => (
              <li key={item.key} aria-current={index === step ? "step" : undefined}>
                <span
                  className={
                    index === step
                      ? "text-title-4 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-primary-foreground"
                      : index < step
                        ? "text-body inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-primary-soft-foreground"
                        : "text-body inline-flex items-center gap-1 rounded-full bg-surface-muted px-3 py-1 text-foreground-muted"
                  }
                >
                  {index + 1}. {item.label}
                </span>
              </li>
            ))}
          </ol>

          <form noValidate onSubmit={(event) => event.preventDefault()} className="mt-4 flex flex-col gap-4">
            {/* ------------------------------------------------ Etapa 1 -- */}
            {step === 0 && (
              <>
                <label className="text-title-4 flex flex-col gap-1">
                  Nome
                  <input type="text" autoComplete="off" className={INPUT_CLASSES} value={nameText} onChange={(event) => setValue("name", event.target.value)} />
                  {issueFor("name") ? (
                    <span role="alert" className="text-body text-danger-soft-foreground">{issueFor("name")}</span>
                  ) : null}
                </label>
                <label className="text-title-4 flex flex-col gap-1">
                  Descrição
                  <textarea rows={4} className="text-body rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-primary" value={descriptionText} onChange={(event) => setValue("description", event.target.value)} />
                  {issueFor("description") ? (
                    <span role="alert" className="text-body text-danger-soft-foreground">{issueFor("description")}</span>
                  ) : null}
                </label>
              </>
            )}

            {/* ------------------------------------------------ Etapa 2 -- */}
            {step === 1 && (
              <>
                <CategorySelector id="spot-categories" value={categories} onChange={(next) => setValue("categories", next)} />
                {issueFor("categories") ? (
                  <span role="alert" className="text-body text-danger-soft-foreground">{issueFor("categories")}</span>
                ) : null}
              </>
            )}

            {/* ------------------------------------------------ Etapa 3 -- */}
            {step === 2 && (
              <div className="flex flex-col gap-2">
                <div className="text-body flex items-end gap-3">
                  <label className="flex flex-col gap-1 text-title-4">
                    Latitude (−90…90)
                    <input type="text" inputMode="decimal" autoComplete="off" className={INPUT_CLASSES} value={latitudeText} onChange={(event) => setValue("latitude", event.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-title-4">
                    Longitude (−180…180)
                    <input type="text" inputMode="decimal" autoComplete="off" className={INPUT_CLASSES} value={longitudeText} onChange={(event) => setValue("longitude", event.target.value)} />
                  </label>
                </div>
                {issueFor("latitude") ? (
                  <span role="alert" className="text-body text-danger-soft-foreground">{issueFor("latitude")}</span>
                ) : null}
                {issueFor("longitude") ? (
                  <span role="alert" className="text-body text-danger-soft-foreground">{issueFor("longitude")}</span>
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
                <label className="text-title-4 flex flex-col gap-1">
                  Raio de tolerância em metros (opcional — geocerca do app do turista)
                  <input type="text" inputMode="decimal" autoComplete="off" className={INPUT_CLASSES} value={radiusText} onChange={(event) => setValue("toleranceRadiusM", event.target.value)} />
                  {issueFor("toleranceRadiusM") ? (
                    <span role="alert" className="text-body text-danger-soft-foreground">{issueFor("toleranceRadiusM")}</span>
                  ) : null}
                </label>
              </div>
            )}

            {/* ------------------------------------------------ Etapa 4 -- */}
            {step === 3 && (
              <>
                <ScheduleEditor id="spot-schedule" value={schedule} onChange={(next) => setValue("schedule", next)} />
                {issueFor("schedule") ? (
                  <span role="alert" className="text-body text-danger-soft-foreground">{issueFor("schedule")}</span>
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
              </>
            )}

            {failure ? (
              <div role="alert" className="text-body rounded-md bg-danger-soft px-3 py-2 text-danger-soft-foreground">
                {failure}
              </div>
            ) : null}

            {/* ------------------------------------------------ rodapé -- */}
            <div className="flex items-center justify-between gap-2">
              <Button variant="secondary" disabled={isPending} onClick={onClose}>
                Cancelar
              </Button>
              <div className="flex gap-2">
                {step > 0 ? (
                  <Button variant="secondary" disabled={isPending} onClick={prevStep}>
                    Voltar
                  </Button>
                ) : null}
                {step < STEPS.length - 1 ? (
                  <Button onClick={nextStep}>{isPending ? "Aguarde…" : "Continuar"}</Button>
                ) : (
                  <Button disabled={isPending} onClick={submitFinal}>
                    {isPending ? "Salvando…" : mode === "create" ? "Cadastrar" : "Salvar"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
