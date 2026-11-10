"use client";

// Indicador de saldo do brinde (SPE-05 T010 — FR-003, clarificação Q2):
// número + rótulo pt-BR ("em estoque") com DESTAQUE visual próprio para
// saldo 0 ("esgotado"), não confundível com positivo; SEM estado
// "estoque baixo" (limiar acordado fora de escopo) e SEM cálculo — o
// número exibido é sempre o `stockQuantity` retornado pela API (FR-004/
// Princípio II). Rotas arquivadas (status "archived" — probe P1) seguem
// exibindo o saldo (estado histórico).

export default function PrizeLabel({ prizeName, stockQuantity }: { prizeName: string; stockQuantity: number }) {
  if (stockQuantity === 0) {
    return (
      <span
        className="text-body inline-flex items-center gap-1 rounded-md bg-danger-soft px-2 py-0.5 font-semibold text-danger-soft-foreground"
        aria-label={`${prizeName}: esgotado — 0 em estoque`}
      >
        {prizeName} · esgotado (0)
      </span>
    );
  }
  return (
    <span className="text-body">
      {prizeName} · {String(stockQuantity)} em estoque
    </span>
  );
}
