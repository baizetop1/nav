export const REST_SPEEDS = [0.65, 1, 1.3] as const;

/** Clamp resumed frames so returning from a sleeping tab never fast-forwards the scene. */
export function advanceRestTime(time: number, deltaMs: number, speed: number): number {
  if (!Number.isFinite(time) || !Number.isFinite(deltaMs) || !Number.isFinite(speed)) return 0;
  return Math.max(0, time) + Math.min(80, Math.max(0, deltaMs)) / 1000 * Math.min(1.3, Math.max(0.3, speed));
}

export function restPose(time: number) {
  const t = Number.isFinite(time) ? Math.max(0, time) : 0;
  const stroke = t * Math.PI * 2 / 5.6;
  const boatY = Math.sin(stroke) * 3.5, boatAngle = Math.sin(stroke + 0.6) * 1.15;
  const paddleAngle = Math.sin(stroke) * 22 - 12;
  const paddleRadians = paddleAngle * Math.PI / 180, boatRadians = boatAngle * Math.PI / 180;
  const bladeX = 112 - Math.sin(paddleRadians) * 196, bladeY = -98 + Math.cos(paddleRadians) * 196;
  return {
    boatY, boatAngle, paddleAngle,
    rippleX: bladeX * Math.cos(boatRadians) - bladeY * Math.sin(boatRadians),
    rippleY: bladeX * Math.sin(boatRadians) + bladeY * Math.cos(boatRadians) + boatY,
    tailAngle: Math.sin(t * 0.9) * 2.3,
    lanternAngle: Math.sin(stroke - 0.8) * 3,
    cloudX: Math.sin(t / 33) * 42,
    mistX: Math.sin(t / 19) * 28,
    waterX: -(t * 9 % 1440),
    reedAngle: Math.sin(t * 0.65) * 2.2,
    rippleScale: 0.65 + (1 + Math.sin(stroke - 0.8)) * 0.3,
    rippleOpacity: 0.13 + (1 + Math.cos(stroke)) * 0.08,
  };
}
