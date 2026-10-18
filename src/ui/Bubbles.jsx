import { useEffect, useRef } from 'react'
import { traits } from '../content.js'
import { scroll, world } from '../lib/store.js'

// Rim tints, cycled across the bubbles (as "r, g, b" for use in rgba()).
const TINTS = ['255, 177, 92', '255, 128, 160', '120, 190, 255', '186, 150, 255', '120, 225, 185']

// When each bubble appears and pops, on hero scroll progress.
const appearAt = (i, n) => 0.42 + (i / n) * 0.28
const popAt = (i, n) => 0.86 + (i / n) * 0.06

// Home positions: two loose arcs above the head (rows on tall screens). They don't need
// to be exact, because the physics pushes overlapping bubbles apart.
function homes(bubbles, head, vw, vh) {
  const top = 96 // keep clear of the top bar
  const room = Math.max(head.y - top, 180)
  if (vw / vh < 0.8) {
    const cols = 3
    bubbles.forEach((b, i) => {
      const row = Math.floor(i / cols)
      const col = i % cols
      b.hx = vw * (0.2 + 0.3 * col) + (row % 2 ? 18 : -18)
      b.hy = head.y - 70 - (row + 0.5) * (room / Math.ceil(bubbles.length / cols))
    })
    return
  }
  const inner = Math.ceil(bubbles.length * 0.4)
  bubbles.forEach((b, i) => {
    const onInner = i < inner
    const k = onInner ? i / Math.max(inner - 1, 1) : (i - inner) / Math.max(bubbles.length - inner - 1, 1)
    const deg = onInner ? 160 - k * 140 : 172 - k * 164
    const rx = onInner ? Math.min(vw * 0.2, 300) : Math.min(vw * 0.38, 600)
    const ry = room * (onInner ? 0.5 : 0.86)
    b.hx = head.x + Math.cos((deg * Math.PI) / 180) * rx
    b.hy = head.y - Math.sin((deg * Math.PI) / 180) * ry
  })
}

