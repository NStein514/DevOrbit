import { launch, type Satellite } from './engine'
export type OrbitEffect = { x: number; y: number; age: number }
export function renderOrbit(
  ctx: CanvasRenderingContext2D,
  world: HTMLImageElement,
  sprite: HTMLImageElement,
  bodies: Satellite[],
  preview: { x: number; y: number }[],
  settings: {
    radius: number
    position: number
    direction: number
    speed: number
  },
  effects: OrbitEffect[],
  time: number,
  reduced: boolean,
  won: boolean,
) {
  const { width, height } = ctx.canvas
  const scale = height > 600 ? 1.5 : 1
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(
    world,
    (width - 1000 * scale) / 2,
    (height - 562 * scale) / 2,
    1000 * scale,
    562 * scale,
  )
  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.scale(scale, scale)
  const glow = ctx.createRadialGradient(0, 0, 96, 0, 0, 130)
  glow.addColorStop(0, '#8fffe322')
  glow.addColorStop(1, '#8fffe300')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(0, 0, 130, 0, Math.PI * 2)
  ctx.fill()
  for (const r of [150, 190, 235]) {
    ctx.strokeStyle = '#b6e4ff22'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 8])
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.setLineDash([])
  if (!reduced) {
    ctx.strokeStyle = won ? '#b9ffe788' : '#9adfff33'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, 112, time * 0.15, time * 0.15 + 0.75)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, 0, 116, -time * 0.1, -time * 0.1 + 0.5)
    ctx.stroke()
  }
  ctx.strokeStyle = '#bdffdd88'
  ctx.lineWidth = 1.5
  ctx.setLineDash([3, 6])
  ctx.beginPath()
  preview.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
  ctx.stroke()
  ctx.setLineDash([])
  const start = launch(
    0,
    settings.radius,
    settings.position,
    settings.direction,
    settings.speed,
  )
  ctx.strokeStyle = '#e4fff3'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(start.x, start.y, 10, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(start.x + start.vx, start.y + start.vy)
  ctx.stroke()
  ctx.fillStyle = '#c4e9f2'
  ctx.font = '10px sans-serif'
  ctx.fillText('LAUNCH', start.x + 14, start.y - 12)
  for (const b of bodies) {
    const color = `hsl(${(b.id * 67) % 360} 85% 78%)`
    ctx.strokeStyle = color
    ctx.lineWidth = 1.7
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    b.trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.rotate(Math.atan2(b.vy, b.vx))
    if (!reduced) {
      ctx.shadowColor = color
      ctx.shadowBlur = 16
    }
    ctx.drawImage(sprite, -20, -10, 40, 20)
    ctx.restore()
  }
  if (won && !reduced) {
    ctx.strokeStyle = '#bcffe6'
    ctx.globalAlpha = 0.25
    ctx.beginPath()
    bodies.forEach((b, i) => (i ? ctx.lineTo(b.x, b.y) : ctx.moveTo(b.x, b.y)))
    ctx.closePath()
    ctx.stroke()
    ctx.globalAlpha = 1
  }
  for (const e of effects) {
    if (reduced) continue
    ctx.strokeStyle = `rgba(255,191,124,${Math.max(0, 1 - e.age)})`
    ctx.beginPath()
    ctx.arc(e.x, e.y, 8 + e.age * 45, 0, Math.PI * 2)
    ctx.stroke()
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4
      ctx.fillStyle = `rgba(255,210,150,${Math.max(0, 1 - e.age)})`
      ctx.fillRect(
        e.x + Math.cos(a) * e.age * 55,
        e.y + Math.sin(a) * e.age * 55,
        2,
        2,
      )
    }
  }
  ctx.restore()
}
