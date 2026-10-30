export interface Point {
  x: number
  y: number
}
export interface Planet extends Point {
  radius: number
  mass: number
  color: string
}
export interface Hole {
  name: string
  par: number
  tee: Point
  target: Point
  planets: Planet[]
}
export interface Comet extends Point {
  vx: number
  vy: number
  age: number
}
export type Outcome = 'flying' | 'sunk' | 'collision' | 'escaped' | 'timeout'
export const holes: Hole[] = [
  {
    name: 'First bend',
    par: 2,
    tee: { x: 100, y: 410 },
    target: { x: 880, y: 150 },
    planets: [{ x: 490, y: 340, radius: 46, mass: 180000, color: '#5bc9bd' }],
  },
  {
    name: 'Between worlds',
    par: 3,
    tee: { x: 100, y: 280 },
    target: { x: 880, y: 280 },
    planets: [
      { x: 410, y: 180, radius: 48, mass: 220000, color: '#b8a1ef' },
      { x: 610, y: 390, radius: 54, mass: 230000, color: '#eeab74' },
    ],
  },
  {
    name: 'The long arc',
    par: 3,
    tee: { x: 100, y: 430 },
    target: { x: 870, y: 100 },
    planets: [
      { x: 400, y: 340, radius: 56, mass: 250000, color: '#85b6ec' },
      { x: 680, y: 200, radius: 45, mass: 170000, color: '#dfa6d2' },
    ],
  },
  {
    name: 'Binary drift',
    par: 3,
    tee: { x: 100, y: 450 },
    target: { x: 880, y: 130 },
    planets: [
      { x: 360, y: 260, radius: 55, mass: 240000, color: '#8ccdec' },
      { x: 680, y: 360, radius: 48, mass: 260000, color: '#d7a4ee' },
    ],
  },
  {
    name: 'Needle thread',
    par: 3,
    tee: { x: 100, y: 280 },
    target: { x: 900, y: 280 },
    planets: [
      { x: 420, y: 140, radius: 60, mass: 270000, color: '#f0ba87' },
      { x: 500, y: 420, radius: 60, mass: 270000, color: '#8ccdec' },
      { x: 720, y: 160, radius: 40, mass: 150000, color: '#d7a4ee' },
    ],
  },
  {
    name: 'Event horizon',
    par: 4,
    tee: { x: 100, y: 450 },
    target: { x: 890, y: 110 },
    planets: [
      { x: 370, y: 330, radius: 60, mass: 300000, color: '#8ccdec' },
      { x: 620, y: 150, radius: 50, mass: 220000, color: '#d7a4ee' },
      { x: 740, y: 390, radius: 40, mass: 190000, color: '#f0ba87' },
    ],
  },
]
export const coursePar = holes.reduce((sum, h) => sum + h.par, 0)
export function holeStars(strokes: number, par: number) {
  return strokes <= par - 1 ? 3 : strokes <= par ? 2 : 1
}
export function shotRating(strokes: number, par: number) {
  if (strokes === 1) return 'Hole in one!'
  const difference = strokes - par
  return difference <= -2
    ? 'Eagle!'
    : difference === -1
      ? 'Birdie!'
      : difference === 0
        ? 'Right on par!'
        : `Hole complete · +${difference}`
}
export function shoot(hole: Hole, angle: number, power: number): Comet {
  const a = (angle * Math.PI) / 180
  return {
    ...hole.tee,
    vx: Math.cos(a) * power,
    vy: Math.sin(a) * power,
    age: 0,
  }
}
export function advance(comet: Comet, hole: Hole, dt: number): Outcome {
  for (const p of [...hole.planets, { ...hole.target, mass: 65000 }]) {
    const dx = p.x - comet.x,
      dy = p.y - comet.y,
      r = Math.max(20, Math.hypot(dx, dy))
    comet.vx += ((dx * p.mass) / r ** 3) * dt
    comet.vy += ((dy * p.mass) / r ** 3) * dt
  }
  comet.x += comet.vx * dt
  comet.y += comet.vy * dt
  comet.age += dt
  if (Math.hypot(comet.x - hole.target.x, comet.y - hole.target.y) < 23)
    return 'sunk'
  if (
    hole.planets.some(
      (p) => Math.hypot(comet.x - p.x, comet.y - p.y) < p.radius + 4,
    )
  )
    return 'collision'
  if (comet.x < -30 || comet.x > 1030 || comet.y < -30 || comet.y > 590)
    return 'escaped'
  return comet.age > 18 ? 'timeout' : 'flying'
}
export function prediction(hole: Hole, angle: number, power: number) {
  const comet = shoot(hole, angle, power),
    points: Point[] = []
  let outcome: Outcome = 'flying'
  for (let i = 0; i < 2160 && outcome === 'flying'; i++) {
    outcome = advance(comet, hole, 1 / 120)
    if (i % 8 === 0) points.push({ x: comet.x, y: comet.y })
  }
  return { points, outcome }
}
