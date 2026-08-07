/**
 * Capas fijas de textura sobre todo el frame: grano de película, un rastro
 * de scanlines y una viñeta suave. Van fuera de #smooth-content para que no
 * se muevan con el scroll — son la "lente", no el contenido.
 */
export function Texture() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60]">
      <div className="grain absolute inset-0" />
      <div className="scan absolute inset-0" />
      <div
        className="absolute inset-0"
        style={{
          boxShadow: "inset 0 0 min(18vw, 220px) rgba(0,0,0,0.30)",
        }}
      />
    </div>
  );
}
