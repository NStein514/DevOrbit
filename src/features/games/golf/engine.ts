import { hitsHazard, type Hazard } from '../shared/hazards.js'
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
  hazards: Hazard[]
}
export interface Comet extends Point {
  launchTime: number
  vx: number
  vy: number
  age: number
}
export type Outcome =
  'flying' | 'sunk' | 'collision' | 'debris' | 'escaped' | 'timeout'
export const holes: Hole[] = [
  {
    name: 'First bend',
    hazards: [
      { x: 530, y: 250, rx: 12, ry: 140, radius: 18, period: 9, phase: 0 },
    ],
    par: 2,
    tee: { x: 100, y: 410 },
    target: { x: 880, y: 150 },
    planets: [{ x: 490, y: 340, radius: 46, mass: 180000, color: '#5bc9bd' }],
  },
  {
    name: 'Between worlds',
    hazards: [
      { x: 520, y: 275, rx: 20, ry: 145, radius: 20, period: 10, phase: 1 },
    ],
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
    hazards: [
      { x: 560, y: 250, rx: 110, ry: 90, radius: 20, period: 12, phase: 0 },
    ],
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
    hazards: [
      { x: 540, y: 240, rx: 15, ry: 160, radius: 22, period: 10, phase: 2 },
      { x: 780, y: 255, rx: 55, ry: 100, radius: 16, period: 13, phase: 0 },
    ],
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
    hazards: [
      { x: 600, y: 280, rx: 20, ry: 110, radius: 20, period: 8, phase: 0 },
      { x: 290, y: 325, rx: 0, ry: 0, radius: 18, period: 0, phase: 0 },
    ],
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
    hazards: [
      { x: 520, y: 280, rx: 90, ry: 120, radius: 22, period: 10, phase: 1 },
      { x: 800, y: 260, rx: 25, ry: 90, radius: 18, period: 7, phase: 0 },
    ],
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
export function shoot(
  hole: Hole,
  angle: number,
  power: number,
  launchTime = 0,
): Comet {
  const a = (angle * Math.PI) / 180
  return {
    ...hole.tee,
    launchTime,
    vx: Math.cos(a) * power,
    vy: Math.sin(a) * power,
    age: 0,
  }
}
export function advance(comet: Comet, hole: Hole, dt: number): Outcome {
  const from = { x: comet.x, y: comet.y },
    time = comet.launchTime + comet.age
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
  if (hole.hazards.some((h) => hitsHazard(from, comet, 4, h, time, dt)))
    return 'debris'
  if (comet.x < -30 || comet.x > 1030 || comet.y < -30 || comet.y > 590)
    return 'escaped'
  return comet.age > 18 ? 'timeout' : 'flying'
}
export function prediction(
  hole: Hole,
  angle: number,
  power: number,
  launchTime = 0,
) {
  const comet = shoot(hole, angle, power, launchTime),
    points: Point[] = []
  let outcome: Outcome = 'flying'
  for (let i = 0; i < 2160 && outcome === 'flying'; i++) {
    outcome = advance(comet, hole, 1 / 120)
    if (i % 8 === 0 || outcome !== 'flying')
      points.push({ x: comet.x, y: comet.y })
  }
  return { points, outcome, launchTime }
}
