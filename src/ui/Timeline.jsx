import { useEffect, useRef } from 'react'
import { about, journey } from '../content.js'
import { formatDate, languageColor, projectCount, years } from '../lib/journey.js'
import { scrollToY } from '../lib/store.js'
import { clamp, smoothstep } from '../lib/math.js'

// 'stack': each year pins in place while its cards slide in and stack up (default).
// 'list': each year's cards scroll past in a column.
const STACKED = journey.layout !== 'list'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

function summary(entries) {
  const projects = entries.filter((e) => e.kind === 'project').length
  const milestones = entries.length - projects
  return [projects && plural(projects, 'project'), milestones && plural(milestones, 'milestone')].filter(Boolean).join(' · ') || 'Nothing yet'
}

// One project or milestone. In the deck every card is the same size: header and text at
// the top, a footer (language bar, stack, links) pinned to the bottom, and a large faint
// number in the corner so lighter cards don't look empty.
function Entry({ entry, inDeck, number }) {
  return (
    <li className={`entry entry-${entry.kind}${entry.featured ? ' entry-featured' : ''}${inDeck ? ' deck-card' : ' reveal'}`}>
      {!inDeck && <span className="node" aria-hidden="true" />}
      <article className="entry-card">
        {inDeck && (
          <span className="card-number" aria-hidden="true">
            {String(number).padStart(2, '0')}
          </span>
        )}
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
        {inDeck && !entry.highlights && entry.updated && (
          <dl className="facts">
            <div>
              <dt>Started</dt>
              <dd>{formatDate(entry.date)}</dd>
            </div>
            <div>
              <dt>Last update</dt>
              <dd>{formatDate(entry.updated)}</dd>
            </div>
            <div>
              <dt>Languages</dt>
              <dd>{entry.languages.length}</dd>
            </div>
          </dl>
        )}
        <div className="card-foot">
          {entry.languages?.length > 0 && (
            <div className="langbar" aria-hidden="true">
              {entry.languages.map((l) => (
                <span key={l.name} style={{ flexGrow: l.share, background: languageColor(l.name) }} />
              ))}
            </div>
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
        </div>
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

function useWave(root, stacked) {
  useEffect(() => {
    const timeline = root.current.querySelector('.timeline')
    const track = timeline.querySelector('.track')
    const svg = track.querySelector('svg')
    const line = svg.querySelector('.track-line')
    const fill = svg.querySelector('.track-fill')
    const tip = svg.querySelector('.track-tip')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const s = { raf: 0, last: 0, scrollY: window.scrollY, hum: 0, phase: 0, pointer: null, prev: null, tipY: -1, dirty: true }
    let compact, width, height, count, rest, u, v, w
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
      const years = [...timeline.querySelectorAll('.year, .chapter')].map((el, i) => ({
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
      w = new Float32Array(count) // scratch
      nodes = stacked ? stackNodes(timeline) : listNodes(timeline)
      for (const n of nodes) n.i = Math.min(count - 1, Math.round(n.y / STEP))
      s.dirty = true
    }

    // Push the string sideways around index i. The touch is wide and soft, so the ripples
    // it starts are smooth rather than jagged.
    const nudge = (i, amount) => {
      for (let k = -6; k <= 6; k++) {
        const j = i + k
        if (j > 0 && j < count - 1) v[j] += amount * 0.55 * Math.exp(-(k * k) / 10)
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

      // Wave equation. Enough substeps to stay well inside the stability limit even on a
      // slow frame; a little viscosity smooths away fine wiggles; ripples fade in about a second.
      let energy = 0
      const c = compact ? 520 : 680
      const steps = Math.max(3, Math.ceil((c * dt) / (STEP * 0.3)))
      const h = dt / steps
      const c2 = (c * c) / (STEP * STEP)
      const fade = Math.exp(-2.6 * h)
      for (let k = 0; k < steps; k++) {
        for (let i = 1; i < count - 1; i++) v[i] += c2 * (u[i - 1] - 2 * u[i] + u[i + 1]) * h
        w.set(v)
        for (let i = 1; i < count - 1; i++) {
          v[i] = (w[i] + 0.06 * (w[i - 1] - 2 * w[i] + w[i + 1])) * fade
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
  }, [root, stacked])
}

// Dots for the list layout: one beside each card.
const listNodes = (timeline) =>
  [...timeline.querySelectorAll('.entry')].map((entry) => {
    const el = entry.querySelector('.node')
    return { el, y: entry.offsetTop + el.offsetTop + el.offsetHeight / 2, passed: false }
  })

// Dots for the stacked layout live on the track, placed so the glowing tip (at 55% of
// the screen) reaches each one exactly as its card lands on the deck.
function stackNodes(timeline) {
  const dots = [...timeline.querySelectorAll('.track .node')]
  const vh = window.innerHeight
  const nodes = []
  for (const chapter of timeline.querySelectorAll('.chapter')) {
    const n = +chapter.dataset.count
    const land = landSpan(chapter, vh)
    for (let k = 0; k < n; k++) {
      const el = dots[nodes.length]
      const y = chapter.offsetTop + (n > 1 ? (k / (n - 1)) * land : 0) + vh * 0.55
      el.style.top = `${y}px`
      nodes.push({ el, y, passed: false })
    }
  }
  return nodes
}

// How far you scroll through a chapter while its cards arrive (the rest is a short pause
// on the last card before the next year).
const landSpan = (chapter, vh) => Math.max(1, chapter.offsetHeight - vh * 1.25)

// The stacked layout: as you scroll through a year, each card slides up and lands on the
// one before; earlier cards shrink back and darken. The year's list of titles marks the
// card on top, and clicking a title scrolls to its card.
function useStack(root, enabled) {
  useEffect(() => {
    if (!enabled) return
    const chapters = [...root.current.querySelectorAll('.chapter')].map((el) => ({
      el,
      cards: [...el.querySelectorAll('.deck-card')],
      items: [...el.querySelectorAll('.chapter-index li')],
      active: -1,
    }))
    let raf = 0
    const update = () => {
      raf = 0
      const vh = window.innerHeight
      for (const c of chapters) {
        const rect = c.el.getBoundingClientRect()
        if (rect.bottom < -vh || rect.top > vh * 2) continue
        const n = c.cards.length
        const q = n > 1 ? clamp(-rect.top / landSpan(c.el, vh)) * (n - 1) : 0
        c.cards.forEach((card, k) => {
          const enter = k === 0 ? 1 : smoothstep(clamp(q - k + 1))
          const cover = clamp(q - k, 0, 3)
          card.style.transform =
            `translateY(${((1 - enter) * 80).toFixed(2)}vh) translateY(${(-cover * 16).toFixed(1)}px) ` +
            `scale(${(1 - cover * 0.05).toFixed(3)}) rotate(${((1 - enter) * 4).toFixed(2)}deg)`
          card.style.setProperty('--cover', (cover / 3).toFixed(3))
          card.style.visibility = enter < 0.001 ? 'hidden' : 'visible'
        })
        const active = Math.round(q)
        if (active !== c.active) {
          c.active = active
          c.items.forEach((li, k) => {
            li.classList.toggle('active', k === active)
            li.classList.toggle('done', k < active)
          })
        }
      }
    }
    const onScroll = () => (raf ||= requestAnimationFrame(update))
    const jumps = chapters.flatMap((c) =>
      c.items.map((li, k) => {
        const go = () => {
          const n = c.cards.length
          const top = c.el.getBoundingClientRect().top + window.scrollY
          scrollToY(top + (n > 1 ? (k / (n - 1)) * landSpan(c.el, window.innerHeight) : 0) + 2)
        }
        li.addEventListener('click', go)
        return () => li.removeEventListener('click', go)
      }),
    )
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      jumps.forEach((off) => off())
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [root, enabled])
}

function YearHeading({ y }) {
  return (
    <>
      <p className="year-span">
        {y.span}
        {y.current && <span className="now">Now</span>}
      </p>
      <h3>{y.title}</h3>
      <p className="year-count">{summary(y.entries)}</p>
    </>
  )
}

// Year-by-year progress, alternating sides of the wave year by year (see STACKED).
export default function Timeline() {
  const root = useRef()
  useWave(root, STACKED)
  useStack(root, STACKED)

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

      <div className={`timeline${STACKED ? ' stacked' : ''}`}>
        <div className="track" aria-hidden="true">
          <svg>
            <path className="track-line" />
            <path className="track-fill" />
            <circle className="track-tip" r="5" />
          </svg>
          {STACKED && years.flatMap((y) => y.entries.map((e) => <span key={`${y.year}-${e.title}`} className={`node node-${e.kind}`} />))}
        </div>
        {years.map((y, i) =>
          STACKED ? (
            <section
              key={y.year}
              className={`chapter${i % 2 ? ' flip' : ''}`}
              data-count={y.entries.length}
              style={{ '--count': Math.max(y.entries.length, 1) }}
              aria-label={`${y.title}, ${y.span}`}
            >
              <div className="chapter-stage">
                <div className="chapter-label">
                  <YearHeading y={y} />
                  {y.entries.length > 1 && (
                    <ol className="chapter-index">
                      {y.entries.map((e) => (
                        <li key={e.title}>{e.title}</li>
                      ))}
                    </ol>
                  )}
                </div>
                <ol className="deck">
                  {y.entries.map((entry, k) => (
                    <Entry key={`${entry.kind}-${entry.title}-${entry.date}`} entry={entry} inDeck number={k + 1} />
                  ))}
                  {y.entries.length === 0 && <li className="year-empty">No public projects from this year yet.</li>}
                </ol>
              </div>
            </section>
          ) : (
            <section key={y.year} className={`year${i % 2 ? ' flip' : ''}`} aria-label={`${y.title}, ${y.span}`}>
              <div className="year-label">
                <YearHeading y={y} />
              </div>
              <ol className="entries">
                {y.entries.map((entry) => (
                  <Entry key={`${entry.kind}-${entry.title}-${entry.date}`} entry={entry} />
                ))}
                {y.entries.length === 0 && <li className="year-empty reveal">No public projects from this year yet.</li>}
              </ol>
            </section>
          ),
        )}
      </div>
    </div>
  )
}
