// The two-segment pedal mechanism is adapted from the user's pelican-cycle.html.
export type PelicanLegSide = 'near' | 'far';
export function pelicanLegPose(time: number, side: PelicanLegSide) {
  const t = Number.isFinite(time) ? Math.max(0, time) : 0;
  const angle = t * Math.PI * 2 / 1.65 + (side === 'far' ? Math.PI : 0);
  const hip = side === 'near' ? { x: 744, y: 414 } : { x: 722, y: 412 };
  const pedal = { x: 754 + Math.cos(angle) * 37, y: 610 + Math.sin(angle) * 37 };
  const ankle = { x: pedal.x - 3, y: pedal.y - 8 };
  const dx = ankle.x - hip.x, dy = ankle.y - hip.y, distance = Math.hypot(dx, dy);
  const upper = 119, lower = 124;
  const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const bend = Math.sqrt(Math.max(0, upper * upper - along * along));
  const knee = { x: hip.x + along * dx / distance - bend * dy / distance, y: hip.y + along * dy / distance + bend * dx / distance };
  return { hip, knee, ankle, pedal, path: `M${hip.x} ${hip.y}L${knee.x.toFixed(2)} ${knee.y.toFixed(2)}L${ankle.x.toFixed(2)} ${ankle.y.toFixed(2)}` };
}
