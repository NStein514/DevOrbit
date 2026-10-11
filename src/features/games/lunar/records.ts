import { z } from 'zod'
export const LUNAR_RECORD_KEY = 'devorbit.lunar.v1'
const schema = z.object({
  score: z.number().int().min(0).max(1e12),
  landings: z.number().int().min(0).max(1e8),
})
export function readLunarRecord() {
  try {
    const raw = localStorage.getItem(LUNAR_RECORD_KEY)
    return {
      record: raw ? schema.parse(JSON.parse(raw)) : { score: 0, landings: 0 },
      error: '',
    }
  } catch {
    return {
      record: { score: 0, landings: 0 },
      error:
        'Lunar records are unavailable. You can still play; stored data will be preserved.',
    }
  }
}
export function saveLunarRecord(score: number, landings: number) {
  const saved = readLunarRecord()
  if (saved.error) return saved
  const record = {
    score: Math.min(1e12, Math.max(saved.record.score, score)),
    landings: Math.min(1e8, Math.max(saved.record.landings, landings)),
  }
  try {
    localStorage.setItem(LUNAR_RECORD_KEY, JSON.stringify(record))
    return { record, error: '' }
  } catch {
    return {
      record,
      error:
        'Your best flight is saved for this visit only. Browser storage is unavailable.',
    }
  }
}
