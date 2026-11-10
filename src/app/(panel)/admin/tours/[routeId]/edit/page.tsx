// Página dedicada de edição de rota (SPE-05 T014 — clarificação Q1):
// rota dinâmica conforme docs vigentes do App Router (T001) — `params` é
// Promise (await no Server Component). `routeId` não numérico ⇒ notFound().
// A rota é carregada pelo DETALHE do contrato via useRouteQuery no cliente
// (EditRouteView — estados de carregamento/erro distintos, Princípio V);
// NÃO há página de detalhe em leitura (clarificação da 2ª sessão — a
// edição é a única superfície de leitura da lista ordenada).

import Link from "next/link";
import { notFound } from "next/navigation";
import EditRouteView from "@/features/tours/components/EditRouteView";

export default async function AdminEditRoutePage({
  params,
}: {
  params: Promise<{ routeId: string }>;
}) {
  const { routeId } = await params;

  const parsed = Number(routeId);
  if (!Number.isInteger(parsed) || parsed < 1) {
    notFound(); // id não numérico ⇒ 404 do painel (rota inválida)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label="Navegação do módulo" className="text-body mb-4">
        <Link className="text-primary underline-offset-2 hover:underline" href="/admin/tours">
          ← Voltar para a listagem de rotas
        </Link>
      </nav>
      <h1 className="text-title-1 mb-4">Editar rota turística</h1>
      <EditRouteView routeId={parsed} />
    </div>
  );
}

export const metadata = {
  title: "Editar rota — PassaNorte",
};

/** Página admin de edição: rota BLOQUEANTE (docs vigentes do Next 16 —
 * `instant-shell-url-data`: `params` acessado fora de <Suspense>; shell
 * instantâneo não agrega aqui, então optamos por rota bloqueante). */
export const instant = false;
