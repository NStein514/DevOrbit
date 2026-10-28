import { holes, type Comet, type Point, type Outcome } from './engine'
import type { GolfSprites } from './art'
export function render(
  ctx: CanvasRenderingContext2D,
  index: number,
  comet: Comet | null,
  trail: Point[],
  preview: Point[],
  time: number,
  reduced: boolean,
  outcome: Outcome | null,
  sprites: GolfSprites | null,
  effectAge: number,
) {
  const h = holes[index]
  ctx.fillStyle = '#06111e'
  ctx.fillRect(0, 0, 1000, 560)
  if (!sprites) return
  ctx.drawImage(sprites.background, 0, 0, 1000, 560)
  ctx.fillStyle = '#06111e44'
  ctx.fillRect(0, 0, 1000, 560)
  for (const [i, p] of h.planets.entries()) {
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(reduced ? i * 0.6 : time * 0.000015 * (i % 2 ? -1 : 1) + i * 0.6)
    ctx.drawImage(
      sprites.planet,
      -p.radius,
      -p.radius,
      p.radius * 2,
      p.radius * 2,
    )
    ctx.restore()
  }
  ctx.save()
  ctx.translate(h.target.x, h.target.y)
  ctx.rotate(reduced ? 0 : time * 0.00025)
  ctx.drawImage(sprites.blackHole, -62, -62, 124, 124)
  ctx.restore()
  ctx.strokeStyle = '#a9f5d5'
  ctx.lineWidth = 1
  ctx.setLineDash([3, 7])
  ctx.beginPath()
  ctx.moveTo(h.tee.x, h.tee.y)
  for (const p of preview) ctx.lineTo(p.x, p.y)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.strokeStyle = '#d1e8ef'
  ctx.beginPath()
  ctx.arc(h.tee.x, h.tee.y, 12, 0, Math.PI * 2)
  ctx.stroke()
  const fade =
    outcome && outcome !== 'flying' ? Math.max(0, 1 - effectAge / 1.5) : 1
  if (trail.length) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const first = Math.max(0, trail.length - 65)
    for (let i = first; i < trail.length; i += 2) {
      const t = (i - first) / Math.max(1, trail.length - first),
        p = trail[i],
        size = 4 + t * 16
      ctx.globalAlpha = (reduced ? 0.2 : t * 0.5) * fade
      ctx.drawImage(sprites.spark, p.x - size / 2, p.y - size / 2, size, size)
    }
    ctx.restore()
  }
  const b = comet ?? h.tee
  if (outcome !== 'sunk' && outcome !== 'collision' && outcome !== 'escaped') {
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.rotate(comet ? Math.atan2(comet.vy, comet.vx) : 0)
    ctx.drawImage(sprites.comet, -7, -7, 14, 14)
    ctx.restore()
  }
  if (
    !reduced &&
    effectAge < 1.5 &&
    (outcome === 'sunk' || outcome === 'collision')
  ) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const center = outcome === 'sunk' ? h.target : b
    for (let i = 0; i < 24; i++) {
      const a =
          (i * Math.PI * 2) / 24 + effectAge * (outcome === 'sunk' ? 4 : 1),
        radius =
          outcome === 'sunk' ? 65 * (1 - effectAge / 1.5) : effectAge * 65
      const x = center.x + Math.cos(a) * radius,
        y = center.y + Math.sin(a) * radius
      ctx.globalAlpha = Math.max(0, 1 - effectAge / 1.5) * 0.8
      ctx.drawImage(sprites.spark, x - 7, y - 7, 14, 14)
    }
    ctx.restore()
  }
}
