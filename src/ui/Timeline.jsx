import { useEffect, useRef } from 'react'
import { about, journey } from '../content.js'
import { formatDate, languageColor, projectCount, years } from '../lib/journey.js'
import { glideActive, glideTo, isGliding, scrollAim, scrollToY, stableHeight, stopGlide } from '../lib/store.js'
import { clamp, smoothstep } from '../lib/math.js'

// How each year's projects are shown (journey.layout in content.js):
// 'ring' (default): the year pins in place while its cards turn on a 3D ring, oldest first,
//   the front one zoomed in, with a circular dial showing where you are; then the page
//   scrolls on to the next year. ('carousel' is accepted as an old name for it.)
// 'stack': the year pins in place while its cards slide in and stack up like a deck.
// 'list': each year's cards scroll past in a column.
const LAYOUT = ['stack', 'list'].includes(journey.layout) ? journey.layout : 'ring'
const PINNED = LAYOUT !== 'list'
const STACKED = LAYOUT === 'stack'
const RING = LAYOUT === 'ring'

const pad2 = (n) => String(n).padStart(2, '0')

const plural = (n, word) => `${n}\u00a0${word}${n === 1 ? '' : 's'}` // kept on one line

function summary(entries) {
  const projects = entries.filter((e) => e.kind === 'project').length
  const milestones = entries.length - projects
  return [projects && plural(projects, 'project'), milestones && plural(milestones, 'milestone')].filter(Boolean).join(' · ') || 'Nothing yet'
}

