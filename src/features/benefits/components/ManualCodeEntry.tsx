"use client";

// ManualCodeEntry (SPE-06 T010 — FR-002/FR-014): entrada MANUAL do código
// como alternativa à câmera — MESMO fluxo, mesma conferência, mesmo desfecho
// (clarificação Q4 de 2ª sessão: a manual mantém ação própria de "validar";
// a câmera valida automaticamente ao ler). Campo obrigatório 1–128
// (contrato/data-model) com vazio bloqueado LOCALMENTE, sem chamar a API
// (edge case). Operável por teclado com label acessível (FR-014/Constraint 6).
// Resolver RHF manual sobre o schema Zod (padrão do projeto — RouteForm
// da SPE-05; nenhuma dependência além das sancionadas).

import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import Button from "@/shared/components/Button";

const codeSchema = z
  .string()
  // Trim por schema — só para validar o tamanho lógico (1–128) do código
  // sem contagens de espaços nas extremidades.
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(1, "Informe o código de resgate exibido no app do turista.")
      .max(128, "Código acima do limite do contrato (1–128)."),
  );

const manualResolver: Resolver<{ code: string }> = async (raw) => {
  // Valida a STRING do campo (o schema anterior era de objeto — bug da 1ª
  // rodada de validação; o padrão RouteForm aplica safeParse no valor cru).
  const parsed = codeSchema.safeParse(raw.code);
  if (parsed.success) return { values: raw, errors: {} };
  const errors: Record<string, { type: string; message: string }> = {};
  for (const issue of parsed.error.issues) {
    errors[String(issue.path[0] ?? "code")] = { type: "validation", message: issue.message };
  }
  return { values: {}, errors };
};

interface ManualCodeEntryProps {
  /** Submissão válida (código aparado) — a view dispara a MESMA validação da câmera (FR-002). */
  onValidated: (code: string) => void;
  /** Desabilita enquanto a validação/concessão está em curso (Princípio V). */
  disabled?: boolean;
}

export default function ManualCodeEntry({ onValidated, disabled = false }: ManualCodeEntryProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ code: string }>({
    resolver: manualResolver,
    defaultValues: { code: "" },
  });

  const submit = handleSubmit((values) => {
    // Normalização aqui (trim — FR-004): o resolver valida o CRU; o código
    // ENVIADO/apresentado é normalizado nas extremidades.
    onValidated(values.code.trim());
    reset({ code: "" });
  });

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        void submit(event);
      }}
      noValidate
    >
      <label className="text-caption text-foreground-muted" htmlFor="manual-code">
        Entrada manual do código de resgate
      </label>
      <div className="flex items-center gap-2">
        <input
          id="manual-code"
          type="text"
          autoComplete="off"
          maxLength={128}
          disabled={disabled || isSubmitting}
          aria-describedby={errors.code ? "manual-code-error" : undefined}
          className="text-body h-10 rounded-md border border-border bg-surface px-3 text-foreground outline-none focus:border-primary disabled:opacity-60"
          placeholder="Digite ou cole o código"
          {...register("code")}
        />
        <Button type="submit" disabled={disabled || isSubmitting}>
          {isSubmitting ? "Validando…" : "Validar"}
        </Button>
      </div>
      {errors.code ? (
        <p id="manual-code-error" role="alert" className="text-caption text-danger">
          {errors.code.message}
        </p>
      ) : null}
    </form>
  );
}
