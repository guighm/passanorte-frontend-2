"use client";

// Cliente do fluxo de edição de rota (SPE-05 T013): carrega a rota pelo
// DETALHE do contrato (GET /gamification/routes/{id} — useRouteQuery) e
// monta o RouteForm no modo edit. NÃO há página de detalhe na UI
// (clarificação de spec) — a edição é a única superfície de leitura da
// lista ordenada. Desfechos:
//  - carregamento: LoadingState distinto;
//  - erro de rede/contrato/404 (arquivada p/ não-admin ou id inexistente):
//    ErrorState acionável com nova tentativa;
//  - rota arquivada (probe P1: status "archived"): o RouteForm renderiza
//    estado somente-leitura — leitura de arquivada é permitida ao admin.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Button from "@/shared/components/Button";
import ErrorState from "@/shared/components/ErrorState";
import LoadingState from "@/shared/components/LoadingState";
import { SessionEndedError } from "@/features/auth/api/errors";
import { useRouteQuery } from "@/features/tours/api/queries";
import {
  describeRouteActionFailure,
  failureFromError,
  SESSION_ENDED_PATH,
} from "@/features/tours/api/messages";
import RouteForm from "@/features/tours/components/RouteForm";

export default function EditRouteView({ routeId }: { routeId: number }) {
  const router = useRouter();
  const routeQuery = useRouteQuery(routeId);

  useEffect(() => {
    if (routeQuery.error instanceof SessionEndedError) {
      router.replace(SESSION_ENDED_PATH); // sessão encerrada — padrão SPE-02–04
    }
  }, [routeQuery.error, router]);

  if (routeQuery.isPending) {
    return <LoadingState label="Carregando rota…" />;
  }
  if (routeQuery.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorState message={describeRouteActionFailure(failureFromError(routeQuery.error))} />
        <Button
          variant="secondary"
          onClick={() => {
            void routeQuery.refetch();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }
  if (!routeQuery.data) {
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorState message="Rota não encontrada — ela pode ter sido alterada em outra sessão." />
        <Link
          className="text-primary text-body underline-offset-2 hover:underline"
          href="/admin/tours"
        >
          Voltar para a listagem
        </Link>
      </div>
    );
  }

  return <RouteForm mode={{ mode: "edit", route: routeQuery.data }} />;
}
