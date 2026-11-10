// Página dedicada de cadastro de rota (SPE-05 T009 — clarificação Q1:
// páginas dedicadas com rota própria, padrão da SPE-04): Server Component
// fino montando o RouteForm client (T008). Sucesso ⇒ navegação à listagem
// (invalidação reflete sem reload). Guardas admin da SPE-01 em src/proxy.ts
// cobrem /admin/* (FR-001 — sem duplicação).

import Link from "next/link";
import RouteForm from "@/features/tours/components/RouteForm";

export default function AdminNewRoutePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label="Navegação do módulo" className="text-body mb-4">
        <Link className="text-primary underline-offset-2 hover:underline" href="/admin/tours">
          ← Voltar para a listagem de rotas
        </Link>
      </nav>
      <h1 className="text-title-1 mb-4">Nova rota turística</h1>
      <RouteForm mode={{ mode: "create" }} />
    </div>
  );
}

export const metadata = {
  title: "Nova rota — PassaNorte",
};
