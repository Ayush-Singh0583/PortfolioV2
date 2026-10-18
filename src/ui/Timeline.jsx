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

// The line down the timeline behaves like a string. At rest it is a calm, meandering
// curve whose bends lean toward each year's label. It only moves when you do:
// scrolling sets it humming at the glowing tip, and sweeping the mouse across it plucks
// it. The ripples travel along the line and fade (a small 1D wave simulation), and the
// dots ride them. The line fills down to the tip at mid-screen; dots light as it passes.
const STEP = 8 // px between simulated points

function useWave(root) {
  useEffect(() => {
    const timeline = root.current.querySelector('.timeline')
    const track = timeline.querySelector('.track')
    const svg = track.querySelector('svg')
    const line = svg.querySelector('.track-line')
    const fill = svg.querySelector('.track-fill')
    const tip = svg.querySelector('.track-tip')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const s = { raf: 0, last: 0, scrollY: window.scrollY, hum: 0, phase: 0, pointer: null, prev: null, tipY: -1, dirty: true }
    let compact, width, height, count, rest, u, v
    let nodes = []

    const measure = () => {
      compact = window.innerWidth <= 900
      const bend = compact ? 7 : 42
      height = timeline.offsetHeight
      count = Math.floor(height / STEP) + 1
      width = compact ? 44 : 2 * (bend + 34) + 24
      track.style.setProperty('--wave-w', `${width}px`)
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
      svg.setAttribute('width', width)
      svg.setAttribute('height', height)
      // Rest shape: a meander whose bend length drifts between ~700 and ~1200px (so it
      // never looks like a plain sine), leaning toward each year's label: left for odd
      // years, right for even ones.
      const years = [...timeline.querySelectorAll('.year')].map((el, i) => ({
        top: el.offsetTop,
        bottom: el.offsetTop + el.offsetHeight,
        side: el.classList.contains('flip') || (compact && i % 2) ? 1 : -1,
      }))
      rest = new Float32Array(count)
      let phase = 0
      for (let i = 0; i < count; i++) {
        const y = i * STEP
        const year = years.find((yr) => y < yr.bottom) ?? years.at(-1)
        const p = Math.min(1, Math.max(0, (y - year.top) / (year.bottom - year.top)))
        phase += (2 * Math.PI * STEP) / (950 + 250 * Math.sin(y / 1300 + 0.7))
        rest[i] = bend * (0.7 * Math.sin(phase) + 0.45 * year.side * Math.sin(Math.PI * p))
      }
      u = new Float32Array(count) // displacement from rest
      v = new Float32Array(count) // its velocity
      nodes = [...timeline.querySelectorAll('.entry')].map((entry) => {
        const el = entry.querySelector('.node')
        const y = entry.offsetTop + el.offsetTop + el.offsetHeight / 2
        return { el, y, i: Math.min(count - 1, Math.round(y / STEP)), passed: false }
      })
      s.dirty = true
    }

    // Push the string sideways around index i (a soft, few-point-wide touch).
    const nudge = (i, amount) => {
      for (let k = -3; k <= 3; k++) {
        const j = i + k
        if (j > 0 && j < count - 1) v[j] += amount * Math.exp(-(k * k) / 4)
      }
    }

    const frame = (now) => {
      const dt = Math.min((now - (s.last || now)) / 1000, 1 / 30)
      s.last = now
      const top = timeline.getBoundingClientRect().top
      const tipY = Math.min(Math.max(window.innerHeight * 0.55 - top, 0), height)
      const tipI = Math.round(tipY / STEP)

      if (!still && dt > 0) {
        // Scrolling makes the string hum at the tip, in proportion to speed.
        const speed = Math.abs(window.scrollY - s.scrollY) / dt
        s.hum += (Math.min(speed * 0.004, compact ? 4 : 9) - s.hum) * (1 - Math.exp(-5 * dt))
        s.phase += dt * 11
        if (s.hum > 0.05) nudge(tipI, s.hum * 780 * Math.cos(s.phase) * dt)

        // Sweeping the mouse across the line plucks it.
        if (s.pointer && s.prev && !compact) {
          const rect = track.getBoundingClientRect()
          const i = Math.round((s.pointer.y - top) / STEP)
          if (i > 0 && i < count - 1) {
            const lineX = rect.left + width / 2 + rest[i] + u[i]
            const was = s.prev.x - lineX
            const now = s.pointer.x - lineX
            if (Math.abs(now) < 26 || Math.sign(was) !== Math.sign(now)) {
              nudge(i, Math.max(-900, Math.min(900, (s.pointer.x - s.prev.x) / dt)) * 0.5)
            }
          }
        }
      }
      s.prev = s.pointer && { ...s.pointer }

      // Wave equation, a few substeps for stability; ripples fade over about a second.
      let energy = 0
      const steps = 3
      const h = dt / steps
      const c2 = (compact ? 520 : 680) ** 2 / (STEP * STEP)
      for (let k = 0; k < steps; k++) {
        for (let i = 1; i < count - 1; i++) v[i] += c2 * (u[i - 1] - 2 * u[i] + u[i + 1]) * h
        const fade = Math.exp(-3.4 * h)
        for (let i = 1; i < count - 1; i++) {
          v[i] *= fade
          u[i] += v[i] * h
        }
      }
      for (let i = 0; i < count; i += 4) energy = Math.max(energy, Math.abs(u[i]))

      // Redraw only when something moved.
      if (energy > 0.02 || tipY !== s.tipY || s.dirty) {
        s.tipY = tipY
        s.dirty = energy > 0.02
        const cx = width / 2
        let d = ''
        let f = ''
        for (let i = 0; i < count; i++) {
          const point = `${(cx + rest[i] + u[i]).toFixed(1)},${i * STEP}`
          d += (i ? 'L' : 'M') + point
          if (i * STEP <= tipY) f += (i ? 'L' : 'M') + point
        }
        const tipX = cx + rest[Math.min(tipI, count - 1)] + u[Math.min(tipI, count - 1)]
        line.setAttribute('d', d)
        fill.setAttribute('d', `${f || 'M'}${f ? 'L' : ''}${tipX.toFixed(1)},${tipY.toFixed(1)}`)
        tip.setAttribute('cx', tipX.toFixed(1))
        tip.setAttribute('cy', tipY.toFixed(1))
        tip.style.opacity = tipY > 0 && tipY < height ? 1 : 0
        for (const n of nodes) {
          n.el.style.setProperty('--wave', `${(rest[n.i] + u[n.i]).toFixed(1)}px`)
          const passed = n.y <= tipY
          if (passed !== n.passed) n.el.classList.toggle('passed', (n.passed = passed))
        }
      }
      s.scrollY = window.scrollY
      s.raf = requestAnimationFrame(frame)
    }

    const onPointer = (e) => (s.pointer = { x: e.clientX, y: e.clientY })
    const onLeave = () => (s.pointer = s.prev = null)

    // Only run while the timeline is on screen.
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
