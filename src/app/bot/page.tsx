export const metadata = {
  title: "Bot de Comentarios | Soy Reinaldo",
  description:
    "IA que responde a los comentarios de mi canal de YouTube en mi voz. Construido con Claude (Anthropic) y la API de YouTube.",
};

const features = [
  {
    title: "Clasifica antes de responder",
    desc: "Detecta si el comentario es un ataque personal, un apoyo, una mentira sobre el vídeo, un troleo al Barça o un mensaje neutral. Cada tipo lleva un tono distinto.",
  },
  {
    title: "Mi voz, no genérica",
    desc: "Mensajes cortos por defecto, sarcasmo culé, sin la palabra 'hermano', emojis con cabeza, y análisis técnico cuando el comentario lo merece.",
  },
  {
    title: "Detecta ironía",
    desc: "Antes de responder, evalúa si el comentario habla en serio o en broma. Esto evita morder el anzuelo en comentarios irónicos que parecen ataques.",
  },
  {
    title: "Contexto de fútbol vivo",
    desc: "Tiene un fichero de contexto actualizable con datos de La Liga, Champions, jugadores y figuras mediáticas (Chiringuito, Roncero, etc.) para no quedarse desfasado.",
  },
];

const stack = [
  { label: "Modelo", value: "Claude (Anthropic)" },
  { label: "Lenguaje", value: "Python 3" },
  { label: "API externa", value: "YouTube Data API v3" },
  { label: "Logs", value: "CSV con histórico de respuestas" },
];

export default function BotPage() {
  return (
    <main className="page">
      <section className="phero">
        <div className="wrap">
          <p className="eyebrow">Producto · Side project</p>
          <h1 className="phero__title">
            Bot de Comentarios<span className="dot">.</span>
          </h1>
          <p className="phero__lede">
            Una IA que lee los comentarios de mis vídeos en YouTube y responde
            como respondería yo. Sarcasmo culé, mensajes cortos, y análisis
            técnico cuando toca.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="shead">
            <h2>Cómo funciona</h2>
          </div>
          <div className="grid2">
            {features.map((f) => (
              <div key={f.title} className="infocard">
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="shead" style={{ marginTop: 52 }}>
            <h2>Stack</h2>
          </div>
          <div className="rowlist">
            {stack.map((s) => (
              <div key={s.label} className="rowlist__row">
                <span className="rowlist__k">{s.label}</span>
                <span className="rowlist__v">{s.value}</span>
              </div>
            ))}
          </div>

          <div className="acard" style={{ marginTop: 52 }}>
            <h2>¿Por qué este proyecto?</h2>
            <p className="sub" style={{ marginBottom: 0 }}>
              Mi canal recibe cientos de comentarios por vídeo. Responder a
              todos con calidad es imposible — y los que más necesitan
              respuesta son los ataques personales o las mentiras sobre el
              contenido. El bot se encarga del 80% que es repetitivo (defensas
              tipo, troleos, apoyos) para que yo me centre en los comentarios
              que aportan algo de verdad.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
