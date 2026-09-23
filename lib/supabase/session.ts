import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requireEnv } from "@/lib/env";

const LOGIN_PATH = "/super-admin/login";

/**
 * How long a sign-in lasts before we make them do it again.
 *
 * Supabase can enforce this natively ("Time-box user sessions"), but that is a
 * Pro-plan feature, and on the free plan refresh tokens never expire — a
 * session would otherwise last forever. So we cap it here instead.
 */
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Cookies Supabase asks us to write. They have to be replayed onto whatever
  // response we finally return, including redirects — otherwise a refreshed
  // (or cleared) token is silently dropped.
  const pendingCookies: {
    name: string;
    value: string;
    options?: Record<string, unknown>;
  }[] = [];

  const supabase = createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          pendingCookies.push(...cookiesToSet);
        },
      },
    },
  );

  function redirectTo(pathname: string, search = "") {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = search;
    const redirect = NextResponse.redirect(url);
    for (const { name, value, options } of pendingCookies) {
      redirect.cookies.set(name, value, options);
    }
    return redirect;
  }

  // getUser() revalidates against Supabase. getSession() would only decode the
  // cookie, which the browser could have tampered with.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const onLoginPage = path === LOGIN_PATH;

  // Expire the session 7 days after the last real sign-in. last_sign_in_at is
  // the right anchor because a token refresh does not move it — the JWT's own
  // iat would reset every hour and never age out.
  if (user?.last_sign_in_at) {
    const age = Date.now() - Date.parse(user.last_sign_in_at);
    if (Number.isFinite(age) && age > SESSION_MAX_AGE_MS) {
      await supabase.auth.signOut();
      return redirectTo(LOGIN_PATH, "?expired=1");
    }
  }

  if (!user && !onLoginPage) {
    const search =
      path === "/super-admin"
        ? ""
        : `?next=${encodeURIComponent(path)}`;
    return redirectTo(LOGIN_PATH, search);
  }

  if (user && onLoginPage) {
    return redirectTo("/super-admin");
  }

  return response;
}
