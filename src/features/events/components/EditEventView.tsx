"use client";

// Cliente do fluxo de edição (SPE-04 T016): carrega o evento pela
// listagem (D2 — o contrato não expõe GET /events/{id}) e monta o
// EventForm no modo edit. Desfechos:
//  - carregamento: LoadingState distinto;
//  - erro de rede/contrato: ErrorState + nova tentativa;
//  - evento ausente na lista (removido em outra sessão): ErrorState
//    acionável com retorno à listagem — o id não numérico já virou
//    notFound() na página (T018).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Button from "@/shared/components/Button";
import ErrorState from "@/shared/components/ErrorState";
import LoadingState from "@/shared/components/LoadingState";
import { SessionEndedError } from "@/features/auth/api/errors";
import { useEventQuery } from "@/features/events/api/queries";
import {
  describeEventActionFailure,
  failureFromError,
  SESSION_ENDED_PATH,
} from "@/features/events/api/messages";
import EventForm from "@/features/events/components/EventForm";

export default function EditEventView({ eventId }: { eventId: number }) {
  const router = useRouter();
  const eventQuery = useEventQuery(eventId);

  useEffect(() => {
    if (eventQuery.error instanceof SessionEndedError) {
      router.replace(SESSION_ENDED_PATH); // FR-007 — padrão SPE-02/03
    }
  }, [eventQuery.error, router]);

  if (eventQuery.isPending) {
    return <LoadingState label="Carregando evento…" />;
  }
  if (eventQuery.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorState message={describeEventActionFailure(failureFromError(eventQuery.error))} />
        <Button
          variant="secondary"
          onClick={() => {
            void eventQuery.refetch();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }
  if (!eventQuery.data) {
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorState message="Evento não encontrado — ele pode ter sido removido em outra sessão." />
        <Link
          className="text-primary text-body underline-offset-2 hover:underline"
          href="/admin/events"
        >
          Voltar para a listagem
        </Link>
      </div>
    );
  }

  return <EventForm mode={{ mode: "edit", event: eventQuery.data }} />;
}
