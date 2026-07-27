import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decryptSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await decryptSession(token);

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // api/cron fica de fora: autentica via CRON_SECRET (ver route.ts), não por
  // sessão de login — o Vercel Cron não tem cookie de sessão.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/cron).*)"],
};
