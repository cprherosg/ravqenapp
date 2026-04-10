import { NextResponse } from "next/server";
import {
  getAuthCookieDomain,
  getAuthCookieNames,
  getLegacyAuthCookieNames,
} from "@/lib/supabase/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const loginUrl = new URL("/login", url.origin);
  const response = new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="0;url=${loginUrl.toString()}" />
    <title>Logging out...</title>
  </head>
  <body>
    <script>
      (function () {
        var names = ["ravqen-v2-access-token", "ravqen-v2-refresh-token", "ravqen-access-token", "ravqen-refresh-token"];
        var secure = window.location.protocol === "https:" ? "; Secure" : "";
        for (var i = 0; i < names.length; i += 1) {
          document.cookie = names[i] + "=; Path=/; Max-Age=0; SameSite=Lax" + secure;
        }
        window.location.replace(${JSON.stringify(loginUrl.toString())});
      })();
    </script>
  </body>
</html>`,
    {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
  const cookieNames = getAuthCookieNames();
  const legacyCookieNames = getLegacyAuthCookieNames();
  const cookieDomain = getAuthCookieDomain();

  const clearCookie = (name: string, domain?: string) => {
    response.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: url.protocol === "https:",
      path: "/",
      ...(domain ? { domain } : {}),
      maxAge: 0,
    });
  };

  for (const name of [
    cookieNames.access,
    cookieNames.refresh,
    legacyCookieNames.access,
    legacyCookieNames.refresh,
  ]) {
    clearCookie(name);

    if (cookieDomain) {
      clearCookie(name, cookieDomain);
    }
  }

  return response;
}
