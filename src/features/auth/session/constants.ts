// Nomes/opções de cookie compartilhados: importados tanto pelo módulo de
// sessão (next/headers) quanto pelo proxy (request.cookies) — por isso
// vivem num módulo PURE sem runtime do Next (contracts/panel-session.md).

export const SESSION_COOKIE = "passanorte.session";
export const REFRESH_COOKIE = "passanorte.refresh";

/**
 * Vigência máxima do cookie de renovação. A janela real de renovação é
 * definida pelo backend (RNF09); este teto local evita um refresh cookie
 * eterno enquanto o contrato não publica a validade do refresh_token.
 */
export const REFRESH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 3600;