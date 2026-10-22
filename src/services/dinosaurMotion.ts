// Adapted from the user's dinosaur-cycle.html; the feet remain attached to opposite pedals.
export type DinosaurLegSide = 'near' | 'far';

export function dinosaurLegPose(time: number, side: DinosaurLegSide) {
  const t = Number.isFinite(time) ? Math.max(0, time) : 0;
  const angle = t * Math.PI * 2 / 1.7 + (side === 'far' ? Math.PI : 0);
  const hip = side === 'near' ? { x: 642, y: 409 } : { x: 622, y: 400 };
  const pedal = { x: 678 + Math.cos(angle) * 34, y: 580 + Math.sin(angle) * 34 };
  const ankle = { x: pedal.x - 3, y: pedal.y - 7 };
  const dx = ankle.x - hip.x, dy = ankle.y - hip.y, distance = Math.hypot(dx, dy);
  const upper = 118, lower = 117;
  const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const bend = Math.sqrt(Math.max(0, upper * upper - along * along));
  const knee = { x: hip.x + along * dx / distance - bend * dy / distance, y: hip.y + along * dy / distance + bend * dx / distance };
  return { hip, knee, ankle, pedal, path: `M${hip.x} ${hip.y}L${knee.x.toFixed(2)} ${knee.y.toFixed(2)}L${ankle.x.toFixed(2)} ${ankle.y.toFixed(2)}` };
}
