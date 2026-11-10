// Página fina da área de eventos (SPE-04 T010 — padrão attractions page):
// Server Component mínimo renderizando o EventsView client — leitura/
// mutações client-side via TanStack Query + túnel BFF (research D1).
// Acesso exclusivo do administrador: guardas da SPE-01 em src/proxy.ts
// cobrem /admin/* (FR-001, SPE-01 US2 — sem duplicação). Rotas dedicadas
// de cadastro/edição (FR-013): /admin/events/new e /admin/events/[eventId]/edit.

import EventsView from "@/features/events/components/EventsView";

export default function AdminEventsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <EventsView />
    </div>
  );
}

export const metadata = {
  title: "Eventos — PassaNorte",
};
