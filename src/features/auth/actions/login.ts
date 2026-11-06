"use server"

// Server Action de login (US1, RF02, FR-002/FR-003/FR-004).
// Credenciais vão EXCLUSIVAMENTE à API (Princípio II/FR-002) — nada de
// validação local além de campos vazios (checagem de campo vazio é UX do
// formulário, não decisão de negócio: credenciais são sempre da API).
//
// T042 (FR-011, clarificação 2026-11-06): lembrado pelo guarda de rota, o
// destino pretendido (`next`) é devolvido após o login, CLAMPADO ao papel
// via roleCanAccess — funcionário que tentou /admin/* cai em /benefits.

import { redirect } from "next/navigation";
import { login as apiLogin } from "@/features/auth/api";
import {
  ApiUnavailableError,
  AuthInvalidCredentialsError,
  ContractViolationError,
} from "@/features/auth/api/errors";
import { setSession } from "@/features/auth/session";
import { homePathForRole, roleCanAccess } from "@/features/auth/guards";

export interface LoginState {
  error?: string;
}

const FIELD_EMPTY = "Informe usuário e senha.";
const INVALID = "Credenciais inválidas. Verifique o usuário e a senha.";
const UNAVAILABLE = "Não foi possível falar com o servidor. Tente novamente.";
const DIVERGENT = "Resposta inesperada do serviço de autenticação. Operação registrada.";

/**
 * Destino pós-login seguro: só URL interna do painel (`/...`), sempre
 * clampada ao papel (FR-011); destino sem permissão ⇒ área inicial do
 * papel. Nunca URL externa (open redirect).
 */
function clampDestination(next: string | null, role: "admin" | "employee"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return homePathForRole(role);
  }
  return roleCanAccess(next, role) ? next : homePathForRole(role);
}

export async function loginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  if (!username || !password) {
    return { error: FIELD_EMPTY };
  }

  let target: string | null = null;
  try {
    const response = await apiLogin(username, password);
    // A sessão gravada usa o username submetido (o backend autenticou
    // aquele operador); /auth/me revalida identidade no próximo uso (T029).
    await setSession(response, { username, role: response.role });
    target = clampDestination(next || null, response.role as "admin" | "employee");
  } catch (error) {
    // Mensagens acionáveis, sem revelar detalhes técnicos (US1 cenários 3/4)
    if (error instanceof AuthInvalidCredentialsError) return { error: INVALID };
    if (error instanceof ApiUnavailableError) return { error: UNAVAILABLE };
    if (error instanceof ContractViolationError) {
      console.error("[contract-divergence] /api/v1/auth/login:", error.message);
      return { error: DIVERGENT };
    }
    console.error("[auth] login: erro inesperado", error);
    return { error: UNAVAILABLE };
  }

  // redirect() fora do try — nunca engolido por catch (FR-004)
  if (!target) return { error: UNAVAILABLE };
  redirect(target);
}
