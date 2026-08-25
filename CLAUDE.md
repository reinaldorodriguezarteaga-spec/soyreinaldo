@AGENTS.md

# soyreinaldo.com

Web de **Reinaldo Rodríguez (@SoyReinaldoR)**, creador de contenido culé.
App de fútbol multi-liga (estilo FotMob): marcadores en vivo, calendario,
clasificaciones y fichas de 10 competiciones, más quiniela, análisis propios,
asesorías de pago y donaciones.

> **El historial (incidentes, decisiones, estado de cada cosa) NO está aquí**:
> vive en la memoria del proyecto, que ya se carga sola en cada sesión. Este
> archivo es solo lo operativo — lo que hace falta para no romper nada.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 ·
Supabase (Postgres + Auth + RLS) · Stripe · Resend · API-Football (api-sports.io v3) ·
Vercel.

⚠️ Next 16 tiene breaking changes respecto a lo que "sabes" de Next: lee
`node_modules/next/dist/docs/` antes de escribir código (ver `AGENTS.md`).

## Comandos

```bash
npm run dev      # desarrollo (localhost:3000)
npm run build    # build producción
npm run lint     # eslint — el proyecto está a CERO avisos, mantenlo así
npm test         # vitest

# SQL contra Supabase (lee DATABASE_URL de .env.local):
node scripts/db.mjs file supabase/migrations/0XX-....sql
node scripts/db.mjs query "SELECT ..."
```

## Estructura

```
src/app/          rutas (App Router) + api/*/route.ts
src/components/   UI compartida
src/lib/
  sports/         api-football.ts (cliente + caché), competitions.ts (config
                  declarativa por competición), widget-data.ts (portada),
                  sports-cache.ts (caché precalculada por cron)
  quiniela-liga/  scoring.ts, baremo.ts, leagues.ts
  analisis/       queries.ts, markdown.ts
  supabase/       client.ts, server.ts, middleware.ts
supabase/migrations/   numeradas; la última manda
scripts/db.mjs    ejecutar SQL
```

## Reglas que evitan incidentes ya vividos

- **Caché (Next 16)**: `fetch` + `next.revalidate` NO cachea. Usa
  `unstable_cache` SIEMPRE para llamadas a API-Football, con el try/catch
  DENTRO (si no, un fallo dispara tormenta de reintentos).
- **Cuota de API-Football**: han pasado tres incidentes por consumo
  descontrolado. Al tocar refresco en vivo o ingestas: intervalos altos,
  reutilizar caché, nunca polling agresivo. Rutas caras protegidas por el
  escudo anti-scraping de `src/middleware.ts` (UA + desafío de cookie + rate
  limit por IP) — por eso `curl` sin User-Agent de navegador recibe un 302.
- **IDs de API-Football**: verifícalos contra la API real antes de escribirlos
  en el código. Nunca hardcodees códigos de liga de la BD: son renombrables,
  usa el id.
- **RLS activa en casi todo.** Migraciones nuevas: siguiente número de la
  serie, aplicadas con `db.mjs file`.
- **La puntuación de la quiniela sale de `lib/quiniela-liga/scoring.ts`** con
  el baremo de la liga (cada liga tiene el suyo). No la reimplementes en un
  componente: pasó, y las tarjetas mentían mientras la clasificación acertaba.
- Server Components por defecto. Stripe, service-role y API-Football, solo
  en servidor.
- Producto y commits, en **español**.

## Despliegue

Rama → PR → merge a `main` cuando el dueño lo diga → **Vercel despliega solo**.
Plan B manual: `npx --no-install vercel deploy --prod --yes` (CLI ya
autenticado). ⚠️ **UN PR por sesión con muchos commits** — GitHub suspendió la
cuenta en agosto por abrir PRs demasiado seguidos.

## Herramientas de contexto

- **Memoria** (`~/.claude/projects/.../memory/`): el índice se carga solo; los
  archivos de tema se leen a demanda. Ahí va todo lo histórico.
- **graphify** (`graphify-out/`): grafo del código, OPCIONAL. Útil solo para
  preguntas de arquitectura ("qué depende de qué"). Para buscar dónde se usa
  algo, grep es más barato y más preciso. Si lo usas, primero
  `graphify update .` — se queda obsoleto enseguida.
