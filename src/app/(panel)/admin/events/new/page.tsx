// Página dedicada de cadastro de evento (SPE-04 T015 — FR-013, clarificação
// 2026-11-10: páginas dedicadas com rota própria, padrão novo no projeto —
// research D3): Server Component fino montando o EventForm client (T013).
// Sucesso ⇒ navegação à listagem (SC-002). Guardas admin da SPE-01 em
// src/proxy.ts cobrem /admin/* (FR-001 — sem duplicação).

import Link from "next/link";
import EventForm from "@/features/events/components/EventForm";

export default function AdminNewEventPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label="Navegação do módulo" className="text-body mb-4">
        <Link className="text-primary underline-offset-2 hover:underline" href="/admin/events">
          ← Voltar para a listagem de eventos
        </Link>
      </nav>
      <h1 className="text-title-1 mb-4">Novo evento</h1>
      <EventForm mode={{ mode: "create" }} />
    </div>
  );
}

export const metadata = {
  title: "Novo evento — PassaNorte",
};
