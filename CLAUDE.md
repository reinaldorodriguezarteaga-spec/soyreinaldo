@AGENTS.md

# Memoria del proyecto — soyreinaldo.com

Web personal de **Reinaldo Rodríguez (@SoyReinaldoR)**, creador de contenido
culé (FC Barcelona). Combina marca personal, una **quiniela del Mundial 2026**,
marcadores de fútbol en vivo, asesorías 1:1 de pago, donaciones y un media kit.

Este archivo es la memoria de arranque: léelo entero antes de tocar nada. Está
pensado para retomar el trabajo desde cualquier PC (incluida "claude win").

## Stack

- **Next.js 16.2.4** (App Router) + **React 19.2.4** + TypeScript.
  ⚠️ Esta versión de Next tiene breaking changes: lee `node_modules/next/dist/docs/`
  antes de escribir código (ver `AGENTS.md`).
- **Tailwind CSS v4** (vía `@tailwindcss/postcss`). Estilos globales en
  `src/app/globals.css`; mucha UI usa clases propias (`.hero`, `.card`, …).
- **Supabase** (Postgres + Auth + RLS) — `@supabase/ssr` y `@supabase/supabase-js`.
- **Stripe** (`stripe` v22) — donaciones y asesorías.
- **Resend** (`resend` v6) — emails (recordatorios, SMTP de Supabase).
- **Leaflet** / `react-leaflet` — mapa de estadios.
- **API-Football** (api-sports.io v3) — fixtures, marcadores en vivo, estadísticas.
- Hospedaje: **Vercel** (plan gratuito → cuidado con CPU; ver "Notas de coste").
- Fuentes Google: Saira Condensed, Archivo, Space Mono.

## Comandos

```bash
npm run dev      # desarrollo (localhost:3000)
npm run build    # build producción
npm run start    # servir build
npm run lint     # eslint

# SQL contra Supabase (lee DATABASE_URL de .env.local, usa Session Pooler):
node scripts/db.mjs file supabase/migrations/0XX-...sql
node scripts/db.mjs query "SELECT ..."
```

## Variables de entorno

Copiar `.env.local.example` → `.env.local`. Variables usadas en el código:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — cliente Supabase.
- `NEXT_PUBLIC_SITE_URL` — base para magic-links/redirects (`https://soyreinaldo.com` en prod).
- `SUPABASE_SERVICE_ROLE_KEY` — **secreto**; cron de recordatorios y operaciones admin.
- `DATABASE_URL` — Postgres directo (Session Pooler) para `scripts/db.mjs`.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` — Stripe (test en dev, LIVE en prod).
- `STRIPE_WEBHOOK_SECRET` — verificación del webhook de Stripe.
- `STRIPE_ASESORIA_PRICE_ID` — price de la asesoría 1:1.
- `RESEND_API_KEY` — envío de emails.
- `CRON_SECRET` — header que Vercel manda al cron de recordatorios.
- `API_FOOTBALL_KEY` — **secreto**, solo server-side; key de api-sports.io.
  (Ojo: no está en `.env.local.example`, añadirla a mano.)

## Estructura

```
src/app/            # rutas (App Router)
  api/              # route handlers (ver abajo)
  admin/            # panel admin (ligas, partidos, resultado-final, seguidores)
  quiniela/         # quiniela: grupos, bracket, picks, puntos, ranking, jugador
  mundial/          # hub Mundial 2026 + detalle de partido en vivo
  asesorias/        # landing + agendar (tras pago Stripe)
  ...               # login, signup, perfil, redes, camisetas, estadios, media-kit,
                    # contacto, privacidad, bot, donaciones/*, eliminar-datos, etc.
src/components/     # Header, Footer, MatchWidget, StadiumMap, DonationBlock, ...
src/lib/
  supabase/         # client.ts, server.ts, middleware.ts
  sports/           # api-football.ts, live-standings.ts, widget-data.ts
  quiniela/         # phases.ts, bracket-layout.ts, venues.ts, reminder-email.ts
  stripe/server.ts
  social-stats.ts
