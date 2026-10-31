// Mapa de guardas por papel (RF03, contracts/panel-session.md).
// Módulo PURE (sem next/headers, sem fetch): consumido por src/proxy.ts
// (que não deve depender de módulos com estado — research D1) e pelos
// layouts server-side (segunda camada de papel).
//
// Princípio II (FR-013/FR-014): o papel aqui governa SOMENTE navegação;
// a autorização real é sempre decisão do backend em cada chamada.

import type { PanelSession, Role } from "@/features/auth/types";

/** Padrões de rota do painel (ordem de especificidade não importa: 1:1). */
export type RoutePattern = "/" | "/admin/*" | "/benefits" | "/login";

const ROLE_RULES: { pattern: RoutePattern; roles: readonly (Role | "any")[] }[] = [
  { pattern: "/", roles: ["administrador"] },
  { pattern: "/admin/*", roles: ["administrador"] },
  { pattern: "/benefits", roles: ["administrador", "funcionario"] },
];

/** Páginas iniciais por papel (redirecionamento pós-login, FR-004). */
export function homePathForRole(role: Role): string {
  return role === "funcionario" ? "/benefits" : "/";
}

function matchesPattern(pathname: string, pattern: RoutePattern): boolean {
  if (pattern === "/admin/*") {
    return pathname === "/admin" || pathname.startsWith("/admin/");
  }
  return pathname === pattern;
}

/**
 * Papel pode navegar para o pathname? (RBAC de superfície somente)
 * Papel fora do enum é sempre falha de sessão (edge case da spec) — o
 * caller deve tratar null como sessão inválida.
 */
export function roleCanAccess(pathname: string, role: Role): boolean {
  const rule = ROLE_RULES.find((line) => matchesPattern(pathname, line.pattern));
  if (!rule) return false;
  return rule.roles.includes(role);
}

/** Extrai o estado de sessão de um valor cru de cookie (uso no proxy — pure). */
export function readSessionCookie(sessionCookie?: string, refreshCookie?: string): {
  status: "active" | "expired";
  session: PanelSession;
  canRenew: boolean;
} | null {
  if (!sessionCookie) return null;
  try {
    const session = JSON.parse(decodeURIComponent(sessionCookie)) as PanelSession;
    if (
      typeof session?.expiresAt !== "number" ||
      typeof session?.accessToken !== "string" ||
      typeof session?.refreshToken !== "string" ||
      typeof session?.operator?.role !== "string" ||
      typeof session?.operator?.name !== "string" ||
      typeof session?.operator?.id !== "string"
    ) {
      return null;
    }
    const expired = session.expiresAt <= Date.now();
    const canRenew = Boolean(refreshCookie);
    if (expired && !canRenew) return null;
    return { status: expired ? "expired" : "active", session, canRenew };
  } catch {
    return null;
  }
}

/** Lista de navegação por papel (FR-012) — itens condicionais do shell. */
export const NAV_ITEMS: { href: string; label: string; spec: string }[] = [
  { href: "/", label: "Início", spec: "SPE-01" },
  { href: "/admin/dashboard", label: "Dashboard e Insights", spec: "SPE-07" },
  { href: "/admin/attractions", label: "Pontos Turísticos", spec: "SPE-03" },
  { href: "/admin/events", label: "Eventos", spec: "SPE-04" },
  { href: "/admin/tours", label: "Rotas e Benefícios", spec: "SPE-05" },
  { href: "/admin/employees", label: "Funcionários", spec: "SPE-02" },
  { href: "/benefits", label: "Benefícios", spec: "SPE-06" },
];