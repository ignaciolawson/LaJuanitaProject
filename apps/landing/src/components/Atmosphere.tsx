/**
 * Fixed, purely decorative layers that give the whole site texture: a
 * soft red/violet haze behind everything, faint film grain, and
 * scanlines — the difference between "flat dark background" and a
 * studio/club atmosphere. Non-interactive, hidden from assistive tech.
 */
export function Atmosphere() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <div className="haze absolute inset-0" />
      <div className="grain absolute inset-0" />
      <div className="scan absolute inset-0" />
    </div>
  );
}
