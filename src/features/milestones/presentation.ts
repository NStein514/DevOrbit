import type { Milestone } from '../workspace/model'

export const milestoneStatusNames: Record<Milestone['status'], string> = {
  planned: 'Planned',
  active: 'In progress',
  completed: 'Completed',
}
export const localToday = (today = new Date()) =>
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
export const isOverdue = (milestone: Milestone, today = localToday()) =>
  milestone.status !== 'completed' &&
  !!milestone.targetDate &&
  milestone.targetDate < today
export const formatTargetDate = (date: string) =>
  date
    ? new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'No target date'
