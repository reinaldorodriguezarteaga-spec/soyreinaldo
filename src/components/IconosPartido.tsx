/**
 * Iconos de lo que hizo cada jugador en un partido (15-oct, pedido del dueño
 * con capturas de referencia): balón = gol, bota = asistencia, portería con
 * una X roja = penalti fallado, guante = penalti parado. En SVG y no emoji:
 * se ven iguales en todos los móviles y caben en las insignias del campo.
 * La bota, la portería y el guante usan `currentColor`; el balón va siempre
 * blanco con dibujo oscuro, y la X, roja.
 */

type Props = { size?: number; title?: string };

export function IconoBalon({ size = 14, title = "Gol" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={title}>
      {/* Blanco con dibujo oscuro siempre (no currentColor): sobre texto claro
          el dibujo se perdía. */}
      <circle cx="12" cy="12" r="10.5" fill="#fff" stroke="#0b0f1a" strokeWidth="1.5" />
      <path d="M12 7.2l3.3 2.4-1.3 3.9h-4l-1.3-3.9z" fill="#0b0f1a" />
      <path
        d="M12 7.2V2.2M15.3 9.6l4.6-1.6M14 13.5l2.8 4M10 13.5l-2.8 4M8.7 9.6L4.1 8"
        stroke="#0b0f1a"
        strokeWidth="1.3"
        fill="none"
      />
    </svg>
  );
}

export function IconoBota({ size = 14, title = "Asistencia" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={title}>
      <path
        d="M4 5.5h5.2l.8 5.2c2.6.4 6.4 1.4 8.6 2.7 1.5.9 2 2.2 2 3.4v1.4H4.4c-.9 0-1.4-.6-1.3-1.4z"
        fill="currentColor"
      />
      <path d="M3.3 19.3h17.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 21.2v-1.6M9 21.2v-1.6M13 21.2v-1.6M17 21.2v-1.6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function IconoPenaltiFallado({ size = 14, title = "Penalti fallado" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={title}>
      <path d="M2.5 20V5h19v15" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M2.5 10h19M2.5 15h19M8.8 5v15M15.2 5v15" stroke="currentColor" strokeWidth="0.7" opacity="0.5" />
      <path d="M7 8.5l10 10M17 8.5l-10 10" stroke="#ff4d5e" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconoGuante({ size = 14, title = "Penalti parado" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={title}>
      <path
        d="M7 21.5h8.5l1.5-3.5 2.6-4.6c.5-.9-.4-1.9-1.3-1.4l-2.3 1.4V5.2a1.3 1.3 0 0 0-2.6 0V11h-.4V3.7a1.3 1.3 0 0 0-2.6 0V11h-.4V4.6a1.3 1.3 0 0 0-2.6 0V11.6h-.4V7a1.3 1.3 0 0 0-2.6 0v8.6c0 2.6 1.2 4.5 3.1 5.9z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Las marcas de un jugador en fila: balón (×n), bota (×n), penalti fallado,
 * guante. `badge` = cada icono en un círculo blanco, para encima de la foto
 * en el campo; sin badge, en línea con el texto.
 */
export function MarcasJugador({
  goals = 0,
  assists = 0,
  penMissed = 0,
  penSaved = 0,
  size = 14,
  badge = false,
}: {
  goals?: number;
  assists?: number;
  penMissed?: number;
  penSaved?: number;
  size?: number;
  badge?: boolean;
}) {
  const items: { key: string; icono: React.ReactNode; n: number }[] = [];
  if (goals > 0) items.push({ key: "g", icono: <IconoBalon size={size} />, n: goals });
  if (assists > 0) items.push({ key: "a", icono: <IconoBota size={size} />, n: assists });
  if (penMissed > 0) items.push({ key: "pf", icono: <IconoPenaltiFallado size={size} />, n: penMissed });
  if (penSaved > 0) items.push({ key: "pp", icono: <IconoGuante size={size} />, n: penSaved });
  if (items.length === 0) return null;
  return (
    <span className={badge ? "marcas marcas--badge" : "marcas"}>
      {items.map((it) => (
        <span key={it.key} className="marcas__item">
          {it.icono}
          {it.n > 1 && <b>{it.n}</b>}
        </span>
      ))}
    </span>
  );
}
