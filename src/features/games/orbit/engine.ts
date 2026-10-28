export interface Satellite {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  age: number
  trail: { x: number; y: number }[]
}
export const gravity = 180000
export function launch(
  id: number,
  radius: number,
  position: number,
  direction: number,
  speed: number,
): Satellite {
  const a = (position * Math.PI) / 180,
    d = ((position + 90 + direction) * Math.PI) / 180
  return {
    id,
    x: Math.cos(a) * radius,
    y: Math.sin(a) * radius,
    vx: Math.cos(d) * speed,
    vy: Math.sin(d) * speed,
    age: 0,
    trail: [],
  }
}
export function step(body: Satellite, dt: number) {
  const r = Math.hypot(body.x, body.y),
    a = -gravity / Math.max(r, 1) ** 3
  body.vx += body.x * a * dt
  body.vy += body.y * a * dt
  body.x += body.vx * dt
  body.y += body.vy * dt
  body.age += dt
}
export function lost(body: Satellite) {
  return Math.hypot(body.x, body.y) < 108
    ? 'Planet collision'
    : Math.hypot(body.x, body.y) > 650
      ? 'Escaped gravity'
      : null
}
export function advance(bodies: Satellite[], dt: number) {
  const removed = new Map<number, string>()
  for (const b of bodies) {
    step(b, dt)
    const reason = lost(b)
    if (reason) removed.set(b.id, reason)
  }
  for (let i = 0; i < bodies.length; i++)
    for (let j = i + 1; j < bodies.length; j++)
      if (
        Math.hypot(bodies[i].x - bodies[j].x, bodies[i].y - bodies[j].y) < 13
      ) {
        removed.set(bodies[i].id, 'Satellite collision')
        removed.set(bodies[j].id, 'Satellite collision')
      }
  return removed
}
