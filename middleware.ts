import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/portal/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const { supabaseResponse, user } = await updateSession(request);

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith("/portal") ? "/portal/login" : "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/portal/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/portal";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png|brand|fonts|.*\\.(?:png|jpg|jpeg|svg|ico|webp|otf|woff|woff2)$).*)"],
};
