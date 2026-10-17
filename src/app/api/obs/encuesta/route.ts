import { NextResponse } from "next/server";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";

export const dynamic = "force-dynamic";

/**
 * Encuesta en la pantalla del directo (17-oct, pedido del dueño): fuente de
 * navegador para OBS (1920×1080, fondo transparente). Enseña la encuesta
 * ABIERTA más reciente de las que lanza Reinaldo desde la ficha del partido
 * (no la automática del MVP) y
 * se actualiza cada 3 s. `?json=1` devuelve solo los datos.
 * Sin encuesta abierta no pinta nada (queda transparente).
 */
type Opcion = { id: string; texto: string };

async function datos() {
  const db = clienteServicio();
  if (!db) return null;
  const { data: e } = await db
    .from("encuestas")
    .select("id, fixture_id, pregunta, opciones")
    .eq("cerrada", false)
    .eq("tipo", "libre")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; fixture_id: number; pregunta: string; opciones: Opcion[] }>();
  if (!e) return null;
  const { data: r } = await db.rpc("resultados_encuestas", { p_fixture: e.fixture_id });
  const votos: Record<string, number> = {};
  for (const x of (r ?? []) as { encuesta_id: string; opcion: string; votos: number }[]) {
    if (x.encuesta_id === e.id) votos[x.opcion] = x.votos;
  }
  const total = Object.values(votos).reduce((a, b) => a + b, 0);
  return {
    pregunta: e.pregunta,
    total,
    opciones: e.opciones.map((o) => ({
      texto: o.texto,
      pct: total ? Math.round(((votos[o.id] ?? 0) / total) * 100) : 0,
    })),
  };
}

const PAGINA = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Encuesta · OBS</title>
<style>
html,body{margin:0;background:transparent;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#e8ecff}
#c{position:absolute;left:48px;bottom:48px;width:620px;display:none;padding:26px 28px;border-radius:22px;
background:rgba(10,16,48,.92);border:2px solid rgba(140,160,255,.35);box-shadow:0 20px 50px rgba(0,0,0,.45)}
#t{font-size:15px;letter-spacing:.16em;text-transform:uppercase;color:#f5c542;font-weight:700}
#p{font-size:34px;font-weight:800;margin:8px 0 18px;line-height:1.15}
.o{position:relative;overflow:hidden;border-radius:12px;background:rgba(255,255,255,.06);margin-top:10px;
padding:14px 18px;display:flex;justify-content:space-between;font-size:26px;font-weight:600}
.b{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,#2c8fff,#5aa8ff);opacity:.55;transition:width .6s ease}
.o span{position:relative}
#f{margin-top:14px;font-size:18px;color:#9aa4d6;display:flex;justify-content:space-between}
#f b{color:#5aa8ff}
</style></head><body><div id="c"><div id="t">🗳️ Encuesta en directo</div><div id="p"></div><div id="o"></div>
<div id="f"><span id="n"></span><b>vota en soyreinaldo.com</b></div></div>
<script>
async function tick(){try{const r=await fetch(location.pathname+"?json=1",{cache:"no-store"});const d=await r.json();
const c=document.getElementById("c");if(!d){c.style.display="none";return}
c.style.display="block";document.getElementById("p").textContent=d.pregunta;
document.getElementById("n").textContent=d.total+(d.total===1?" voto":" votos");
const o=document.getElementById("o");if(o.children.length!==d.opciones.length){o.innerHTML=d.opciones.map(()=>'<div class="o"><i class="b"></i><span></span><span></span></div>').join("")}
d.opciones.forEach((x,i)=>{const el=o.children[i];el.querySelector(".b").style.width=x.pct+"%";
el.children[1].textContent=x.texto;el.children[2].textContent=x.pct+"%"});}catch(e){}}
tick();setInterval(tick,3000);
</script></body></html>`;

export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get("json") === "1") {
    return NextResponse.json(await datos(), { headers: { "Cache-Control": "no-store" } });
  }
  return new Response(PAGINA, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
