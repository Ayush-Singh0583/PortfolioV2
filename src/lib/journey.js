import github from '../data/github.json'
import { about, journey } from '../content.js'

const start = new Date(journey.collegeStart)

export function academicYear(date) {
  const d = new Date(date)
  let years = d.getFullYear() - start.getFullYear()
  const beforeAnniversary = d.getMonth() < start.getMonth() || (d.getMonth() === start.getMonth() && d.getDate() < start.getDate())
  if (beforeAnniversary) years -= 1
  return years + 1
}

function yearSpan(n) {
  const y = start.getFullYear() + n - 1
  return `${y}–${String(y + 1).slice(2)}`
}

// GitHub's own language colours.
const LANGUAGE_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572a5',
  'C++': '#f34b7d',
  C: '#8a8a8a',
  HTML: '#e34c26',
  CSS: '#663399',
  Makefile: '#427819',
  'Jupyter Notebook': '#da5b0b',
  Shell: '#89e051',
  Java: '#b07219',
  Go: '#00add8',
  Rust: '#dea584',
}
export const languageColor = (name) => LANGUAGE_COLORS[name] ?? '#9a968c'

export const formatDate = (date) => new Date(date).toLocaleDateString('en', { month: 'short', year: 'numeric' })

// "smart-todo-pro" -> "Smart Todo Pro"
const prettify = (name) => name.replace(/[-_]+/g, ' ').trim().replace(/\b[a-z]/g, (c) => c.toUpperCase())

function topLanguages(languages) {
  const entries = Object.entries(languages ?? {})
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0)
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([name, bytes]) => ({ name, share: total ? Math.round((bytes / total) * 100) : 0 }))
    .filter((l) => l.share >= 1)
    .slice(0, 3)
}

const projects = github.repos
  .filter((r) => !journey.hideRepos.includes(r.name))
  .map((r) => {
    const o = journey.repoOverrides[r.name] ?? {}
    const languages = topLanguages(r.languages)
    return {
      kind: 'project',
      date: r.created_at,
      title: o.title ?? prettify(r.name),
      description: o.description ?? (r.description?.trim() || `A ${languages[0]?.name ?? 'side'} project.`),
      languages,
      url: r.url,
      homepage: r.homepage,
      featured: o.featured ?? false,
      stack: o.stack,
      highlights: o.highlights,
    }
  })
  .concat(journey.extraProjects.map((p) => ({ kind: 'project', languages: [], ...p })))

// Milestones, plus any résumé highlight that has been given a date.
const milestones = [
  ...journey.milestones,
  ...about.highlights.filter((h) => h.date).map((h) => ({ date: h.date, title: `${h.title}${h.org ? `, ${h.org}` : ''}`, text: h.text })),
].map((m) => ({ kind: 'milestone', ...m, description: m.text }))

const currentYear = academicYear(new Date())

// Everything grouped by academic year, oldest first. Years with nothing in them still
// appear, so the timeline has no gaps.
const entries = [...projects, ...milestones].sort((a, b) => new Date(a.date) - new Date(b.date))
const lastYear = Math.max(currentYear, ...entries.map((e) => academicYear(e.date)))
export const years = Array.from({ length: lastYear }, (_, i) => ({
  year: i + 1,
  title: `Year ${i + 1}`,
  span: yearSpan(i + 1),
  current: i + 1 === currentYear,
  entries: entries.filter((e) => academicYear(e.date) === i + 1),
}))

export const projectCount = projects.length