// One project or milestone card. In the deck, every card in a year is the same size (see
// useCardSizes): header at the top, the body (description, bullets or quick facts) in the
// middle, a footer (language bar, stack, links) pinned to the bottom, and a large faint
// number in the corner so lighter cards don't look empty. Also used by "Selected work"
// (Work.jsx): `number` adds the faint number, `facts` the quick facts on lighter cards, and
// `heading` sets the title's level.
export function EntryCard({ entry, number, facts, heading: Heading = 'h4' }) {
  return (
    <article className="entry-card">
      {number > 0 && (
        <span className="card-number" aria-hidden="true">
          {pad2(number)}
        </span>
      )}
      <p className="entry-meta">
        <span className="badge">{entry.kind === 'project' ? 'Project' : 'Milestone'}</span>
        {entry.featured && <span className="badge badge-featured">Featured</span>}
        {entry.status && <span className="badge badge-status">{entry.status}</span>}
        <time dateTime={entry.date}>{entry.label ?? formatDate(entry.date)}</time>
      </p>
      <Heading>{entry.title}</Heading>
      <div className="card-body">
        <p className="entry-text">{entry.description}</p>
        {entry.highlights && (
          <ul className="highlights">
            {entry.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        )}
        {facts && !entry.highlights && entry.updated && (
          <dl className="facts">
            <div>
              <dt>Started</dt>
              <dd>{entry.label ?? formatDate(entry.date)}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatDate(entry.updated)}</dd>
            </div>
            {entry.languages.length > 0 && (
              <div>
                <dt>Languages</dt>
                <dd>{entry.languages.length}</dd>
              </div>
            )}
          </dl>
        )}
      </div>
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
                View code ↗
              </a>
            )}
            {entry.homepage && (
              <a href={entry.homepage} target="_blank" rel="noreferrer">
                Visit site ↗
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

function Entry({ entry, inDeck, number }) {
  return (
    <li className={`entry entry-${entry.kind}${entry.featured ? ' entry-featured' : ''}${inDeck ? ' deck-card' : ' reveal'}`}>
      {!inDeck && <span className="node" aria-hidden="true" />}
      <EntryCard entry={entry} number={inDeck ? number : 0} facts={inDeck} />
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
    if (!track) return // the ring layout has a circular dial per year instead (useStack)
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
  const vh = stableHeight()
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

// Every card in a deck is as tall as the tallest one in it (measured from the real
// content), so the pile lines up and no text is cut off. If that is more than the screen
// can show, the cards are capped and only their body scrolls.
function useCardSizes(root, enabled) {
  useEffect(() => {
    if (!enabled) return
    const decks = [...root.current.querySelectorAll('.deck')]
    let raf = 0
    const measure = () => {
      raf = 0
      const compact = window.innerWidth <= 900
      for (const deck of decks) {
        const cards = [...deck.querySelectorAll('.entry-card')]
        if (!cards.length) continue
        for (const card of cards) card.style.height = 'auto'
        const need = Math.max(...cards.map((card) => card.offsetHeight))
        for (const card of cards) card.style.height = ''
        // Room left in the pinned stage. Ring: the row's own height (it takes the space below
        // the year heading), less room for the focus border and shadow. Stack: below the top
        // bar, with space for the pile's edges.
        const room = deck.closest('.ring')
          ? deck.clientHeight - 16 - (parseFloat(getComputedStyle(deck).getPropertyValue('--skip-room')) || 0)
          : compact
            ? deck.parentElement.clientHeight - deck.offsetTop - 24
            : window.innerHeight - 176
        const h = `${Math.max(240, Math.min(need, room))}px`
        deck.style.setProperty('--card-h', h)
        deck.closest('.ring-wrap')?.style.setProperty('--card-h', h) // the row under the card needs it too
        for (const card of cards) {
          const body = card.querySelector('.card-body')
          card.classList.toggle('overflowing', body.scrollHeight > body.clientHeight + 1)
          const li = card.parentElement
          setFrontCard(li, !li.closest('.ring') || li.classList.contains('focused'))
        }
      }
    }
    const schedule = () => (raf ||= requestAnimationFrame(measure))
    const resize = new ResizeObserver(schedule)
    resize.observe(root.current)
    window.addEventListener('resize', schedule)
    document.fonts?.ready.then(schedule) // text reflows once the web fonts arrive
    schedule()
    return () => {
      cancelAnimationFrame(raf)
      resize.disconnect()
      window.removeEventListener('resize', schedule)
    }
  }, [root, enabled])
}

// Only the card in front can be used: its links are reachable with Tab, and when its body
// scrolls (short screens), the mouse wheel scrolls it and Tab reaches it too. On the ring,
// cards further round are only there to be clicked to the front (their links ignore the
// pointer, see .ring .deck-card in styles.css).
function setFrontCard(li, front) {
  for (const a of li.querySelectorAll('a')) a.tabIndex = front ? 0 : -1
  const body = li.querySelector('.card-body')
  const scrolls = front && li.querySelector('.entry-card').classList.contains('overflowing')
  body.toggleAttribute('data-lenis-prevent', scrolls)
  if (scrolls) body.tabIndex = 0
  else body.removeAttribute('tabindex')
}

// The row's geometry for cards w px wide, like a row of tiles in a TV app: the cards beside
// the selected one are smaller (`side`); `near` is the distance from the selected card's centre
// to a neighbour's, `pitch` the distance between two neighbours further out.
function rowShape(w) {
  const side = window.innerWidth <= 900 ? 0.86 : 0.8
  const gap = Math.max(20, w * 0.07)
  return { side, near: ((1 + side) * w) / 2 + gap, pitch: side * w + gap }
}

const mod = (x, n) => ((x % n) + n) % n
// x wrapped into [-n/2, n/2): the shortest way round a circle of n positions.
const around = (x, n) => x - n * Math.round(x / n)

// The pinned layouts. As you scroll through a year:
// - stack: each card slides up and lands on the one before; earlier cards shrink back and
//   darken. The year's list of titles marks the card on top.
// - ring: the cards stand in a row that loops round, oldest first, like the rows of a TV app
//   (Netflix, Prime Video, Hotstar): the selected card sits in the middle at full size with a
//   focus border; the others are smaller and dimmer, and after the newest comes the oldest
//   again, both ways. Moving the selection slides the row quickly and lands it softly. A
//   circular dial fills clockwise to a glowing tip, with a dot per card.
//
// Ring position: v = q + c.shown, where q comes from the scroll position (0…n−1 through the
// pinned year) and c.shown is a whole number of laps (n). The row is drawn at c.view, which
// slides towards the selected card (a click, key or snap sets c.goal; otherwise the card the
// scroll is on, counting the next one once the page has moved 0.15 of a card that way), or
// follows a drag directly. Going round past the newest or oldest card jumps the page to the
// other end of the year and adds a lap, so nothing visible jumps. Controls: titles (stack);
// dots, dragging the dial, dragging or swiping the row, sideways wheel or trackpad, clicking a
// side card, ‹ › and ← → (ring). The page never rests between two cards: when it stops
// scrolling part-way, it glides on to the selected one.
function useStack(root, enabled) {
  useEffect(() => {
    if (!enabled) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const chapters = [...root.current.querySelectorAll('.chapter')].map((el) => ({
      el,
      ring: el.classList.contains('ring'),
      deck: el.querySelector('.deck'),
      cards: [...el.querySelectorAll('.deck-card')],
      items: [...el.querySelectorAll('.chapter-index li, .dial-dot')],
      buttons: [...el.querySelectorAll('.chapter-index button, .dial-dot')],
      arrows: [...el.querySelectorAll('.ring-arrow.prev, .ring-arrow.next')],
      up: el.querySelector('.ring-skip.up'),
      down: el.querySelector('.ring-skip.down'),
      dial: el.querySelector('.dial'),
      count: el.querySelector('.dial-now'),
      tip: el.querySelector('.ring-tip'),
      tipFor: null, // the control whose note is showing
      active: -1,
      q: 0,
      shown: 0, // laps added to q (a whole number of n)
      view: null, // where the row is drawn (slides towards the selected card)
      goal: null, // the card a click, key or snap asked for, while the page glides there
      direct: false, // a drag, sideways scroll or dial spin moves the row directly
      hold: null, // during a skip between years: the card it keeps showing, whatever the scroll
    }))
    const rings = chapters.filter((c) => c.ring && c.cards.length > 1)
    // Page position at which a chapter shows card position q (fractional is fine).
    const yFor = (c, q) => {
      const n = c.cards.length
      const top = c.el.getBoundingClientRect().top + window.scrollY
      return top + (n > 1 ? (clamp(q, 0, n - 1) / (n - 1)) * landSpan(c.el, stableHeight()) : 0) + 2
    }
    const follow = (c, q) => scrollToY(yFor(c, q), { immediate: true })
    const position = (c) => c.q + c.shown
    // The year is pinned on screen (so its controls and the arrow keys act on it).
    const pinned = (c) => {
      const r = c.el.getBoundingClientRect()
      return r.top <= 2 && r.bottom >= stableHeight() * 0.9
    }

    // Select whole position `target` (any integer; wraps round). The row heads there at once
    // and the page follows: `ease` is 'inOut' for a click or key, 'out' when it's already
    // moving (a release or a snap).
    const turnTo = (c, target, ease = 'out') => {
      const n = c.cards.length
      if (n < 2) return
      const k = mod(target, n)
      const lap = target - k
      c.goal = target
      if (lap === c.shown) glideTo(yFor(c, k), { ease })
      else {
        // Past the seam: jump the page to the card and add the lap, so v lands on the target
        // while the row slides there from wherever it was drawn.
        follow(c, k)
        c.q = k
        c.shown = lap
      }
      onScroll()
    }
    // Set the position directly (dragging): the scroll goes to the matching card and any
    // remainder (between the newest and the oldest) is kept in the laps.
    const setPosition = (c, v) => {
      const n = c.cards.length
      const lap = n * Math.floor(v / n)
      const q = Math.min(v - lap, n - 1)
      c.shown = v - q
      c.q = q
      follow(c, q)
      onScroll()
    }
    const settle = (c) => turnTo(c, Math.round(position(c)))
    // A key or arrow moves on from the card already asked for, so quick presses add up.
    const step = (c, dir) => turnTo(c, (c.goal ?? Math.round(position(c))) + dir, 'inOut')
    // Go to card k the shortest way round.
    const goToCard = (c, k) => {
      const v = c.goal ?? position(c)
      turnTo(c, Math.round(v + around(k - v, c.cards.length)), 'inOut')
    }
    // Leave a year for the next (dir 1) or the one before (dir −1) without flicking through the
    // cards in between. The year keeps showing the card you were on, and the year you're going to
    // shows its first card all the way in (both held, whatever the scroll says). Within a pinned
    // year the page can jump without anything visible moving, so it jumps to the edge of the
    // year, glides one screen across the change of year, then lands on the new year's start.
    // Past the last year, ↓ goes on to the section after the journey.
    let skipping = false
    const skip = (c, dir) => {
      stopGlide()
      const top = (el) => el.getBoundingClientRect().top + window.scrollY
      // Where a year's stage is last pinned: its end, less the stage's own height.
      const lastPinned = (ch) => top(ch.el) + ch.el.offsetHeight - ch.el.firstElementChild.offsetHeight
      const next = chapters[chapters.indexOf(c) + dir]
      const section = root.current.closest('section')
      const held = [c, next].filter(Boolean)
      c.hold = Math.round(c.view ?? position(c))
      c.goal = null
      if (next) next.hold = next.view = next.shown // its first card, on its current lap
      // Jump to where this year's stage starts to move off (its end going down, its start going
      // up), unless the page is already past it.
      const edge = dir > 0 ? lastPinned(c) : top(c.el)
      if (dir > 0 ? window.scrollY < edge : window.scrollY > edge) scrollToY(edge, { immediate: true })
      // Glide across the change of year: to the next year's start, or going up to where the year
      // above is last pinned (then a jump, unseen, to its start).
      const to = next ? (dir > 0 ? top(next.el) + 2 : lastPinned(next)) : top(dir > 0 ? section.nextElementSibling : section)
      skipping = true
      onScroll()
      glideTo(to, {
        ease: 'inOut',
        done: (arrived) => {
          if (arrived && next && dir < 0) scrollToY(top(next.el) + 2, { immediate: true })
          for (const h of held) h.hold = null
          skipping = false
          onScroll()
        },
      })
    }
    // After a drag, swipe or sideways scroll that began at card `from`: once it has moved a
    // little, on to the next card in that direction (further for a long one), so a short flick
    // doesn't spring back. `velocity` (cards per second) carries a quick flick on.
    const release = (c, from, velocity = 0) => {
      const moved = position(c) - from + clamp(velocity * 0.12, -1.5, 1.5)
      const cards = Math.abs(moved) < 0.15 ? 0 : Math.sign(moved) * Math.max(1, Math.round(Math.abs(moved)))
      turnTo(c, from + cards)
    }

    // The note under the controls: where a dot or arrow leads, on hover or keyboard focus.
    const showTip = (c, el) => {
      if (!c.tip) return
      c.tipFor = el
      const tag = (name, text) => Object.assign(document.createElement(name), { textContent: text })
      const dot = el.classList.contains('dial-dot')
      const next = el.classList.contains('next')
      const target = dot ? el : c.buttons[mod(c.active + (next ? 1 : -1), c.cards.length)]
      c.tip.replaceChildren(
        tag('b', dot ? pad2(c.buttons.indexOf(el) + 1) : next ? 'Next' : 'Previous'),
        target.dataset.title,
        ...(dot ? [] : [tag('kbd', next ? '→' : '←')]),
      )
      c.tip.classList.add('shown')
    }
    const hideTip = (c) => {
      c.tipFor = null
      c.tip?.classList.remove('shown')
    }

    let last = performance.now()
    const update = () => {
      raf = 0
      const now = performance.now()
      // After a pause, the first frame counts as one frame (not the whole pause), so a slide
      // starts smoothly.
      const dt = now - last > 100 ? 1 / 60 : Math.min((now - last) / 1000, 0.05)
      last = now
      // The steady height (not innerHeight, which changes as a phone's address bar moves),
      // matching the 100vh in the chapter heights.
      const vh = stableHeight()
      let animating = false
      for (const c of chapters) {
        const rect = c.el.getBoundingClientRect()
        if (rect.bottom < -vh || rect.top > vh * 2) continue
        const n = c.cards.length
        const q = n > 1 ? clamp(-rect.top / landSpan(c.el, vh)) * (n - 1) : 0
        c.q = q
        let selected = Math.round(q + c.shown)
        if (c.ring) {
          const v = q + c.shown // where the scroll (or a drag) has the row
          if (c.goal !== null && !glideActive()) c.goal = null // arrived, or another scroll took over
          // Judge the scroll by where it's heading, so a wheel turn moves the row at once
          // rather than after the smooth scroll has caught up.
          const aim = scrollAim()
          const qAim = n > 1 ? clamp((aim - window.scrollY - rect.top) / landSpan(c.el, vh)) * (n - 1) : 0
          selected = c.hold ?? c.goal ?? (c.direct ? Math.round(v) : ahead(qAim + c.shown, Math.sign(aim - window.scrollY) || dirY))
          // The row follows a drag directly; otherwise it slides to the selected card, quickly
          // at first and softly at the end, like focus moving along a row on a TV.
          if (c.view === null || still) c.view = c.direct ? v : selected
          else if (c.direct) c.view = v
          else if (Math.abs(selected - c.view) > 1e-3) {
            c.view += (selected - c.view) * (1 - Math.exp(-11 * dt))
            animating = true
          } else c.view = selected
          const w = c.cards[0]?.offsetWidth ?? 0
          const { side, near, pitch } = rowShape(w)
          const half = window.innerWidth / 2 + 40
          c.cards.forEach((card, k) => {
            const d = n > 1 ? around(k - c.view, n) : 0 // distance from the middle, round the loop
            const ad = Math.abs(d)
            const x = Math.sign(d) * (ad <= 1 ? ad * near : near + (ad - 1) * pitch)
            const scale = side + (1 - side) * clamp(1 - ad)
            // With few cards, the one opposite the selected card fades out as it wraps round.
            const seam = clamp((n / 2 - ad) / 0.5)
            card.style.transform = `translate(-50%, -50%) translateX(${x.toFixed(1)}px) scale(${scale.toFixed(4)})`
            card.style.zIndex = String(100 - Math.round(ad * 10))
            card.style.opacity = seam.toFixed(3)
            card.style.visibility = seam === 0 || Math.abs(x) - (scale * w) / 2 > half ? 'hidden' : 'visible'
            // Cards beside the selected one dim; the selected one gets the focus border.
            card.style.setProperty('--cover', (clamp(ad) * 0.6).toFixed(3))
            card.style.setProperty('--lift', clamp(1 - ad * 2.5).toFixed(3))
          })
          if (c.dial) {
            const frac = n > 0 ? mod(c.view, n) / n : 0
            c.dial.querySelector('.dial-fill').style.strokeDasharray = `${frac.toFixed(4)} 1`
            const tip = c.dial.querySelector('.dial-tip')
            const t = frac * Math.PI * 2
            tip.setAttribute('cx', (60 + 48 * Math.sin(t)).toFixed(2))
            tip.setAttribute('cy', (60 - 48 * Math.cos(t)).toFixed(2))
          }
        } else {
          c.cards.forEach((card, k) => {
            const enter = k === 0 ? 1 : smoothstep(clamp(q - k + 1))
            const cover = clamp(q - k, 0, 3)
            card.style.transform =
              `translateY(${((1 - enter) * 80).toFixed(2)}vh) translateY(${(-cover * 16).toFixed(1)}px) ` +
              `scale(${(1 - cover * 0.05).toFixed(3)}) rotate(${((1 - enter) * 4).toFixed(2)}deg)`
            card.style.setProperty('--cover', (cover / 3).toFixed(3))
            card.style.visibility = enter < 0.001 ? 'hidden' : 'visible'
          })
        }
        const active = n > 0 ? mod(selected, n) : 0
        if (active !== c.active) {
          c.active = active
          c.items.forEach((item, k) => {
            item.classList.toggle('active', k === active)
            item.classList.toggle('done', k < active)
          })
          c.cards.forEach((card, k) => card.classList.toggle('focused', k === active))
          if (c.ring) {
            // Keyboard focus that was on the dial, or in a card that has turned away, moves to
            // the dot of the card now in front. The dial is one Tab stop (← → move along it).
            const focus = document.activeElement
            const lost = c.buttons.includes(focus) || c.cards.some((card, k) => k !== active && card.contains(focus))
            c.buttons.forEach((dot, k) => {
              dot.tabIndex = k === active ? 0 : -1
              if (k === active) dot.setAttribute('aria-current', 'true')
              else dot.removeAttribute('aria-current')
            })
            c.cards.forEach((card, k) => setFrontCard(card, k === active))
            if (lost && c.buttons[active]) c.buttons[active].focus({ preventScroll: true })
            if (c.tipFor) showTip(c, c.tipFor)
          }
          if (c.count) c.count.textContent = pad2(active + 1)
        }
      }
      if (animating) raf = requestAnimationFrame(update)
    }

    // When the page stops scrolling part-way through a turn, finish it: on to the next card
    // in the direction it was going, or back if it had hardly moved. Not while a finger or
    // mouse button is down (that would move the page under it), or during a drag.
    let raf = 0
    let lastY = window.scrollY
    let dirY = 0
    // The whole card a position counts as, given the way the page last moved: once it has
    // moved 0.15 of a card past one, the next.
    const ahead = (x, dir = dirY) => {
      const base = Math.floor(x)
      const frac = x - base
      if (dir > 0) return base + (frac >= 0.15 ? 1 : 0)
      if (dir < 0) return base + (frac > 0.85 ? 1 : 0)
      return Math.round(x)
    }
    let idle = 0
    let held = false
    let gestures = 0 // drags and sideways scrolls in progress
    const snap = () => {
      if (held || gestures) return
      if (isGliding()) return waitToSnap() // still easing towards where it was sent
      const vh = stableHeight()
      for (const c of rings) {
        const n = c.cards.length
        const q = (-c.el.getBoundingClientRect().top / landSpan(c.el, vh)) * (n - 1)
        const target = ahead(q)
        if (q <= 0 || q >= n - 1 || Math.abs(q - target) < 0.02) continue
        glideTo(yFor(c, target))
      }
    }
    const waitToSnap = () => {
      clearTimeout(idle)
      idle = setTimeout(snap, 200)
    }
    const onScroll = () => {
      raf ||= requestAnimationFrame(update)
      const y = window.scrollY
      if (y !== lastY) {
        dirY = Math.sign(y - lastY)
        lastY = y
        waitToSnap()
      }
    }
    const press = (down) => {
      held = down
      if (!down) waitToSnap()
    }

    const offs = []
    const on = (el, type, fn, opts) => {
      el.addEventListener(type, fn, opts)
      offs.push(() => el.removeEventListener(type, fn, opts))
    }
    on(window, 'touchstart', () => press(true), { passive: true })
    on(window, 'touchend', (e) => e.touches.length || press(false), { passive: true })
    on(window, 'touchcancel', (e) => e.touches.length || press(false), { passive: true })
    on(window, 'pointerdown', (e) => e.pointerType === 'mouse' && press(true))
    on(window, 'pointerup', (e) => e.pointerType === 'mouse' && press(false))
    on(window, 'blur', () => press(false))

    for (const c of chapters) {
      if (!c.ring) {
        // Stack: the titles jump straight to their card.
        c.buttons.forEach((button, k) => on(button, 'click', () => glideTo(yFor(c, k))))
        continue
      }
      const n = c.cards.length
      if (n < 2) continue
      const cardStep = () => rowShape(c.cards[0]?.offsetWidth ?? 400).near // px per card: the row follows the pointer

      c.buttons.forEach((button, k) => on(button, 'click', () => goToCard(c, k)))
      c.arrows.forEach((arrow) => on(arrow, 'click', () => step(c, arrow.classList.contains('next') ? 1 : -1)))
      if (c.up) on(c.up, 'click', () => skip(c, -1))
      if (c.down) on(c.down, 'click', () => skip(c, 1))
      for (const el of [...c.buttons, ...c.arrows]) {
        on(el, 'pointerenter', (e) => e.pointerType === 'mouse' && showTip(c, el))
        on(el, 'pointerleave', () => hideTip(c))
        on(el, 'focus', () => el.matches(':focus-visible') && showTip(c, el))
        on(el, 'blur', () => hideTip(c))
      }
      // Clicking a card further round brings it to the front.
      c.cards.forEach((card, k) =>
        on(card, 'click', (e) => {
          if (c.dragged || e.target.closest('a')) return
          if (k !== c.active) goToCard(c, k)
        }),
      )

      // Drag or swipe the ring sideways, round and round. A quick flick carries on.
      let drag = null
      on(c.deck, 'pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('a, button')) return
        drag = { x: e.clientX, v: c.view ?? position(c), id: e.pointerId, moved: false, trail: [] }
        c.dragged = false
      })
      on(c.deck, 'pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id) return
        const dx = e.clientX - drag.x
        if (!drag.moved && Math.abs(dx) > 6) {
          drag.moved = c.dragged = c.direct = true
          c.goal = null
          gestures++
          c.deck.setPointerCapture(e.pointerId)
          c.deck.classList.add('dragging')
        }
        if (!drag.moved) return
        const v = drag.v - dx / cardStep()
        setPosition(c, v)
        drag.trail.push([e.timeStamp, v])
        while (drag.trail.length > 2 && e.timeStamp - drag.trail[0][0] > 100) drag.trail.shift()
      })
      const endDrag = (e) => {
        if (!drag || e.pointerId !== drag.id) return
        if (drag.moved) {
          gestures--
          c.direct = false
          // Speed over the last tenth of a second, if it was still moving when let go.
          const [t0, v0] = drag.trail[0]
          const [t1, v1] = drag.trail.at(-1)
          const velocity = e.timeStamp - t1 < 80 && t1 > t0 ? ((v1 - v0) / (t1 - t0)) * 1000 : 0
          release(c, Math.round(drag.v), velocity)
        }
        drag = null
        c.deck.classList.remove('dragging')
        setTimeout(() => (c.dragged = false), 0) // after the click that follows a drag
      }
      on(c.deck, 'pointerup', endDrag)
      on(c.deck, 'pointercancel', endDrag)

      // A sideways wheel or trackpad swipe anywhere on the pinned year turns the ring too.
      let wheel = null
      on(
        c.el,
        'wheel',
        (e) => {
          if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || !pinned(c)) return
          e.preventDefault()
          e.stopPropagation() // or Lenis would also scroll the page by its small vertical part
          const px = e.deltaX * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerWidth : 1)
          if (!wheel) {
            const v = c.view ?? position(c)
            wheel = { v, from: Math.round(v), timer: 0 }
            c.direct = true
            c.goal = null
            gestures++
          }
          wheel.v += px / cardStep()
          setPosition(c, wheel.v)
          clearTimeout(wheel.timer)
          wheel.timer = setTimeout(() => {
            gestures--
            c.direct = false
            release(c, wheel.from)
            wheel = null
          }, 180)
        },
        { passive: false },
      )

      // Drag around the dial (from anywhere on it, dots included), round and round in either
      // direction. It only takes over once the pointer moves, so a plain click on a dot still
      // selects that dot; a click elsewhere on the dial goes to that point.
      if (c.dial) {
        let spin = null
        const placeAt = (e) => {
          const r = c.dial.getBoundingClientRect()
          const a = Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2)))
          return mod((a / (Math.PI * 2)) * n, n) // 0…n around the dial, oldest at the top
        }
        on(c.dial, 'pointerdown', (e) => {
          if (e.button === 0) spin = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false }
        })
        on(c.dial, 'pointermove', (e) => {
          if (!spin || spin.id !== e.pointerId) return
          if (!spin.moved && Math.hypot(e.clientX - spin.x, e.clientY - spin.y) > 4) {
            spin.moved = c.direct = true
            c.goal = null
            gestures++
            spin.v = c.view ?? position(c)
            spin.at = mod(spin.v, n)
            c.dial.setPointerCapture(e.pointerId)
            hideTip(c)
          }
          if (!spin.moved) return
          // Follow the pointer the short way round, so crossing the top keeps going.
          const at = placeAt(e)
          spin.v += around(at - spin.at, n)
          spin.at = at
          setPosition(c, spin.v)
        })
        const stop = (e) => {
          if (!spin || spin.id !== e.pointerId) return
          if (spin.moved) {
            gestures--
            c.direct = false
            settle(c)
          } else if (!e.target.closest('.dial-dot')) goToCard(c, Math.round(placeAt(e)) % n)
          spin = null
        }
        on(c.dial, 'pointerup', stop)
        on(c.dial, 'pointercancel', (e) => {
          if (spin?.moved && spin.id === e.pointerId) {
            gestures--
            c.direct = false
            settle(c)
          }
          spin = null
        })
      }
    }

    // ← → turn the year whose controls have focus, or the one pinned on screen, and ↓ ↑ move
    // to the next or previous year (not while typing in the contact form). Home and End on the
    // dial go to the first and last card.
    on(window, 'keydown', (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.target.closest?.('input, textarea')) return
      if (skipping && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) return e.preventDefault()
      const c = rings.find((ch) => ch.el.contains(e.target)) ?? rings.find(pinned)
      if (!c) return
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        step(c, e.key === 'ArrowRight' ? 1 : -1)
      } else if ((e.key === 'Home' || e.key === 'End') && e.target.closest?.('.dial')) {
        e.preventDefault()
        goToCard(c, e.key === 'Home' ? 0 : c.cards.length - 1)
      } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !e.target.closest?.('.card-body')) {
        // ↓ ↑ move between years, as on a TV; inside a card whose text scrolls they still scroll it.
        e.preventDefault()
        if (!skipping) skip(c, e.key === 'ArrowDown' ? 1 : -1)
      }
    })

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(idle)
      offs.forEach((off) => off())
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [root, enabled])
}

