export const golfArt = {
  background: '/images/arcade/golf/background.png',
  planet: '/images/arcade/golf/planet.png',
  blackHole: '/images/arcade/golf/black-hole.png',
  comet: '/images/arcade/golf/comet.png',
  spark: '/images/arcade/golf/spark.png',
}
export type GolfSprites = Record<keyof typeof golfArt, HTMLImageElement>
export async function loadGolfArt(): Promise<GolfSprites> {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(golfArt).map(async ([key, url]) => {
        const image = new Image()
        image.src = url
        await image.decode()
        return [key, image]
      }),
    ),
  ) as GolfSprites
}
