import type { Satellite } from './engine.js'
export const missions = [
  {
    name: 'First constellation',
    count: 3,
    bands: 1,
    hold: 12,
    brief: 'Keep three satellites in orbit together for 12 seconds.',
  },
  {
    name: 'Layered skies',
    count: 4,
    bands: 2,
    hold: 15,
    brief: 'Hold four satellites across two orbit lanes for 15 seconds.',
  },
  {
    name: 'Orbital symphony',
    count: 6,
    bands: 3,
    hold: 18,
    brief: 'Hold six satellites across all three lanes for 18 seconds.',
  },
]
export function occupiedLanes(bodies: Satellite[]) {
  return new Set(
    bodies
      .map((b) => Math.hypot(b.x, b.y))
      .filter((r) => r >= 125 && r <= 265)
      .map((r) => (r < 170 ? 0 : r < 210 ? 1 : 2)),
  ).size
}
export function missionReady(bodies: Satellite[], index: number) {
  const m = missions[index]
  return bodies.length >= m.count && occupiedLanes(bodies) >= m.bands
}
export function missionStars(losses: number) {
  return losses === 0 ? 3 : losses <= 2 ? 2 : 1
}
