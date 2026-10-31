// Sessão local do painel: exclusivamente cookies httpOnly gravados aqui
// (FR-005, Princípio III) — o JavaScript do navegador nunca lê o token.
// Próximo passo documentado: gravação só é permitida em Route Handlers e
// Server Functions (doc cookies.md do Next 16); Server Components só leem.

import { cookies } from "next/headers";
import { io } from "next/cache";
import type { PanelSession, SessionState } from "@/features/auth/types1";
import type { LoginResponse } from "@/features/auth/types1";
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

/** Grava o par de cookies httpOnly a partir da resposta (200) de login/refresh e devolve a sessão gravada. */
export async function setSession(response: Omit<LoginResponse, "token_type">): Promise<PanelSession> {
  const expiresAt = Date.now() + response.expires_in * 1000;
  const panel: PanelSession = {
    operator: response.user,
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt,
  };
  const store = await cookies();
  store.set(SESSION_COOKIE, encode(panel), baseCookieOptions(response.expires_in));
  store.set(REFRESH_COOKIE, response.refresh_token, baseCookieOptions(REFRESH_COOKIE_MAX_AGE_SECONDS));
  return panel;
}

/** Encerra a sessão local (logout ou renovação falha — FR-007). */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(REFRESH_COOKIE);
}