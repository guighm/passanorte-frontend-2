// Sessão local do painel: exclusivamente cookies httpOnly gravados aqui
// (FR-005, Princípio III) — o JavaScript do navegador nunca lê o token.
// Gravação só é permitida em Route Handlers e Server Functions (doc
// cookies.md do Next 16); Server Components só leem.

import { cookies } from "next/headers";
import { io } from "next/cache";
import type { Operator, PanelSession, SessionState, SessionResponse } from "@/features/auth/types";
import { normalizeRole } from "@/features/auth/api";
import {
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE_SECONDS,
  SESSION_COOKIE,
} from "@/features/auth/session/constants";
import { readSessionCookie } from "@/features/auth/guards";

export { REFRESH_COOKIE, REFRESH_COOKIE_MAX_AGE_SECONDS, SESSION_COOKIE };

function baseCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

function encode(payload: PanelSession): string {
  return encodeURIComponent(JSON.stringify(payload));
}

/**
 * Estado da sessão: null (sem cookies), "active" (token vigente) ou
 * "expired" (token expirado mas refresh cookie presente — o fluxo de
 * renovação server-side pode salvá-la, US3; guardas deixam passar).
 */
export async function getSession(): Promise<SessionState | null> {
  // A checagem de expiração abaixo compara com Date.now(), que o
  // prerender com cacheComponents não aceita mesmo após cookies():
  // io() suspende aqui (exclui o trecho do shell estático) e resolve
  // imediatamente em requests reais, Server Functions e Route Handlers.
  await io();
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  // Parser único do cookie vive em guards (pure) — também usado pelo proxy
  // para não haver duas gramáticas de sessão no painel.
  const state = readSessionCookie(raw, store.get(REFRESH_COOKIE)?.value);
  if (!state) return null;
  return { status: state.status, session: state.session };
}

/**
 * Grava o par de cookies httpOnly a partir da resposta (200) de
 * login/refresh (T039/T043: SessionResponse confirmado, com rotação do
 * refreshToken — o novo token de renovação SUBSTITUI o anterior aqui).
 * Papel fora do enum confirmado ⇒ falha de sessão (edge case da spec).
 *
 * No login a identidade (`username`) vem do próprio formulário submetido —
 * o backend autenticou AQUELE username; no refresh ela vem da sessão
 * vigente e é revalidada por `/api/v1/auth/me` (T029).
 */
export async function setSession(
  response: SessionResponse,
  identity: { username: string; role?: string },
): Promise<PanelSession> {
  const role = normalizeRole(identity.role ?? response.role);
  if (role === null) {
    throw new Error("session-role-unrecognized");
  }
  const expiresAt = Date.now() + response.expiresIn * 1000;
  const operator: Operator = { username: identity.username, role };
  const panel: PanelSession = {
    operator,
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresAt,
  };
  const store = await cookies();
  store.set(SESSION_COOKIE, encode(panel), baseCookieOptions(response.expiresIn));
  store.set(REFRESH_COOKIE, response.refreshToken, baseCookieOptions(REFRESH_COOKIE_MAX_AGE_SECONDS));
  return panel;
}

/** Encerra a sessão local (logout ou renovação falha — FR-007). */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(REFRESH_COOKIE);
}

/**
 * T043 (2026-11-06): cookies de sessão para respostas construídas
 * manualmente (Route Handlers que montam `new NextResponse(...)`, como o
 * túnel BFF) — `cookies().set()` não é mesclado nesse caso; o caller
 * aplica cada um via `response.cookies.set(...)` para PERSISTIR o token
 * de renovação rotacionado (uso único no backend — janela de reuso ~2s).
 */
export function outgoingSessionCookies(panel: PanelSession): {
  name: string; value: string; options: ReturnType<typeof baseCookieOptions>;
}[] {
  const maxAge = Math.max(1, Math.round((panel.expiresAt - Date.now()) / 1000));
  return [
    { name: SESSION_COOKIE, value: encode(panel), options: baseCookieOptions(maxAge) },
    { name: REFRESH_COOKIE, value: panel.refreshToken, options: baseCookieOptions(REFRESH_COOKIE_MAX_AGE_SECONDS) },
  ];
}
