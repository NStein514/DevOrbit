export const art = {
  space: '/images/arcade/asteroid-escape-space.png',
  ship: '/images/arcade/asteroid-escape-ship.png',
  asteroid: '/images/arcade/asteroid-escape-asteroid.png',
  orb: '/images/arcade/asteroid-escape-orb.png',
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
