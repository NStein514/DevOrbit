import { HEIGHT, WIDTH, type Flight } from './engine.js'
import type { Sprites } from './art.js'

export function visualVariant(id: number) {
  return (Math.imul(id + 1, 2654435761) >>> 0) % 4
}
export function thrusters(flight: Flight) {
  if (flight.status !== 'running')
    return { forward: 0, reverse: 0, left: 0, right: 0 }
  return {
    forward: Math.max(0, -flight.thrustY),
    reverse: Math.max(0, flight.thrustY),
    left: Math.max(0, -flight.thrustX),
    right: Math.max(0, flight.thrustX),
  }
}
export function renderFlight(
  ctx: CanvasRenderingContext2D,
  flight: Flight,
  sprites: Sprites,
  reducedMotion: boolean,
) {
  const time = reducedMotion ? 0 : flight.elapsed
  ctx.clearRect(0, 0, WIDTH, HEIGHT)
  const skies = [sprites.space, sprites.space1, sprites.space2, sprites.space3]
  const sector = Math.floor(time / 35) % skies.length
  const blend = Math.max(0, ((time % 35) - 25) / 10)
  function sky(image: HTMLImageElement, alpha: number) {
    const ratio = Math.max(WIDTH / image.width, HEIGHT / image.height) * 1.18
    ctx.globalAlpha = alpha
    ctx.drawImage(
      image,
      (WIDTH - image.width * ratio) / 2 + Math.sin(time / 29) * 20,
      (HEIGHT - image.height * ratio) / 2 + Math.sin(time / 23) * 28,
      image.width * ratio,
      image.height * ratio,
    )
  }
  sky(skies[sector], 1)
  if (blend > 0)
    sky(skies[(sector + 1) % skies.length], blend * blend * (3 - 2 * blend))
  ctx.globalAlpha = 1
  ctx.fillStyle = '#020c2038'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  for (let i = 0; i < 45; i++) {
    const depth = 1 + (i % 3)
    ctx.globalAlpha = reducedMotion
      ? 0.4
      : 0.3 + Math.sin(time * 0.8 + i) * 0.15
    ctx.fillStyle = '#bcecff'
    ctx.fillRect(
      (i * 83.3) % WIDTH,
      (i * 137.7 + time * depth * 8) % HEIGHT,
      depth * 0.45,
      depth * 0.7,
    )
  }
  ctx.globalAlpha = 1
  const rocks = [
    sprites.asteroid,
    sprites.asteroid1,
    sprites.asteroid2,
    sprites.asteroid3,
  ]
  for (const rock of flight.rocks) {
    ctx.save()
    ctx.translate(rock.x, rock.y)
    ctx.rotate(reducedMotion ? 0 : rock.angle)
    const size = rock.radius * 2.6
    ctx.drawImage(
      rocks[visualVariant(rock.id)],
      -size / 2,
      -size / 2,
      size,
      size,
    )
    ctx.restore()
  }
  const energy = [
    sprites.orb,
    sprites.energy1,
    sprites.energy2,
    sprites.energy3,
  ]
  for (const orb of flight.energy) {
    ctx.save()
    ctx.translate(orb.x, orb.y)
    const pulse = reducedMotion ? 1 : 1 + Math.sin(time * 3 + orb.id) * 0.09
    ctx.rotate(reducedMotion ? 0 : Math.sin(time * 1.5 + orb.id) * 0.25)
    ctx.scale(pulse, pulse)
    ctx.drawImage(energy[visualVariant(orb.id)], -25, -25, 50, 50)
    if (!reducedMotion) {
      ctx.rotate(time * 1.8 + orb.id)
      ctx.globalAlpha = 0.65
      ctx.drawImage(sprites.exhaust, -2, -30, 4, 10)
      ctx.rotate(Math.PI)
      ctx.drawImage(sprites.exhaust, -2, -30, 4, 10)
    }
    ctx.restore()
  }
  const thrust = thrusters(flight)
  const flicker = reducedMotion
    ? 1
    : 0.85 + 0.15 * Math.sin(time * 46) + 0.08 * Math.sin(time * 73)
  function jet(
    x: number,
    y: number,
    angle: number,
    power: number,
    size: number,
  ) {
    if (power < 0.01) return
    ctx.save()
    ctx.translate(flight.x + x, flight.y + y)
    ctx.rotate(angle)
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.8 + power * 0.2
    const length = size * 2.6 * flicker * (0.5 + power * 0.5)
    // Anchor the flame's bright tip (8.5% down the sprite) at the nozzle,
    // keeping the attachment fixed as the plume changes length.
    ctx.drawImage(sprites.exhaust, -size / 2, -length * 0.085, size, length)
    ctx.restore()
  }
  // Plumes point opposite movement; the rear engines fire only while moving forward.
  jet(-8, 19, 0, thrust.forward, 12)
  jet(8, 19, 0, thrust.forward, 12)
  jet(-17, -9, Math.PI, thrust.reverse, 12)
  jet(17, -9, Math.PI, thrust.reverse, 12)
  jet(-26, 6, Math.PI / 2, thrust.right, 13)
  jet(26, 6, -Math.PI / 2, thrust.left, 13)
  ctx.save()
  if (flight.invulnerable > 0) ctx.globalAlpha = 0.7
  ctx.drawImage(sprites.coast, flight.x - 38, flight.y - 40, 76, 76)
  if (flight.invulnerable > 0) {
    ctx.strokeStyle = '#b7f4ff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.ellipse(flight.x, flight.y - 4, 35, 37, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
  if (!reducedMotion)
    for (const effect of flight.effects) {
      ctx.save()
      ctx.globalAlpha = 1 - effect.age / 0.65
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4
        const distance = 12 + effect.age * 65
        ctx.save()
        ctx.translate(
          effect.x + Math.cos(angle) * distance,
          effect.y + Math.sin(angle) * distance,
        )
        ctx.rotate(angle - Math.PI / 2)
        ctx.drawImage(
          effect.kind === 'energy' ? sprites.exhaust : sprites.asteroid1,
          -3,
          -3,
          6,
          10,
        )
        ctx.restore()
      }
      ctx.restore()
    }
  if (flight.heat > 70) {
    ctx.strokeStyle = `rgba(255, 140, 92, ${(flight.heat - 70) / 45})`
    ctx.lineWidth = 6
    ctx.strokeRect(3, 3, WIDTH - 6, HEIGHT - 6)
  }
}
