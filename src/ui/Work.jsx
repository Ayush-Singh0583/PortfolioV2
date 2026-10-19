import { selectedWork } from '../lib/journey.js'
import { useReveal } from './About.jsx'
import { EntryCard } from './Timeline.jsx'

// "Selected work": the three projects to see first (journey.selected in content.js), right
// after About, so a visitor in a hurry reaches the best work without the whole journey. The
// cards are the journey's own, with their result bullets, side by side and the same height.
export default function SelectedWork() {
  const root = useReveal()
  if (!selectedWork.length) return null
  return (
    <div className="work-inner" ref={root}>
      <p className="eyebrow reveal">Selected work</p>
      <h2 className="reveal">Three to start with</h2>
      <p className="work-lead reveal">
        The projects I'd show you first. Everything else is in the journey below, year by year.{' '}
        <a href="#journey">See the whole journey ↓</a>
      </p>
      <ol className="work-grid">
        {selectedWork.map((entry, i) => (
          <li key={entry.key} className={`work-card entry entry-project${entry.featured ? ' entry-featured' : ''} reveal`}>
            <EntryCard entry={entry} number={i + 1} heading="h3" />
          </li>
        ))}
      </ol>
    </div>
  )
}
