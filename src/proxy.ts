// Guardas de rota do painel (US2, FR-010/FR-011).
// Convenção do Next 16: `proxy.ts` (o `middleware.ts` é DEPRECATED e
// renomeado — docs/03-api-reference/03-file-conventions/proxy.md).
// Executa antes da renderização: sem flash de conteúdo protegido (SC-002).
// RBAC de superfície somente (Princípio II): o papel vem da sessão
// httpOnly lida server-side; a autorização real é do backend.

import { NextResponse, type NextRequest } from "next/server";
import {
  homePathForRole,
  readSessionCookie,
  roleCanAccess,
} from "@/features/auth/guards";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/features/auth/session/constants";

export function proxy(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/login") {
    // com sessão navegável, não reexibir login (T014): vai à área do papel
    const state = readSessionCookie(
      request.cookies.get(SESSION_COOKIE)?.value,
      request.cookies.get(REFRESH_COOKIE)?.value,
    );
    if (state) {
      return NextResponse.redirect(new URL(homePathForRole(state.session.operator.role), request.url));
    }
    return NextResponse.next();
  }

  const state = readSessionCookie(
    request.cookies.get(SESSION_COOKIE)?.value,
    request.cookies.get(REFRESH_COOKIE)?.value,
  );
  if (!state) {
    // sem sessão navegável: rota protegida /login com limpeza de cookies
    // residuais — o destino pretendido é lembrado via `?next=` (FR-011/T042
    // — clarificação 2026-11-06); o login devolve ao destino clampado ao papel.
    const response = NextResponse.redirect(
      new URL(urlWithNext("/login", request.nextUrl, pathname + request.nextUrl.search)),
    );
    response.cookies.delete(SESSION_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }

  const role = state.session.operator.role;
  if (!roleCanAccess(pathname, role)) {
    // rota bloqueada para o papel ⇒ redireciona à área permitida, sem render
    // (FR-010). O destino tentado permanece em `next`: re-login com outro
    // papel é clampado ao papel (FR-011/T042).
    return NextResponse.redirect(
      new URL(urlWithNext(homePathForRole(role), request.nextUrl, pathname)),
    );
  }
  return NextResponse.next();
}

/** Redirect que preserva o destino pretendido em `?next=` (FR-011/T042). */
function urlWithNext(base: string, from: URL, nextPath: string): string {
  const to = new URL(base, from);
  to.searchParams.set("next", nextPath);
  return to.toString();
}

export const config = {
  // Exclude BFF and static assets (route.ts handles itself)
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico).*)"],
};