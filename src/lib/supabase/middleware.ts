import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/quiniela"];

// Excepciones bajo prefijos protegidos: páginas informativas que no
// requieren login (la gente debe poder leer las reglas antes de registrarse).
const PUBLIC_EXCEPTIONS = ["/quiniela/puntos"];

const PENDING_INVITE_COOKIE = "pending_invite";
// El código solo puede sobrevivir 30 min — suficiente para completar email
// confirmation o un flow OAuth, pero no eternamente.
const PENDING_INVITE_MAX_AGE = 60 * 30;
const INVITE_CODE_RE = /^[A-Z0-9_-]{1,32}$/;

// Los códigos PKCE de GoTrue son UUIDs.
const AUTH_CODE_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function updateSession(request: NextRequest) {
  // GoTrue valida el redirect_to contra su allow-list; si no pasa, cae al
  // Site URL (la raíz) y el usuario aterriza en /?code=... donde nadie canjea
  // el código → no se crea la sesión (Google "no funciona"). Reenviamos el
  // código a /auth/callback, que hace el exchange. Conservamos el resto de
  // query params por si GoTrue algún día respeta el ?redirect=.
  {
    const authCode = request.nextUrl.searchParams.get("code");
    if (
      authCode &&
      AUTH_CODE_RE.test(authCode) &&
      request.nextUrl.pathname !== "/auth/callback"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/callback";
      return NextResponse.redirect(url);
    }
    // Idem para errores de GoTrue (enlace caducado, etc.) que caen en la raíz.
    if (
      request.nextUrl.pathname === "/" &&
      request.nextUrl.searchParams.has("error") &&
      request.nextUrl.searchParams.has("error_description")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/callback";
      return NextResponse.redirect(url);
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Cuando alguien aterriza en /unirse/CODE guardamos el código en cookie
  // para que sobreviva al flow de signup/login (Supabase a veces se come el
  // ?redirect=... en la confirmación por email u OAuth).
  const inviteMatch = pathname.match(/^\/unirse\/([^/]+)/);
  if (inviteMatch) {
    const code = decodeURIComponent(inviteMatch[1]).toUpperCase();
    if (INVITE_CODE_RE.test(code)) {
      supabaseResponse.cookies.set(PENDING_INVITE_COOKIE, code, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: PENDING_INVITE_MAX_AGE,
        path: "/",
      });
    }
  }

  // Si llegan a /quiniela con una invitación pendiente, los mandamos a la
  // página de confirmación con el código ya cargado. El acceptInvite final
  // limpia la cookie.
  if (user && pathname === "/quiniela") {
    const pendingCode = request.cookies.get(PENDING_INVITE_COOKIE)?.value;
    if (pendingCode && INVITE_CODE_RE.test(pendingCode)) {
      const url = request.nextUrl.clone();
      url.pathname = `/unirse/${pendingCode}`;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  const isProtected =
    PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) &&
    !PUBLIC_EXCEPTIONS.includes(pathname);

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
