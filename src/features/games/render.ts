import { HEIGHT, WIDTH, type Flight } from './engine'
import type { Sprites } from './art'

export function renderFlight(
  ctx: CanvasRenderingContext2D,
  flight: Flight,
  sprites: Sprites,
  reducedMotion: boolean,
) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT)
  const sky = sprites.space
  const ratio = Math.max(WIDTH / sky.width, HEIGHT / sky.height) * 1.1
  const offset = reducedMotion ? 0 : Math.sin(flight.elapsed / 20) * 15
  ctx.drawImage(
    sky,
    (WIDTH - sky.width * ratio) / 2,
    (HEIGHT - sky.height * ratio) / 2 + offset,
    sky.width * ratio,
    sky.height * ratio,
  )
  for (const rock of flight.rocks) {
    ctx.save()
    ctx.translate(rock.x, rock.y)
    ctx.rotate(reducedMotion ? 0 : rock.angle)
    const size = rock.radius * 2.6
    ctx.drawImage(sprites.asteroid, -size / 2, -size / 2, size, size)
    ctx.restore()
  }
  for (const orb of flight.energy)
    ctx.drawImage(sprites.orb, orb.x - 25, orb.y - 25, 50, 50)
  ctx.save()
  if (flight.invulnerable > 0) ctx.globalAlpha = 0.55
  ctx.drawImage(sprites.ship, flight.x - 38, flight.y - 40, 76, 76)
  ctx.restore()
  if (flight.heat > 70) {
    ctx.strokeStyle = `rgba(255, 140, 92, ${(flight.heat - 70) / 45})`
    ctx.lineWidth = 6
    ctx.strokeRect(3, 3, WIDTH - 6, HEIGHT - 6)
  }
}
