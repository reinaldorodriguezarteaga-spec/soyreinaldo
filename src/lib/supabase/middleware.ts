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

export async function updateSession(request: NextRequest) {
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
