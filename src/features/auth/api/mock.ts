// MOCK (temporary): remove when /auth/* is live
// Fixtures server-side dos 4 endpoints de contracts/auth-api.md, usadas
// APENAS quando API_BASE_URL não está definida (research.md D6, clarificação
// Q2 da SPE-01). Nenhuma tela sabe se está em mock; a camada api/index.ts é
// a única que decide.

import type {
  LoginResponse,
  Operator,
  Role,
} from "@/features/auth/types1";

// T038: env malformado (ex.: "10d") não pode virar NaN — tokens fixtures
// sempre expirados quebrariam o cenário C3 silenciosamente.
const RAW_TTL = Number(process.env.MOCK_SESSION_TTL_SECONDS ?? 3600);
const TTL_SECONDS = Number.isFinite(RAW_TTL) && RAW_TTL > 0 ? RAW_TTL : 3600;

// Papéis fixados nos fixtures (dados do backend, não da cidade — RNF06).
const FIXTURE_USERS = [
  { username: "admin", password: "admin", name: "Amazônia Admin", role: "administrador" },
  { username: "funcionario", password: "funcionario", name: "Fátima Funcionária", role: "funcionario" },
] as const;

/** Tokens fixtures opacos: `mock:v1:<username>:<exp-epoch-s>`. */
export function forgeToken(username: string, iatSeconds: number, ttlSeconds: number): string {
  return `mock:v1:${username}:${iatSeconds + ttlSeconds}`;
}

function isMockToken(token: string): boolean {
  return token.startsWith("mock:v1:");
}

function tokenExpirySeconds(token: string): number {
  if (!isMockToken(token)) return 0;
  const part = Number(token.split(":")[3]);
  return Number.isFinite(part) ? part : 0;
}

/** Estado de refresh tokens emitidos — sobrevive entre requisições no processo dev. */
const issuedRefreshTokens = new Set<string>();

function toLoginResponse(username: string, nowSeconds: number): LoginResponse {
  const fixture = FIXTURE_USERS.find((u) => u.username === username);
  const user: Operator = {
    id: `mock-${fixture!.username}`,
    username: fixture!.username,
    name: fixture!.name,
    role: fixture!.role as Role,
  };
  const refreshToken = `mock-refresh:v1:${username}:${nowSeconds + 7 * 24 * 3600}`;
  issuedRefreshTokens.add(refreshToken);
  return {
    access_token: forgeToken(username, nowSeconds, TTL_SECONDS),
    refresh_token: refreshToken,
    token_type: "bearer",
    expires_in: TTL_SECONDS,
    user,
  };
}

export function mockLogin(username: string, password: string): LoginResponse {
  const fixture = FIXTURE_USERS.find((u) => u.username === username && u.password === password);
  if (!fixture) {
    const error = new Error("Mock fixture: credenciais não reconhecidas");
    error.name = "MockInvalidCredentials";
    throw error;
  }
  return toLoginResponse(username, Math.floor(Date.now() / 1000));
}

/** 200 com nova sessão, ou null quando o refresh token não é válido (401). */
export function mockRefresh(refreshToken: string): LoginResponse | null {
  if (!refreshToken.startsWith("mock-refresh:v1:")) return null;
  if (!issuedRefreshTokens.has(refreshToken)) return null;
  const exp = Number(refreshToken.split(":")[3]);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
  const username = refreshToken.split(":")[2];
  issuedRefreshTokens.delete(refreshToken);
  return toLoginResponse(username, Math.floor(Date.now() / 1000));
}

export function mockLogout(accessToken: string): void {
  // 204 fixtule: sem efeito além do descrito pelo contrato.
  if (!isMockToken(accessToken)) {
    const error = new Error("Token fixture inválido: use o token do login mock");
    error.name = "MockInvalidCredentials";
    throw error;
  }
}

export function mockMe(accessToken: string): Operator | null {
  if (!isMockToken(accessToken)) return null;
  if (tokenExpirySeconds(accessToken) * 1000 <= Date.now()) return null;
  // Token fixture carrega o USERNAME (T035): `mock:v1:<username>:<exp>`
  const username = accessToken.split(":")[2];
  const fixture = FIXTURE_USERS.find((u) => u.username === username);
  if (!fixture) return null;
  return {
    id: `mock-${fixture.username}`,
    username: fixture.username,
    name: fixture.name,
    role: fixture.role as Role,
  };
}