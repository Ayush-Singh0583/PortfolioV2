import { useEffect, useRef } from 'react'
import { about } from '../content.js'
import { formatDate, languageColor, projectCount, years } from '../lib/journey.js'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

function summary(entries) {
  const projects = entries.filter((e) => e.kind === 'project').length
  const milestones = entries.length - projects
  return [projects && plural(projects, 'project'), milestones && plural(milestones, 'milestone')].filter(Boolean).join(' · ') || 'Nothing yet'
}

function Entry({ entry }) {
  return (
    <li className={`entry entry-${entry.kind}${entry.featured ? ' entry-featured' : ''} reveal`}>
      <span className="node" aria-hidden="true" />
      <article className="entry-card">
        <p className="entry-meta">
          <span className="badge">{entry.kind === 'project' ? 'Project' : 'Milestone'}</span>
          {entry.featured && <span className="badge badge-featured">Featured</span>}
          {entry.status && <span className="badge badge-status">{entry.status}</span>}
          <time dateTime={entry.date}>{entry.label ?? formatDate(entry.date)}</time>
        </p>
        <h4>{entry.title}</h4>
        <p className="entry-text">{entry.description}</p>
        {entry.highlights && (
          <ul className="highlights">
            {entry.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        )}
        {entry.stack ? (
          <ul className="stack" aria-label="Tech stack">
            {entry.stack.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : (
          entry.languages?.length > 0 && (
            <ul className="langs" aria-label="Languages">
              {entry.languages.map((l) => (
                <li key={l.name}>
                  <span className="dot" style={{ background: languageColor(l.name) }} />
                  {l.name} <em>{l.share}%</em>
                </li>
              ))}
            </ul>
          )
        )}
        {(entry.url || entry.homepage) && (
          <div className="entry-links">
            {entry.url && (
              <a href={entry.url} target="_blank" rel="noreferrer">
                Code ↗
              </a>
            )}
            {entry.homepage && (
              <a href={entry.homepage} target="_blank" rel="noreferrer">
                Live ↗
              </a>
            )}
          </div>
        )}
      </article>
    </li>
  )
}

// The line down the timeline. Several waves of different lengths are blended so it never
// reads as a plain sine, and they drift slowly. It swells when you scroll fast, bends
// toward the pointer like a plucked string (wobbling back when the pointer leaves), and
// fills up to a glowing tip that rides at the middle of the screen. The dots ride the line
// and light up as the tip passes them. On wide screens it runs down the middle; on narrow
// ones it hugs the left.
const waveConfig = () => (window.innerWidth <= 900 ? { amp: 10, pull: 0 } : { amp: 40, pull: 56 })

function useWave(root) {
  useEffect(() => {
    const timeline = root.current.querySelector('.timeline')
    const track = timeline.querySelector('.track')
    const svg = track.querySelector('svg')
    const line = svg.querySelector('.track-line')
    const fill = svg.querySelector('.track-fill')
    const tip = svg.querySelector('.track-tip')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const s = { t: 0, swell: 0, scrollY: window.scrollY, pull: 0, pullV: 0, pullY: 0, pointer: null, raf: 0, last: 0 }
    let cfg, width, height
    let nodes = []

    const measure = () => {
      cfg = waveConfig()
      height = timeline.offsetHeight
      width = Math.ceil((cfg.amp * 1.5 + cfg.pull) * 2 + 24)
      track.style.setProperty('--wave-w', `${width}px`)
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
      svg.setAttribute('width', width)
      svg.setAttribute('height', height)
      nodes = [...timeline.querySelectorAll('.entry')].map((entry) => {
        const el = entry.querySelector('.node')
        return { el, y: entry.offsetTop + el.offsetTop + el.offsetHeight / 2, passed: false }
      })
    }

    const xAt = (y) => {
      const wave = 0.6 * Math.sin(y / 97 + s.t * 0.7) + 0.28 * Math.sin(y / 41 - s.t * 1.1 + 1.7) + 0.12 * Math.sin(y / 233 + s.t * 0.4 + 0.5)
      return cfg.amp * (1 + s.swell) * wave + s.pull * Math.exp(-(((y - s.pullY) / 170) ** 2))
    }

    const frame = (now) => {
      const dt = Math.min((now - (s.last || now)) / 1000, 0.05)
      s.last = now
      const ease = (rate) => 1 - Math.exp(-rate * dt)
      if (!still) s.t += dt
      // Swell with scroll speed.
      const speed = Math.abs(window.scrollY - s.scrollY) / Math.max(dt, 1e-3)
      s.scrollY = window.scrollY
      s.swell += ((still ? 0 : Math.min(speed / 4000, 0.45)) - s.swell) * ease(4)
      // A springy pull toward the pointer, so the line wobbles back when let go.
      const top = timeline.getBoundingClientRect().top
      let pullTarget = 0
      if (s.pointer && cfg.pull) {
        const rect = track.getBoundingClientRect()
        const dx = s.pointer.x - (rect.left + rect.width / 2)
        pullTarget = Math.max(-cfg.pull, Math.min(cfg.pull, dx * 0.6)) * Math.max(0, 1 - Math.abs(dx) / 280)
        s.pullY += (s.pointer.y - top - s.pullY) * ease(10)
      }
      s.pullV = (s.pullV + (pullTarget - s.pull) * 90 * dt) * Math.exp(-7 * dt)
      s.pull += s.pullV * dt

      const tipY = Math.min(Math.max(window.innerHeight * 0.55 - top, 0), height)
      const cx = width / 2
      let d = ''
      let f = ''
      for (let y = 0; y <= height; y += 8) {
        const point = `${(cx + xAt(y)).toFixed(1)},${y}`
        d += (y ? 'L' : 'M') + point
        if (y <= tipY) f += (y ? 'L' : 'M') + point
      }
      const tipX = cx + xAt(tipY)
      line.setAttribute('d', d)
      fill.setAttribute('d', `${f || 'M'}${f ? 'L' : ''}${tipX.toFixed(1)},${tipY.toFixed(1)}`)
      tip.setAttribute('cx', tipX.toFixed(1))
      tip.setAttribute('cy', tipY.toFixed(1))
      tip.style.opacity = tipY > 0 && tipY < height ? 1 : 0
      for (const n of nodes) {
        n.el.style.setProperty('--wave', `${xAt(n.y).toFixed(1)}px`)
        const passed = n.y <= tipY
        if (passed !== n.passed) n.el.classList.toggle('passed', (n.passed = passed))
      }
      s.raf = requestAnimationFrame(frame)
    }

    const onPointer = (e) => (s.pointer = { x: e.clientX, y: e.clientY })
    const onLeave = () => (s.pointer = null)

    // Only animate while the timeline is on screen.
    const visibility = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(s.raf)
      s.last = 0
      if (entry.isIntersecting) s.raf = requestAnimationFrame(frame)
    })
    measure()
    const resize = new ResizeObserver(measure)
    resize.observe(timeline)
    visibility.observe(timeline)
    window.addEventListener('pointermove', onPointer, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(s.raf)
      resize.disconnect()
      visibility.disconnect()
      window.removeEventListener('pointermove', onPointer)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [root])
}

// Year-by-year progress: each year stays pinned on one side of the wave while its
// projects and milestones scroll past on the other, alternating sides year by year.
export default function Timeline() {
  const root = useRef()
  useWave(root)

  useEffect(() => {
    // Fade things in as they scroll into view (once).
    const observer = new IntersectionObserver(
      (seen) => seen.forEach((s) => s.isIntersecting && (s.target.classList.add('in'), observer.unobserve(s.target))),
      { rootMargin: '0px 0px -12% 0px' },
    )
    root.current.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="journey-inner" ref={root}>
      <header className="journey-head reveal">
        <p className="eyebrow">The journey</p>
        <h2>From day one of college to now.</h2>
        <dl className="stats">
          <div>
            <dt>Years</dt>
            <dd>{years.length}</dd>
          </div>
          <div>
            <dt>Projects</dt>
            <dd>{projectCount}</dd>
          </div>
          <div>
            <dt>CGPA</dt>
            <dd>{about.cgpa}</dd>
          </div>
        </dl>
      </header>

      <div className="timeline">
        <div className="track" aria-hidden="true">
          <svg>
            <path className="track-line" />
            <path className="track-fill" />
            <circle className="track-tip" r="5" />
          </svg>
        </div>
        {years.map((y, i) => (
          <section key={y.year} className={`year${i % 2 ? ' flip' : ''}`} aria-label={`${y.title}, ${y.span}`}>
            <div className="year-label">
              <p className="year-span">
                {y.span}
                {y.current && <span className="now">Now</span>}
              </p>
              <h3>{y.title}</h3>
              <p className="year-count">{summary(y.entries)}</p>
            </div>
            <ol className="entries">
              {y.entries.map((entry) => (
                <Entry key={`${entry.kind}-${entry.title}-${entry.date}`} entry={entry} />
              ))}
              {y.entries.length === 0 && <li className="year-empty reveal">No public projects from this year yet.</li>}
            </ol>
          </section>
        ))}
      </div>
    </div>
  )
}
