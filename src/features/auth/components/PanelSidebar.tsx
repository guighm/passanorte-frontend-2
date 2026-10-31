// Navegação lateral do painel (US2 T018): itens já filtrados por papel
// (RBAC de superfície, FR-012) — o filtro acontece no shell, antes daqui.

import Link from "next/link";

interface PanelSidebarProps {
  items: { href: string; label: string; spec: string }[];
}

export default function PanelSidebar({ items }: PanelSidebarProps) {
  return (
    <nav aria-label="Navegação do painel" className="flex w-56 flex-col gap-1 border-r border-border bg-surface px-3 py-6">
      <span className="px-2 pb-4 font-mono text-sm font-semibold text-primary">PassaNorte</span>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-foreground transition-colors duration-[var(--duration-fast)] hover:bg-surface-muted"
        >
          {item.label}
          <span className="font-mono text-[10px] text-foreground-muted">{item.spec}</span>
        </Link>
      ))}
    </nav>
  );
}