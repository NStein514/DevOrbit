export type ProjectStatus = 'In orbit' | 'Pre-launch'

export interface Project {
  id: string
  name: string
  description: string
  category: string
  status: ProjectStatus
  completed: number
  total: number
  milestone: string
  color: 'mint' | 'lavender' | 'peach'
}
