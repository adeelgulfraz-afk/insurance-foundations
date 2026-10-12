import { parseInline, parseMarkdown } from '../lib/markdown'

const Inline = ({ text }: { text: string }) => (
  <>
    {parseInline(text).map((r, i) =>
      r.bold ? <strong key={i}>{r.text}</strong> : r.italic ? <em key={i}>{r.text}</em> : <span key={i}>{r.text}</span>,
    )}
  </>
)

export default function Markdown({ body }: { body: string }) {
  return (
    <>
      {parseMarkdown(body).map((b, i) => {
        switch (b.type) {
          case 'p': return <p key={i}><Inline text={b.text} /></p>
          case 'h3': return <h3 key={i}><Inline text={b.text} /></h3>
          case 'ul': return <ul key={i}>{b.items.map((t, j) => <li key={j}><Inline text={t} /></li>)}</ul>
          case 'ol': return <ol key={i}>{b.items.map((t, j) => <li key={j}><Inline text={t} /></li>)}</ol>
        }
      })}
    </>
  )
}