// The traits as soap bubbles. They rise out of the open head, float around it, bump into
// each other, shy away from the cursor, can be grabbed and flung, and pop when the intro ends.
export default function Bubbles() {
  const layer = useRef()

  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const n = traits.length
    const bubbles = [...layer.current.children].map((el, i) => ({
      el,
      i,
      r: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      hx: 0,
      hy: 0,
      s: 0, // scale while growing in / popping
      wobble: 0,
      wobbleV: 0,
      state: 'hidden', // hidden | alive | popping | sinking
      age: 0,
      seed: i * 2.3,
      grip: null,
    }))
    const pointer = { x: -1e4, y: -1e4, vx: 0, vy: 0 }
    let vw = 0
    let vh = 0
    let laidOut = null
    let t = 0
    let h = scroll.hero // own smoothing: the 3D scene (and its smoothed values) stops once hidden

    const size = () => {
      vw = window.innerWidth
      vh = window.innerHeight
      const k = Math.min(1.15, Math.max(0.6, Math.min(vh / 1000, vw / 900)))
      for (const b of bubbles) {
        b.r = (34 + 10 * Math.sqrt(traits[b.i].length)) * k
        b.el.style.width = b.el.style.height = `${b.r * 2}px`
        b.el.style.fontSize = `${Math.max(12, Math.min(17, b.r * 0.23))}px`
      }
      laidOut = null
    }

    const spawn = (b, head) => {
      b.state = 'alive'
      b.age = 0
      b.s = 0.12
      b.x = head.x + (Math.random() - 0.5) * 12
      b.y = head.y - 8
      b.vx = (Math.random() - 0.5) * 140
      b.vy = -420 - Math.random() * 160
      b.el.classList.add('shown')
    }

    const hide = (b) => {
      b.state = 'hidden'
      b.grip = null
      b.el.classList.remove('shown', 'held')
    }

    const physics = (dt, head) => {
      const live = bubbles.filter((b) => b.state === 'alive')
      for (const b of live) {
        b.age += dt
        b.s = Math.min(1, b.s + dt * 2.4)
        if (b.grip) {
          // Follow the pointer stiffly while held.
          b.vx = (pointer.x + b.grip.dx - b.x) * 16
          b.vy = (pointer.y + b.grip.dy - b.y) * 16
          continue
        }
        // A soft pull home, gentle drift, and a push away from the cursor.
        let ax = (b.hx - b.x) * 2.6
        let ay = (b.hy - b.y) * 2.6
        if (!still) {
          ax += Math.sin(t * 0.7 + b.seed) * 22
          ay += Math.cos(t * 0.55 + b.seed * 1.7) * 16
        }
        const dx = b.x - pointer.x
        const dy = b.y - pointer.y
        const d = Math.hypot(dx, dy)
        const reach = b.r + 70
        if (d < reach && d > 0.5) {
          const push = (1 - d / reach) * 3200
          ax += (dx / d) * push
          ay += (dy / d) * push
        }
        b.vx = (b.vx + ax * dt) * Math.exp(-2.4 * dt)
        b.vy = (b.vy + ay * dt) * Math.exp(-2.4 * dt)
      }

      // Bubbles bump into each other. A held bubble doesn't give way; the others do.
      for (let a = 0; a < live.length; a++) {
        for (let c = a + 1; c < live.length; c++) {
          const p = live[a]
          const q = live[c]
          const dx = q.x - p.x
          const dy = q.y - p.y
          const d = Math.hypot(dx, dy) || 0.01
          const overlap = p.r * p.s + q.r * q.s - d
          if (overlap <= 0) continue
          const nx = dx / d
          const ny = dy / d
          const share = p.grip ? 0 : q.grip ? 1 : 0.5
          p.x -= nx * overlap * share
          p.y -= ny * overlap * share
          q.x += nx * overlap * (1 - share)
          q.y += ny * overlap * (1 - share)
          const closing = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny
          if (closing < 0) {
            const j = (-(1 + 0.6) * closing) / 2
            if (!p.grip) {
              p.vx -= j * nx
              p.vy -= j * ny
            }
            if (!q.grip) {
              q.vx += j * nx
              q.vy += j * ny
            }
            const kick = Math.min(-closing / 700, 0.6)
            p.wobbleV += kick * 4
            q.wobbleV += kick * 4
          }
        }
      }

      for (const b of live) {
        b.x += b.vx * dt
        b.y += b.vy * dt
        // Stay on screen, bouncing softly off the edges (below the top bar).
        const r = b.r * b.s
        if (b.x < r) (b.x = r), (b.vx = Math.abs(b.vx) * 0.5)
        if (b.x > vw - r) (b.x = vw - r), (b.vx = -Math.abs(b.vx) * 0.5)
        if (b.y < 72 + r && b.age > 0.6) (b.y = 72 + r), (b.vy = Math.abs(b.vy) * 0.5)
        if (b.y > vh - r) (b.y = vh - r), (b.vy = -Math.abs(b.vy) * 0.5)
        // Jelly wobble after a bump.
        b.wobbleV += (-b.wobble * 220 - b.wobbleV * 9) * dt
        b.wobble += b.wobbleV * dt
      }

      for (const b of bubbles) {
        if (b.state === 'popping') {
          b.age += dt
          b.s += dt * 1.8
          if (b.age > 0.22) hide(b)
        } else if (b.state === 'sinking' && head) {
          // Scrolled back up: drift back into the head.
          b.x += (head.x - b.x) * Math.min(1, dt * 8)
          b.y += (head.y - b.y) * Math.min(1, dt * 8)
          b.s -= dt * 3
          if (b.s <= 0.05) hide(b)
        }
      }
    }

    const render = () => {
      for (const b of bubbles) {
        if (b.state === 'hidden') continue
        const w = Math.max(-0.12, Math.min(0.12, b.wobble))
        b.el.style.transform = `translate3d(${b.x - b.r}px, ${b.y - b.r}px, 0) scale(${b.s * (1 + w)}, ${b.s * (1 - w)})`
        b.el.style.opacity = b.state === 'popping' ? Math.max(0, 1 - b.age / 0.22) : 1
      }
    }

    let last = performance.now()
    let raf = requestAnimationFrame(function frame(now) {
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      t += dt
      h += (scroll.hero - h) * (1 - Math.exp(-6 * dt))
      const head = world.opening
      if (head && (!laidOut || laidOut.vw !== vw || Math.hypot(head.x - laidOut.x, head.y - laidOut.y) > 6)) {
        homes(bubbles, head, vw, vh)
        laidOut = { x: head.x, y: head.y, vw }
      }
      for (const b of bubbles) {
        const wanted = h >= appearAt(b.i, n) && h < popAt(b.i, n)
        if (wanted && b.state !== 'alive' && head) spawn(b, head)
        else if (!wanted && b.state === 'alive') {
          b.state = h >= popAt(b.i, n) ? 'popping' : 'sinking'
          b.age = 0
          b.grip = null
          b.el.classList.remove('held')
        }
      }
      if (bubbles.some((b) => b.state !== 'hidden')) {
        physics(dt, head)
        render()
      }
      raf = requestAnimationFrame(frame)
    })

    // Grab and fling.
    let lastMove = performance.now()
    const onMove = (e) => {
      const now = performance.now()
      const dt = Math.max((now - lastMove) / 1000, 1 / 240)
      lastMove = now
      pointer.vx = pointer.vx * 0.6 + ((e.clientX - pointer.x) / dt) * 0.4
      pointer.vy = pointer.vy * 0.6 + ((e.clientY - pointer.y) / dt) * 0.4
      pointer.x = e.clientX
      pointer.y = e.clientY
    }
    const onLeave = () => {
      pointer.x = pointer.y = -1e4
    }
    const grabs = bubbles.map((b) => {
      const down = (e) => {
        if (b.state !== 'alive') return
        e.preventDefault()
        pointer.x = e.clientX
        pointer.y = e.clientY
        b.grip = { dx: b.x - e.clientX, dy: b.y - e.clientY }
        b.el.setPointerCapture(e.pointerId)
        b.el.classList.add('held')
      }
      const up = () => {
        if (!b.grip) return
        b.grip = null
        b.el.classList.remove('held')
        b.vx = Math.max(-1600, Math.min(1600, pointer.vx))
        b.vy = Math.max(-1600, Math.min(1600, pointer.vy))
      }
      b.el.addEventListener('pointerdown', down)
      b.el.addEventListener('pointerup', up)
      b.el.addEventListener('pointercancel', up)
      return () => {
        b.el.removeEventListener('pointerdown', down)
        b.el.removeEventListener('pointerup', up)
        b.el.removeEventListener('pointercancel', up)
      }
    })

    size()
    window.addEventListener('resize', size)
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      grabs.forEach((off) => off())
      window.removeEventListener('resize', size)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <div className="bubbles" ref={layer} aria-label="What goes on in my head">
      {traits.map((label, i) => (
        <div key={label} className="bubble" style={{ '--tint': TINTS[i % TINTS.length] }}>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}
