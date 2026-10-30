export interface Point {
  x: number
  y: number
}
export interface Hazard {
  x: number
  y: number
  rx: number
  ry: number
  radius: number
  period: number
  phase: number
}
export function hazardPosition(h: Hazard, time: number): Point {
  const angle = h.phase + (h.period > 0 ? (time * Math.PI * 2) / h.period : 0)
  return { x: h.x + h.rx * Math.cos(angle), y: h.y + h.ry * Math.sin(angle) }
}
// Sweep in relative space: a fast body or moving obstacle cannot skip through
// the other between physics ticks. Motion is linear within each fixed step.
export function hitsHazard(
  from: Point,
  to: Point,
  radius: number,
  h: Hazard,
  time: number,
  dt: number,
) {
  const start = hazardPosition(h, time),
    end = hazardPosition(h, time + dt)
  const x = from.x - start.x,
    y = from.y - start.y
  const dx = to.x - end.x - x,
    dy = to.y - end.y - y
  const length = dx * dx + dy * dy
  const t = length ? Math.max(0, Math.min(1, -(x * dx + y * dy) / length)) : 0
  return Math.hypot(x + dx * t, y + dy * t) <= radius + h.radius
}
