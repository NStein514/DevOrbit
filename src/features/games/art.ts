export const art = {
  space: '/images/arcade/asteroid-escape-space.png',
  ship: '/images/arcade/asteroid-escape-ship.png',
  asteroid: '/images/arcade/asteroid-escape-asteroid.png',
  orb: '/images/arcade/asteroid-escape-orb.png',
  asteroid1: '/images/arcade/asteroid-1.png',
  asteroid2: '/images/arcade/asteroid-2.png',
  asteroid3: '/images/arcade/asteroid-3.png',
  space1: '/images/arcade/space-1.png',
  space2: '/images/arcade/space-2.png',
  space3: '/images/arcade/space-3.png',
  energy1: '/images/arcade/energy-1.png',
  energy2: '/images/arcade/energy-2.png',
  energy3: '/images/arcade/energy-3.png',
  coast: '/images/arcade/ship-coast.png',
  exhaust: '/images/arcade/exhaust.png',
}
export type Sprites = Record<keyof typeof art, HTMLImageElement>
export async function loadSprites(): Promise<Sprites> {
  const entries = await Promise.all(
    Object.entries(art).map(async ([key, url]) => {
      const image = new Image()
      image.src = url
      await image.decode()
      return [key, image]
    }),
  )
  return Object.fromEntries(entries)
}
