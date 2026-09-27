import { NextResponse, type NextRequest } from "next/server";

// Dev only: on plain localhost the admin would see the customer app's session
// cookie (cookies ignore ports), so always move to admin.localhost. Reads the
// Host header because nextUrl reports the dev server's own hostname.
export function proxy(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  if (process.env.NODE_ENV !== "development" || !/^localhost(:\d+)?$/.test(host)) {
    return NextResponse.next();
  }
  const { pathname, search } = req.nextUrl;
  return NextResponse.redirect(`http://admin.${host}${pathname}${search}`);
}

export const config = {
  matcher: "/((?!_next/|favicon.ico).*)",
};
