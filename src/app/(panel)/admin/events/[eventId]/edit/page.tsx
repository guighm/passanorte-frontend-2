// Página dedicada de edição de evento (SPE-04 T018 — FR-013, research D3):
// rota dinâmica conforme docs vigentes do App Router (T001) — `params` é
// Promise (await no Server Component). `eventId` não numérico ⇒ notFound().
// O contrato NÃO expõe GET /events/{id} (D2): o evento é carregado pela
// listagem via useEventQuery no cliente (EditEventView — estados de
// carregamento/erro/não-encontrado distintos, Princípio V).

import Link from "next/link";
import { notFound } from "next/navigation";
import EditEventView from "@/features/events/components/EditEventView";

export default async function AdminEditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const parsed = Number(eventId);
  if (!Number.isInteger(parsed) || parsed < 1) {
    notFound(); // id não numérico ⇒ 404 do painel (rota inválida)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label="Navegação do módulo" className="text-body mb-4">
        <Link className="text-primary underline-offset-2 hover:underline" href="/admin/events">
          ← Voltar para a listagem de eventos
        </Link>
      </nav>
      <h1 className="text-title-1 mb-4">Editar evento</h1>
      <EditEventView eventId={parsed} />
    </div>
  );
}

export const metadata = {
  title: "Editar evento — PassaNorte",
};
