import { WIDTH, HEIGHT, groundAt, planets, type Mission } from './engine.js'
import type { LunarSprites } from './art.js'
export function renderLunar(
  ctx: CanvasRenderingContext2D,
  game: Mission,
  art: LunarSprites,
  reduced: boolean,
) {
  const theme = (game.level - 1) % 3,
    time = reduced ? 0 : game.elapsed
  const sky = [art.moon, art.ember, art.ice][theme]
  ctx.clearRect(0, 0, WIDTH, HEIGHT)
  const scale = Math.max(WIDTH / sky.width, HEIGHT / sky.height) * 1.04
  ctx.drawImage(
    sky,
    (WIDTH - sky.width * scale) / 2 + Math.sin(time / 20) * 5,
    (HEIGHT - sky.height * scale) / 2,
    sky.width * scale,
    sky.height * scale,
  )
  ctx.fillStyle = '#030b1925'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(0, HEIGHT)
  game.terrain.forEach((p) => ctx.lineTo(p.x, p.y))
  ctx.lineTo(WIDTH, HEIGHT)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(art.surface, 0, 440, WIDTH, WIDTH)
  ctx.fillStyle = ['#08213988', '#4d251a88', '#23184488'][theme]
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.restore()
  ctx.beginPath()
  game.terrain.forEach((p, i) =>
    i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
  )
  ctx.strokeStyle = planets[theme].color
  ctx.lineWidth = 1
  ctx.stroke()
  for (const pad of game.pads) {
    ctx.fillStyle = '#061521'
    ctx.fillRect(pad.x, pad.y, pad.width, 12)
    ctx.fillStyle = pad.bonus ? '#ffd49f' : '#a3f5df'
    ctx.fillRect(pad.x, pad.y, pad.width, 3)
    ctx.globalAlpha = reduced ? 1 : 0.65 + 0.35 * Math.sin(time * 3)
    ctx.shadowBlur = 12
    ctx.shadowColor = ctx.fillStyle
    ctx.fillRect(pad.x, pad.y - 12, 4, 12)
    ctx.fillRect(pad.x + pad.width - 4, pad.y - 12, 4, 12)
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(
      pad.bonus ? 'PRECISION +350' : 'LANDING ZONE',
      pad.x + pad.width / 2,
      pad.y + 28,
    )
  }
  const firing = game.status === 'running'
  function plume(
    x: number,
    y: number,
    angle: number,
    power: number,
    width: number,
    length: number,
  ) {
    if (!firing || power <= 0) return
    ctx.save()
    ctx.translate(game.x + x, game.y + y)
    ctx.rotate(angle)
    const flicker = reduced ? 1 : 0.9 + 0.1 * Math.sin(time * 63)
    ctx.globalCompositeOperation = 'lighter'
    ctx.drawImage(
      art.plume,
      -width / 2,
      -length * 0.1,
      width,
      length * flicker * power,
    )
    ctx.restore()
  }
  plume(0, 19, 0, game.thrust, 20, 52)
  plume(-17, 0, Math.PI / 2, Math.max(0, game.side), 12, 24)
  plume(17, 0, -Math.PI / 2, Math.max(0, -game.side), 12, 24)
  if (game.status !== 'crashed')
    ctx.drawImage(art.lander, game.x - 27, game.y - 27, 54, 54)
  const near = groundAt(game, game.x) - game.y < 110
  if (
    !reduced &&
    ((firing && game.thrust > 0 && near) ||
      ((game.status === 'landed' || game.status === 'crashed') &&
        game.effectAge < 1.2))
  ) {
    const burst = game.status !== 'running',
      age = burst ? game.effectAge : time % 1
    for (let i = 0; i < 14; i++) {
      const spread = (i - 6.5) * (5 + age * 8)
      ctx.globalAlpha = (1 - age / 1.2) * 0.45
      ctx.drawImage(
        art.plume,
        game.x + spread - 8,
        groundAt(game, game.x) - 12 - Math.sin(i * 2 + age) * 8,
        16 + age * 12,
        8 + age * 7,
      )
    }
    ctx.globalAlpha = 1
  }
  if (game.status === 'running') {
    ctx.setLineDash([3, 8])
    ctx.strokeStyle = '#a0d8da44'
    ctx.beginPath()
    ctx.moveTo(game.x, game.y + 30)
    ctx.lineTo(game.x, groundAt(game, game.x) - 15)
    ctx.stroke()
    ctx.setLineDash([])
  }
}
