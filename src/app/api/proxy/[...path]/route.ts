// BFF mínimo (research D3): túnel para a API FastAPI anexando a sessão
// httpOnly server-side (FR-005/FR-015). Não interpreta nem reescreve
// payloads de negócio — o contrato continua sendo o Swagger da FastAPI.
// Usado pelas próximas specs para interações client-side (SPE-02..07).

import { NextResponse, type NextRequest } from "next/server";
import { getSession, outgoingSessionCookies } from "@/features/auth/session";
import { refreshSession } from "@/features/auth/session/refresh";
import { ApiUnavailableError, ContractViolationError } from "@/features/auth/api/errors";

type Context = { params: Promise<{ path: string[] }> };

// FIX (SPE-02, bug reportado): o retorno anterior era uma instância de
// `Headers`, e o uso `{ ...stripHopHeaders(...) }` no forward spreadea
// TODOS os cabeçalhos fora (spread de Headers ⇒ {}) — o upstream recebia
// POST sem `Content-Type` e a validação do FastAPI falhava com
// "Input should be a valid dictionary or object to extract fields from".
// Devolvemos um objeto simples construído por iteração (Princípio II —
// o túnel segue apenas TRANSPORTANDO headers úteis, stripando hop-bys).
function stripHopHeaders(headers: Headers): Record<string, string> {
  const forwarded: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (["host", "cookie", "authorization", "content-length", "connection"].includes(key.toLowerCase())) return;
    forwarded[key] = value;
  });
  return forwarded;
}

async function forward(
  request: NextRequest,
  suffix: string,
  search: string,
  accessToken: string,
  body?: ArrayBuffer,
): Promise<Response> {
  return fetch(`${process.env.API_BASE_URL}/${suffix}${search}`, {
    method: request.method,
    headers: { ...stripHopHeaders(request.headers), Authorization: `Bearer ${accessToken}` },
    body,
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
}

/** Túnel com renovação única em 401 + replay (mesma política de FR-015/US3). */
export async function handler(request: NextRequest, context: Context): Promise<NextResponse> {
  if (!process.env.API_BASE_URL) {
    // T046: modo mock removido — a API é o único caminho de dados (Princípio I).
    return NextResponse.json(
      { detail: "API_BASE_URL não configurada — serviço indisponível" },
      { status: 503 },
    );
  }

  const { path } = await context.params;
  const suffix = (path ?? []).join("/");
  const search = request.nextUrl.search;
  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const state = await getSession();
  if (!state) {
    return NextResponse.json({ detail: "Sessão encerrada" }, { status: 401 });
  }

  // T036: falha de upstream nunca vira 500 estruturado pelo Next — responde
  // JSON limpo conforme os desfechos do contrato (Princípio V).
  let response: Response;
  try {
    response = await forward(request, suffix, search, state.session.accessToken, body);
  } catch (error) {
    return upstreamError(error);
  }

  let renewedAfter401: Awaited<ReturnType<typeof refreshSession>> = null; // T043
  if (response.status === 401) {
    try {
      const renewed = await refreshSession();
      if (!renewed) {
        return NextResponse.json({ detail: "Sessão encerrada" }, { status: 401 }); // FR-007
      }
      renewedAfter401 = renewed;
      response = await forward(request, suffix, search, renewed.accessToken, body);
    } catch (error) {
      return upstreamError(error);
    }
  }

  const result = new NextResponse(response.body, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
  });
  // T043: persistir o par renovado (rotação single-use) na resposta —
  // `cookies().set()` dentro de refreshSession não é mesclado em
  // NextResponse construído manualmente.
  if (renewedAfter401) {
    for (const cookie of outgoingSessionCookies(renewedAfter401)) {
      result.cookies.set(cookie.name, cookie.value, cookie.options);
    }
  }
  return result;
}

function upstreamError(error: unknown): NextResponse {
  if (error instanceof ContractViolationError) {
    return NextResponse.json({ detail: error.message }, { status: 502 }); // divergência explícita (Princípio I)
  }
  if (error instanceof ApiUnavailableError) {
    return NextResponse.json({ detail: error.message }, { status: 503 });
  }
  return NextResponse.json(
    { detail: "Falha inesperada na comunicação com o serviço" },
    { status: 502 },
  );
}

export async function GET(request: NextRequest, context: Context) {
  return handler(request, context);
}
export async function POST(request: NextRequest, context: Context) {
  return handler(request, context);
}
export async function PUT(request: NextRequest, context: Context) {
  return handler(request, context);
}
export async function PATCH(request: NextRequest, context: Context) {
  return handler(request, context);
}
export async function DELETE(request: NextRequest, context: Context) {
  return handler(request, context);
}