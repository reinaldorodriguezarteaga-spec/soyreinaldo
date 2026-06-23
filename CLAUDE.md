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
