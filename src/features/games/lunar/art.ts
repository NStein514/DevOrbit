export const lunarArt = {
  lander: '/images/arcade/lunar/lander.png',
  moon: '/images/arcade/lunar/moon.png',
  ember: '/images/arcade/lunar/ember.png',
  ice: '/images/arcade/lunar/ice.png',
  plume: '/images/arcade/lunar/plume.png',
  surface: '/images/arcade/lunar/surface.png',
}
export type LunarSprites = Record<keyof typeof lunarArt, HTMLImageElement>
export async function loadLunarArt(): Promise<LunarSprites> {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(lunarArt).map(async ([key, url]) => {
        const image = new Image()
        image.src = url
        await image.decode()
        return [key, image]
      }),
    ),
  )
}