src/data/stadiums.ts
supabase/           # schema.sql, quiniela.sql, donations.sql, seed-mundial-2026.sql,
                    # migrations/001..024
scripts/            # db.mjs, backfill-fixture-ids.mjs, generate-mundial-seed.mjs
docs/               # asesorias-cuestionario.md (borrador cuestionario pre-asesoría)
public/branding/    # retrato, avatar, camisetas, etc.
```

### Rutas API (`src/app/api/*/route.ts`)
- `sports/widget` — datos del marcador de portada (`MatchWidget`).
- `sports/ingest` — ingesta de fixtures de API-Football.
- `sports/match-events` — eventos (goles, tarjetas) por partido.
- `sports/player` — ficha/estadísticas de jugador.
- `donations/checkout` — crea sesión de Stripe Checkout para donar.
- `asesorias/checkout` — Stripe Checkout para la asesoría 1:1.
- `stripe/webhook` — recibe eventos de Stripe (verifica `STRIPE_WEBHOOK_SECRET`).
- `cron/reminders` — cron diario (Vercel, **21:00 UTC**, ver `vercel.json`); manda
  emails de recordatorio vía Resend. Protegido por `CRON_SECRET`.
- `health` — healthcheck.

## Base de datos (Supabase / Postgres)

Orden de aplicación: `schema.sql` → `quiniela.sql` → `donations.sql` → `migrations/001..024`.
Tablas principales:
- `profiles` (trigger `handle_new_user` al registrarse), con username y phone.
- `leagues`, `league_members` (RLS; `join_league_by_code()`, `normalize_league_code()`).
- `teams`, `matches` (enum `match_phase`), `predictions`, `user_picks`,
  `pichichi_candidates`, `tournament_results`.
- `donations`, y tabla de consultas/asesorías (migración 018).
- Helpers SQL: `is_admin()`, `tournament_started()`.
- Migraciones notables: RLS de miembros, ajustes de puntos, picks libres,
  leaderboard, bracket resolution, recordatorios, estado en vivo de partidos,
  hardening de pagos, bloqueo de predicciones (30 min antes), tercer lugar = 3 pts.

⚠️ RLS activo en casi todo. Para correr SQL usa `scripts/db.mjs`. Migraciones
nuevas: numéralas siguiendo la serie (`025-...sql`) y aplícalas con `db.mjs file`.

## Dominios funcionales clave

- **Quiniela Mundial 2026**: ligas privadas (código de invitación `/unirse/[code]`),
  predicciones por partido, picks extra (pichichi, etc.), puntos y ranking por liga.
  Las predicciones se **bloquean 30 min antes** del partido (migración 024).
- **Mundial / marcadores en vivo**: `/mundial` y `/mundial/partido/[id]` con
  auto-refresco. Datos de API-Football cacheados con `next.revalidate` para no
  quemar quota. Constantes en `src/lib/sports/api-football.ts`
  (`WORLD_CUP`: leagueId 1, season 2026, 11 jun–19 jul 2026; Barça=529, Madrid=541).
- **Asesorías 1:1**: pago Stripe → acceso a `/asesorias/agendar`. Cuestionario
  pre-asesoría en `docs/asesorias-cuestionario.md` (aún borrador, no implementado).
- **Donaciones**: "invítame a un café" vía Stripe Checkout (`DonationBlock`).
- **Redes / Media kit / Camisetas**: marca personal; código de descuento `REY15`.
- **Admin**: gestiona ligas, resultados de partidos, resultado final del torneo y
  estadísticas de seguidores (alimentan `getSocialStats()` de la portada).

## Convenciones

- Idioma del producto y de los commits: **español**.
- Server Components por defecto; Stripe/Supabase service-role/API-Football solo
  server-side — nunca exponer secretos al cliente.
- `next.config.ts`: redirect permanente `/laliga → /mundial` (LaLiga se reconvirtió
  en el hub del Mundial).
- Auth por Supabase (magic link / OAuth); middleware en `src/lib/supabase/middleware.ts`.

## Notas de coste (Vercel plan gratis)

Hay commits recientes que **suben intervalos de refresco en vivo** y evitan
llamadas extra para reducir CPU. Al tocar refresco en vivo o ingestas, mantén
los intervalos altos y reutiliza caché; no reintroduzcas polling agresivo.

## Despliegue

- Push a la rama → PR → merge a `main` → Vercel despliega.
- Cron de recordatorios configurado en `vercel.json`.
- Rama de trabajo actual del agente: `claude/youthful-babbage-u80jvw`.
- Flujo de trabajo del agente: rama → PR **draft** → esperar preview de Vercel →
  el usuario dice "merge" → squash-merge a `main`. Los PR se mergean con **squash**,
  así que al seguir trabajando hay que **rebasar la rama sobre `origin/main`**
  (`git rebase --onto origin/main <prev-head>`) para no arrastrar commits ya
  mergeados y evitar conflictos.

---

# Bitácora — sesión julio 2026 (features + incidente de quota)

## Features añadidas esta sesión (todas en prod)

- **Ranking de liga con pestañas** (`/quiniela/ranking/[liga]`, `?vista=`):
  - **Clasificación** (tabla de siempre).
  - **👀 Selecciones** (`?vista=selecciones`, `selecciones.tsx`): por cada partido
    en vivo/jugado, el pick de **cada miembro** + puntos provisionales. Cada partido
    es **desplegable** (`<details>`; abiertos los en vivo). Auto-refresco con
    `LiveRefresher`. RLS: solo se ven picks de partidos ya empezados.
  - **📋 Mis predicciones** (`?vista=mias`, `mis-predicciones.tsx`): lista personal,
    **solo partidos jugados/en vivo**, del más reciente al más antiguo, con puntos.
- **Detalle de partido con pestañas** (`/mundial/partido/[id]`, `match-tabs.tsx`):
  **Estadísticas** + **Cara a cara** (H2H). H2H vía `getHeadToHead` (API `/fixtures/headtohead`,
  caché 1 día) servido bajo demanda por `/api/sports/h2h`. Falta **Noticias**
  (acordado: Google News RSS, gratis) — pendiente.
- **Ficha de equipo** (`/mundial/equipo/[id]`, `getTeamFixtures`): historial de
  partidos. Los equipos son **tappables** desde el detalle, grupos, tablas de stats,
  próximos, etc.
- **Cuenta atrás** en partidos por jugarse (`countdown.tsx`): al tocar el partido
  (portada, Próximos, Marcador en vivo) se abre el detalle con temporizador.
- **Botón físico "← Atrás"** global (`BackButton.tsx`, sticky bajo el header, en
  todas las páginas menos `/`) + botón **"🏆 Quiniela"** al lado en páginas de
  quiniela/mundial.
- **Gestos táctiles** (`Gestures.tsx`, montado en `layout.tsx`): en dispositivos
  táctiles (`pointer: coarse`) — deslizar borde izq→der = atrás, der→izq = adelante,
  tirar hacia abajo arriba del todo = recargar. En navegador el gesto del borde lo
  intercepta el nativo; dentro de la app instalada actúa el nuestro.

## Marcadores en vivo — cómo funciona (importante)

- La **quiniela** (Selecciones/Mis predicciones) lee marcador/estado de la tabla
  `matches` de Supabase (NO de API-Football directo). Esa tabla la actualiza la
  ingesta.
- **Ingesta** (`/api/sports/ingest`): la dispara un **cron EXTERNO (cron-job.org)**
  cada minuto con `Authorization: Bearer CRON_SECRET` (NO está en `vercel.json`).
  Selecciona partidos con la RPC `matches_pending_ingest` (requiere
  `api_football_fixture_id IS NOT NULL` y ventana de tiempo). Hace 1 llamada a
  API-Football por tick (`/fixtures?ids=...`, `no-store`).
- ⚠️ **Los partidos de eliminatoria nacen SIN `api_football_fixture_id`** (eran
  placeholders hasta resolver el bracket). Sin ese id, la ingesta NO los ve → sin
  marcador en vivo ni registro del resultado. La ingesta ahora **se auto-repara**
  (`backfillMissingFixtureIds`): busca partidos con equipos asignados pero sin id
  (ventana [-6h,+26h]) y lo rellena casando por hora/equipo local contra
  `/fixtures?league=1&season=2026` (misma lógica que `scripts/backfill-fixture-ids.mjs`).
  Si un cruce futuro se queda sin datos en vivo, revisar esto primero.

## Incidente de quota API-Football (5 jul 2026) — LEER

- **Qué pasó:** la web se quedó **sin datos del Mundial** (todo vacío) porque
  API-Football llegó al **Plan Limit** (~7.500 del plan Pro). El tráfico web era
  bajo y **no había bot** en las páginas nuevas (verificado en logs de Vercel), así
  que fue **consumo acumulado del torneo**, no un bug ni ataque.
- **Solución del usuario:** subió a **plan Ultra (75.000/día)**. Resuelto.
- **Fallback a BD** (`wc-fallback.ts` + `mundial-fallback.tsx`): si API-Football
  devuelve TODO vacío, `/mundial` muestra calendario/resultados/grupos desde la BD
  (con banderas, sin escudos ni stats en vivo) en vez de quedarse en blanco. Se
  activa solo cuando la API falla.
- **Instrumentación** (`api-football.ts` `get()` y el backfill de la ingesta):
  cada llamada loguea `[apif] <endpoint> status=<n> remaining=<quota>` en los
  runtime logs de Vercel. Para investigar consumo: **Vercel → Runtime Logs →
  buscar `[apif]`**.
- **PISTA abierta (por confirmar):** en la 1ª lectura de logs, la **portada `/`**
  hace 2 llamadas a API-Football por hit (`/fixtures?...from-to` y `?next=6`, vía
  `getWidgetData`/MatchWidget) y `remaining` **baja en cada hit** → esas llamadas
  **NO parecen cachearse** como deberían. Además hay **peticiones `HEAD /`** (bots/
  monitores) que también las disparan. Sospecha: un bot/monitor pegando a `/` quema
  quota. **Pendiente:** confirmar por qué no cachea `getWorldCupFixturesWindow`
  (revalidate 60) en la portada y, si procede, cachear/gating de bots.
- **Seguimiento acordado:** revisar `[apif]` a las ~2h y **mañana 10:00** para ver
  si a la franja del pico de ayer (≈04-06h) se repite. (Los recordatorios por cron
  son solo de esta sesión; si se pierde la sesión, retomar esto manualmente.)

## Operaciones manuales en BD hechas esta sesión (para el registro)

- Metí a Conos (`CONOS2026`, id `95641710-...`) a 8 usuarios que habían pronosticado
  sin unirse a ninguna liga (huérfanos): freibyse, pedromagirena, andreslameda12,
  odnamra1, manuelbideau95, josesitobaut2007, leimanazael1991, unitedjairo29.
  **Causa raíz sin arreglar:** la app deja pronosticar sin liga → quedan huérfanos.
- **Marcos87** (`garciamarcos3087@gmail.com`) → metido a **Intentos de Padel**
  (`4a2ceaef-...`). Tenía cuenta duplicada `marcos87garcia87@gmail.com` ("Marcos"):
  **dupliqué todo** (predicciones+picks+ligas) al de Marcos87 y **borré** la antigua.
- `ransesd24` → inserté a mano su pick Canadá 1–Marruecos 2 (partido 90) saltando el
  bloqueo de 30 min (por service-role).
- Backfill manual de `api_football_fixture_id` de los 8 octavos (ids 89–96).
