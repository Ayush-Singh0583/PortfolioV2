import { useEffect, useRef } from 'react'
import { traits } from '../content.js'
import { scroll, world } from '../lib/store.js'
import { bubbleTransform, stepBubbles } from '../lib/bubblePhysics.js'

// Rim tints, cycled across the bubbles (as "r, g, b" for use in rgba()).
const TINTS = ['255, 177, 92', '255, 128, 160', '120, 190, 255', '186, 150, 255', '120, 225, 185']

// When each bubble appears and pops, on hero scroll progress.
const appearAt = (i, n) => 0.3 + (i / n) * 0.36
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

// The traits as soap bubbles. They appear out of the top of the head, float around it, bump into
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
    let jumping = false

    // Sized from the layer, which keeps its height while a phone's address bar hides and
    // shows (see .bubbles in styles.css), so bubbles only re-size on a real size change.
    const size = () => {
      const w = layer.current.clientWidth
      const hgt = layer.current.clientHeight
      if (w === vw && hgt === vh) return
      vw = w
      vh = hgt
      const k = Math.min(1.15, Math.max(0.6, Math.min(vh / 1000, vw / 900)))
      for (const b of bubbles) {
        b.r = (34 + 10 * Math.sqrt(traits[b.i].length)) * k
        b.el.style.width = b.el.style.height = `${b.r * 2}px`
        b.el.style.fontSize = `${Math.max(12, Math.min(17, b.r * 0.23))}px`
      }
      laidOut = null
    }

    // A bubble appears out of the top of the head as if by magic: from a speck, with a
    // shimmer of light (the .born animation) and a jelly wobble, then floats up and out.
    const spawn = (b, head) => {
      b.state = 'alive'
      b.age = 0
      b.s = 0.04
      b.x = head.x + (Math.random() - 0.5) * 16
      b.y = head.y
      b.vx = (Math.random() - 0.5) * 220
      b.vy = -260 - Math.random() * 140
      b.wobble = 0
      b.wobbleV = 4
      b.el.classList.remove('born')
      void b.el.offsetWidth // restart the animation if it played before
      b.el.classList.add('shown', 'born')
    }

    const hide = (b) => {
      b.state = 'hidden'
      b.grip = null
      b.el.classList.remove('shown', 'held', 'born')
    }

    const physics = (dt, head) => {
      const live = bubbles.filter((b) => b.state === 'alive')
      // Stay on screen, below the top bar (new bubbles may rise in from the head first).
      stepBubbles(live, dt, { t, pointer, still, bounds: { left: 0, top: 72, right: vw, bottom: vh }, settle: 0.6 })

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
        b.el.style.transform = bubbleTransform(b)
        b.el.style.opacity = b.state === 'popping' ? Math.max(0, 1 - b.age / 0.22) : 1
      }
    }

    let last = performance.now()
    let raf = requestAnimationFrame(function frame(now) {
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      t += dt
      h += (scroll.hero - h) * (1 - Math.exp(-6 * dt))
      // A jump past the intro (a nav link, or reloading partway down) races through it:
      // don't spawn bubbles on the way. Once detected, it holds until the scroll catches up.
      const lag = Math.abs(scroll.hero - h)
      jumping = lag > 0.12 || (jumping && lag > 0.03)
      const head = world.crown
      if (head && (!laidOut || laidOut.vw !== vw || Math.hypot(head.x - laidOut.x, head.y - laidOut.y) > 6)) {
        homes(bubbles, head, vw, vh)
        laidOut = { x: head.x, y: head.y, vw }
      }
      for (const b of bubbles) {
        const wanted = h >= appearAt(b.i, n) && h < popAt(b.i, n)
        if (wanted && b.state !== 'alive' && head && !jumping) spawn(b, head)
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
      } else {
        pointer.px = -1e4 // forget the last position, so no stale "sweep" when they return
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
      // On touch screens a vertical swipe scrolls the page instead (touch-action: pan-y),
      // and the browser cancels the grab: let go without flinging.
      const cancel = () => {
        b.grip = null
        b.el.classList.remove('held')
      }
      b.el.addEventListener('pointerdown', down)
      b.el.addEventListener('pointerup', up)
      b.el.addEventListener('pointercancel', cancel)
      return () => {
        b.el.removeEventListener('pointerdown', down)
        b.el.removeEventListener('pointerup', up)
        b.el.removeEventListener('pointercancel', cancel)
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
    <div className="bubbles" ref={layer} role="group" aria-label="What goes on in my head">
      {traits.map((label, i) => (
        <div key={label} className="bubble" style={{ '--tint': TINTS[i % TINTS.length] }}>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}
