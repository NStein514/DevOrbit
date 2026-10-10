import { Github, ArrowUpRight } from 'lucide-react'
import { issueUrl, type IssueRef } from '../../../shared/github'

export function GitHubSource({ source }: { source: IssueRef }) {
  return (
    <p className="github-source">
      <a
        className="text-link"
        href={issueUrl(source)}
        target="_blank"
        rel="noreferrer"
      >
        <Github size={14} /> {source.repository.owner}/{source.repository.name}{' '}
        #{source.number} <ArrowUpRight size={13} />
      </a>
      <small>Imported from GitHub. Local edits stay in DevOrbit.</small>
    </p>
  )
}
