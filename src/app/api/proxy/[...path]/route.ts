// BFF mínimo (research D3): túnel para a API FastAPI anexando a sessão
// httpOnly server-side (FR-005/FR-015). Não interpreta nem reescreve
// payloads de negócio — o contrato continua sendo o Swagger da FastAPI.
// Usado pelas próximas specs para interações client-side (SPE-02..07).

import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/features/auth/session";
import { refreshSession } from "@/features/auth/session/refresh";
import { ApiUnavailableError, ContractViolationError } from "@/features/auth/api/errors";

type Context = { params: Promise<{ path: string[] }> };

function stripHopHeaders(headers: Headers): Headers {
  const forwarded = new Headers();
  headers.forEach((value, key) => {
    if (["host", "cookie", "authorization", "content-length", "connection"].includes(key.toLowerCase())) return;
    forwarded.set(key, value);
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
    return NextResponse.json(
      { detail: "API_BASE_URL não configurada — endpoint de negócio indisponível no modo mock" },
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

  if (response.status === 401) {
    try {
      const renewed = await refreshSession();
      if (!renewed) {
        return NextResponse.json({ detail: "Sessão encerrada" }, { status: 401 }); // FR-007
      }
      response = await forward(request, suffix, search, renewed.accessToken, body);
    } catch (error) {
      return upstreamError(error);
    }
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
  });
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