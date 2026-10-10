import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
export function MarkdownPreview({ notes }: { notes: string }) {
  return (
    <div className="changelog-markdown">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) =>
            href ? (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          img: ({ alt }) => (
            <span className="changelog-image-placeholder">
              [Image: {alt || 'image'}]
            </span>
          ),
        }}
      >
        {notes}
      </Markdown>
    </div>
  )
}
