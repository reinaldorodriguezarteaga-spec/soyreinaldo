---
name: video-a-articulo
description: Convierte uno o varios vídeos del canal de YouTube de Reinaldo (@SoyReinaldoR) en un análisis escrito con su voz y lo deja como BORRADOR en /admin/analisis para que él lo revise y publique. Úsala cuando el dueño pase un enlace de YouTube y diga «hazme un artículo», «pasa este vídeo a análisis», «vídeo a artículo» o similar.
---

# Vídeo → artículo

Pedido del dueño (25-oct-2026). AdSense rechazó la web dos veces por
«contenido de poco valor». Lo que más pesa a favor es el **texto propio**, y
Reinaldo ya genera opinión cada día en vídeo. Esta herramienta convierte ese
vídeo en un análisis escrito sin que él empiece desde cero.

**Nunca se publica nada desde aquí.** Todo queda en borrador: lo publica
el dueño desde el editor.

## Pasos

1. **Transcripción.**
   - Comando: `node scripts/transcripcion.mjs <url-o-id> [...]`. Usa yt-dlp, sin cuota de API.
   - Mira `palabras`:
     - **Menos de ~300** (los Shorts de 1 min): con uno solo no hay artículo. Junta
       varios vídeos del mismo tema (un clásico, una polémica, una jornada) o díselo
       al dueño.
     - **Directos y vídeos largos**: el mejor material. Quédate con lo que tiene
       opinión, no con el saludo ni las lecturas del chat.
2. **Datos.**
   - Comprueba cada resultado, fecha, goleador o cifra que vaya a salir:
     - Partidos con su id: `node scripts/db.mjs query` sobre `lq_matches`.
     - Si no está ahí, una llamada suelta a API-Football (`/fixtures?team=529&last=5`…),
       nunca un barrido.
   - Lo que no puedas comprobar no va como dato. Si es opinión suya, va como
     opinión («para mí…»).
   - **Nunca inventes citas ni declaraciones** de jugadores o entrenadores.
   - La transcripción automática se equivoca con los nombres («Fermín», «Mou»,
     «Negreira»…). Corrígelos con sentido.
3. **Escribe el artículo** con su voz (ver abajo) y guárdalo como JSON en el
   scratchpad:
   ```json
   { "titulo": "...", "extracto": "...", "cuerpo": "markdown...",
     "competicion": "laliga", "fixture_id": 1570426, "team_id": 529 }
   ```
   - `competicion`, `fixture_id` y `team_id` son opcionales; pon el partido si el
     artículo va de uno.
   - Sin `portada`, se usa la miniatura del vídeo.
4. **Guarda el borrador:** `node scripts/borrador-analisis.mjs <archivo.json>`.
   Devuelve el enlace al editor.
5. **Cuéntale al dueño** qué vídeo(s) usaste, cuántas palabras salieron y qué datos
   comprobaste o dejaste como opinión. Dale el enlace para que lo revise, lo ajuste
   y lo publique.

## Su voz (sacada de sus 29 análisis)

**Persona y tono**
- Primera persona, culé sin disimulo, tono de charla con su gente: «para mí»,
  «honestamente», «vamos a ser honestos», «como comento siempre».
- Ironía con el madridismo. Su gran tema es **«la liga de los lloros»** (el Madrid
  y Mourinho llorando por los árbitros), y el «Madrid llora, Madrid gana».

**Forma**
- Preguntas retóricas al lector: «¿me vas a decir que no hay una toma buena?».
- Párrafos cortos, de 2 a 4 frases.
- **Negrita** en los nombres propios clave y en los marcadores (**4-1 al Sevilla**).
- `##` para los bloques del artículo: un subtítulo por tema o por partido.

**Títulos y extractos**
- Título corto y con gancho, en su estilo: «El Madrid llora, el Madrid gana»,
  «Gana el Barcelona, golea el Barcelona, llora el madridismo». Máximo ~65
  caracteres.
- Extracto de 1-2 frases con el dato clave y la polémica, hasta 160 caracteres.

**Arranque y cierre**
- Arranca con el hecho y su opinión en la primera frase. Sin «En este artículo…».
- Cierra con una frase rotunda en negrita, y si toca, con la cita para el próximo
  partido o vídeo («Nos vemos el lunes con el análisis post jornada»).

**Lo que no usa**
- Nada de relleno de IA: «en conclusión», «cabe destacar», «sin lugar a dudas»,
  «en el mundo del fútbol», listas de pros y contras.

## Formato y extensión

- **800-1.200 palabras** cuando el material da para ello; si no, mejor 500 buenas que
  1.000 rellenas. Es más largo que sus análisis rápidos: el texto largo y propio es
  lo que convence a Google.
- Pon el vídeo dentro del artículo: **una línea sola con el enlace de YouTube** (la
  web lo convierte en el reproductor). Normalmente va tras el primer o segundo
  párrafo.
- Markdown que entiende la web:
  - `##` / `###` subtítulos
  - `**negrita**`, `*cursiva*`
  - `- ` listas
  - `> ` cita
  - la línea de YouTube
- Sin HTML, sin tablas, sin imágenes externas.
- Añade lo que el vídeo no puede dar y que tienes comprobado: el contexto del
  partido, la racha, la clasificación o el dato histórico. Ese plus es el valor
  propio del artículo.
