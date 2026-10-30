import { hazardPosition, type Hazard } from './hazards'
export function renderHazards(
  ctx: CanvasRenderingContext2D,
  hazards: Hazard[],
  time: number,
  sprite: HTMLImageElement,
  reduced: boolean,
) {
  ctx.save()
  for (const [i, h] of hazards.entries()) {
    ctx.strokeStyle = '#ffbe7b55'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 7])
    ctx.beginPath()
    if (h.rx || h.ry) {
      for (let n = 0; n <= 80; n++) {
        const a = (n * Math.PI * 2) / 80,
          x = h.x + h.rx * Math.cos(a),
          y = h.y + h.ry * Math.sin(a)
        if (n) ctx.lineTo(x, y)
        else ctx.moveTo(x, y)
      }
      ctx.stroke()
    }
    ctx.setLineDash([])
    const p = hazardPosition(h, time)
    ctx.save()
    ctx.translate(p.x, p.y)
    // Keep essential movement in reduced-motion mode; suppress only tumbling/glow.
    ctx.rotate(reduced ? i : time * 0.25 + i)
    if (!reduced) {
      ctx.shadowColor = '#ff9e58'
      ctx.shadowBlur = 8
    }
    ctx.drawImage(sprite, -h.radius, -h.radius, h.radius * 2, h.radius * 2)
    ctx.restore()
    ctx.strokeStyle = '#ffd099'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(p.x, p.y, h.radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#ffdbab'
    ctx.font = '10px sans-serif'
    ctx.fillText(`D${i + 1}`, p.x + h.radius + 4, p.y - 5)
    if (h.period > 0) {
      const next = hazardPosition(h, time + 0.45),
        a = Math.atan2(next.y - p.y, next.x - p.x),
        r = h.radius + 7
      ctx.beginPath()
      ctx.moveTo(p.x + Math.cos(a) * (r + 9), p.y + Math.sin(a) * (r + 9))
      ctx.lineTo(p.x + Math.cos(a + 0.35) * r, p.y + Math.sin(a + 0.35) * r)
      ctx.lineTo(p.x + Math.cos(a - 0.35) * r, p.y + Math.sin(a - 0.35) * r)
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.restore()
}
