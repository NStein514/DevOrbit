import { z } from 'zod'

export const repositoryRefSchema = z.object({
  id: z.number().int().positive(),
  owner: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9-]+$/),
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_.-]+$/)
    .refine((s) => s !== '.' && s !== '..'),
})
export const issueRefSchema = z.object({
  repository: repositoryRefSchema,
  number: z.number().int().positive(),
  importedAt: z.iso.datetime(),
})
export type RepositoryRef = z.infer<typeof repositoryRefSchema>
export type IssueRef = z.infer<typeof issueRefSchema>
export interface Repository extends RepositoryRef {
  description: string
  private: boolean
  defaultBranch: string
}
export interface GitHubItem {
  id: number
  number: number
  title: string
  body: string
  state: 'open' | 'closed'
  labels: string[]
  updatedAt: string
  draft: boolean
  merged: boolean
}
export interface GitHubSession {
  user: { login: string } | null
  oauthAvailable: boolean
}
export interface PageResult<T> {
  items: T[]
  nextPage: number | null
}
export const repositoryUrl = (repo: RepositoryRef) =>
  `https://github.com/${repo.owner}/${repo.name}`
export const issueUrl = (ref: IssueRef) =>
  `${repositoryUrl(ref.repository)}/issues/${ref.number}`
