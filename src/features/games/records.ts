import { z } from 'zod'

export const ARCADE_KEY = 'devorbit.arcade.v1'
const recordSchema = z.object({
  version: z.literal(1),
  bestScore: z.number().int().min(0).max(1000000000),
  bestSeconds: z.number().min(0).max(100000000),
  runs: z.number().int().min(0).max(1000000000),
})
export type ArcadeRecord = z.infer<typeof recordSchema>
export const emptyRecord: ArcadeRecord = {
  version: 1,
  bestScore: 0,
  bestSeconds: 0,
  runs: 0,
}
export function readRecord() {
  try {
    const raw = localStorage.getItem(ARCADE_KEY)
    return {
      record: raw ? recordSchema.parse(JSON.parse(raw)) : emptyRecord,
      error: '',
    }
  } catch {
    return {
      record: emptyRecord,
      error:
        'Arcade records could not be read. You can still play; existing stored data will be preserved.',
    }
  }
}
export function saveRecord(
  points: number,
  seconds: number,
  previous: ArcadeRecord = emptyRecord,
) {
  const current = readRecord()
  const record: ArcadeRecord = {
    version: 1,
    bestScore: Math.min(
      1000000000,
      Math.max(current.record.bestScore, previous.bestScore, points),
    ),
    bestSeconds: Math.min(
      100000000,
      Math.max(current.record.bestSeconds, previous.bestSeconds, seconds),
    ),
    runs: Math.min(
      1000000000,
      Math.max(current.record.runs, previous.runs) + 1,
    ),
  }
  if (current.error) return { record, error: current.error }
  try {
    localStorage.setItem(ARCADE_KEY, JSON.stringify(record))
    return { record, error: '' }
  } catch {
    return {
      record,
      error:
        'This flight is only saved for this visit because browser storage is unavailable.',
    }
  }
}