// The circular dial for a ring year: a dot per entry around a circle (oldest at the top,
// going clockwise), a fill up to the current card with a glowing tip, and the count in the middle.
function Dial({ y }) {
  const n = y.entries.length
  return (
    <div className="dial" role="group" aria-label={`${y.title}: choose a project`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="dial-track" cx="60" cy="60" r="48" />
        <circle className="dial-fill" cx="60" cy="60" r="48" pathLength="1" transform="rotate(-90 60 60)" />
        <circle className="dial-tip" cx="60" cy="12" r="4.5" />
      </svg>
      {y.entries.map((e, k) => {
        const a = (k / n) * Math.PI * 2
        const when = e.label ?? formatDate(e.date)
        return (
          <button
            key={`${e.kind}-${e.title}`}
            type="button"
            className={`dial-dot dial-dot-${e.kind}`}
            style={{ left: `${50 + 40 * Math.sin(a)}%`, top: `${50 - 40 * Math.cos(a)}%` }}
            aria-label={`Show ${e.title}, ${when}`}
            data-title={`${e.title} · ${when}`}
          />
        )
      })}
      <p className="dial-count" aria-hidden="true">
        <span className="dial-now">01</span>
        <span className="dial-total">/ {pad2(n)}</span>
      </p>
    </div>
  )
}

// What comes after the journey (the "Beyond the code" section), named on the last year's ⌄.
const AFTER_JOURNEY = 'Leadership & certifications'

const Chevron = ({ points }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <polyline points={points} />
  </svg>
)

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

// Year-by-year progress (see LAYOUT).
export default function Timeline() {
  const root = useRef()
  useWave(root, STACKED)
  useStack(root, PINNED)
  useCardSizes(root, PINNED)

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

      <div className={`timeline layout-${LAYOUT}`}>
        {!RING && (
          <div className="track" aria-hidden="true">
            <svg>
              <path className="track-line" />
              <path className="track-fill" />
              <circle className="track-tip" r="5" />
            </svg>
            {STACKED && years.flatMap((y) => y.entries.map((e) => <span key={`${y.year}-${e.title}`} className={`node node-${e.kind}`} />))}
          </div>
        )}
        {years.map((y, i) =>
          RING ? (
            <section
              key={y.year}
              id={`year-${y.year}`}
              className={`chapter ring${y.entries.length > 1 ? ' skippable' : ''}`}
              data-count={y.entries.length}
              style={{ '--count': Math.max(y.entries.length, 1) }}
              aria-label={`${y.title}, ${y.span}`}
            >
              <div className="chapter-stage">
                <div className="ring-head">
                  <div className="chapter-label">
                    <YearHeading y={y} />
                  </div>
                  {y.entries.length > 1 && (
                    <div className="ring-controls">
                      <button type="button" className="ring-arrow prev" aria-label="Show previous project">
                        <Chevron points="15 5 8 12 15 19" />
                      </button>
                      <Dial y={y} />
                      <button type="button" className="ring-arrow next" aria-label="Show next project">
                        <Chevron points="9 5 16 12 9 19" />
                      </button>
                      <p className="ring-tip" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="ring-wrap">
                  <ol className="deck">
                    {y.entries.map((entry, k) => (
                      <Entry key={`${entry.kind}-${entry.title}-${entry.date}`} entry={entry} inDeck number={k + 1} />
                    ))}
                    {y.entries.length === 0 && <li className="year-empty">No public projects from this year yet.</li>}
                  </ol>
                  {/* Under the card: up to the year before, down to the next (or past the journey),
                      without going through the rest of this year's cards. */}
                  {y.entries.length > 1 && (
                    <div className="ring-skips">
                      {i > 0 && (
                        <button type="button" className="button ring-skip up" aria-label={`Go up to ${years[i - 1].title}`}>
                          <Chevron points="5 15 12 8 19 15" />
                          {years[i - 1].title}
                        </button>
                      )}
                      <button type="button" className="button ring-skip down" aria-label={`Skip down to ${years[i + 1]?.title ?? AFTER_JOURNEY}`}>
                        {years[i + 1]?.title ?? 'Leadership'}
                        <Chevron points="5 9 12 16 19 9" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : STACKED ? (
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
                        <li key={e.title}>
                          <button type="button">{e.title}</button>
                        </li>
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
