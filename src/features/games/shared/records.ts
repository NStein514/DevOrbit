import { z } from 'zod'
export type GameId = 'orbit-architect' | 'gravity-golf'
const schema = z.object({
  best: z.number().int().min(0).max(1e9),
  medals: z.array(z.number().int().min(0).max(3)).max(6),
})
export function readGameRecord(game: GameId) {
  try {
    const raw = localStorage.getItem(`devorbit.${game}.v1`)
    return {
      record: raw
        ? schema.parse(JSON.parse(raw))
        : { best: 0, medals: [] as number[] },
      error: '',
    }
  } catch {
    return {
      record: { best: 0, medals: [] as number[] },
      error:
        'Personal bests could not be read. You can still play; existing data will be preserved.',
    }
  }
}
export function saveGameRecord(
  game: GameId,
  index: number,
  stars: number,
  result = 0,
) {
  const saved = readGameRecord(game)
  if (saved.error) return saved
  const medals = [...saved.record.medals]
  while (medals.length <= index) medals.push(0)
  medals[index] = Math.max(medals[index], stars)
  const best =
    game === 'gravity-golf'
      ? result > 0
        ? Math.min(saved.record.best || result, result)
        : saved.record.best
      : medals.reduce((a, b) => a + b, 0)
  const record = schema.parse({ best, medals })
  try {
    localStorage.setItem(`devorbit.${game}.v1`, JSON.stringify(record))
    return { record, error: '' }
  } catch {
    return {
      record,
      error:
        'This result is available for this visit only. Browser storage is unavailable.',
    }
  }
}
