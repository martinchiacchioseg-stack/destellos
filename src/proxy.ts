import { NextResponse, type NextRequest } from "next/server";

const PROTEGIDAS = ["/trivia", "/ranking", "/admin", "/superadmin"];

/** Filtro liviano: sin cookie de sesión, las páginas privadas redirigen al ingreso. La validación real ocurre en cada API. */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const privada = pathname === "/" || PROTEGIDAS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (privada && !req.cookies.get("destellos_session")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/trivia/:path*", "/ranking/:path*", "/admin/:path*", "/superadmin/:path*"],
};
