import { useEffect, useRef } from 'react'

// The night sky behind the whole page: stars at three depths that twinkle and shift a
// little with the mouse and the scroll, a slowly drifting nebula, and the odd shooting
// star. A plain 2D canvas, so it keeps going after the 3D intro has stopped rendering.
const STAR_COLORS = ['255, 255, 255', '210, 225, 255', '255, 236, 210', '190, 205, 255']
const NEBULA = [
  // [x, y, radius (fraction of the larger side), colour, alpha]
  [0.22, 0.28, 0.55, '70, 64, 190', 0.32],
  [0.78, 0.18, 0.45, '128, 62, 176', 0.24],
  [0.64, 0.82, 0.5, '38, 104, 168', 0.2],
  [0.12, 0.86, 0.35, '255, 150, 90', 0.06],
]

export default function Sky() {
  const ref = useRef()

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const pointer = { x: 0, y: 0, sx: 0, sy: 0 }
    let w = 0
    let h = 0
    let stars = []
    let nebula = null
    const shots = []
    let nextShot = 2.5
    let t = 0
    let last = 0
    let raf = 0

    // Small screens draw at 1x and about 30fps: stars are tiny anyway, and it saves the
    // phone's GPU for the 3D intro.
    let small = false
    const build = () => {
      // The canvas keeps its size while a phone's address bar hides and shows (see .sky in
      // styles.css), so this only runs on a real size change, e.g. rotating the phone.
      w = canvas.clientWidth
      h = canvas.clientHeight
      small = w < 720
      const dpr = small ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.max(240, Math.round((w * h) / 2400))
      stars = Array.from({ length: count }, () => {
        const depth = Math.random() ** 1.6 // most stars far away and faint
        return {
          x: Math.random(),
          y: Math.random(),
          depth,
          r: 0.35 + depth * 1.25 + (Math.random() < 0.03 ? 0.8 : 0),
          a: 0.25 + depth * 0.6,
          tw: Math.random() * Math.PI * 2,
          sp: 0.6 + Math.random() * 2.2,
          c: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        }
      })
      // The nebula is painted once at low resolution and stretched; it is meant to be soft.
      nebula = document.createElement('canvas')
      nebula.width = Math.ceil(w / 4)
      nebula.height = Math.ceil(h / 4)
      const n = nebula.getContext('2d')
      const big = Math.max(nebula.width, nebula.height)
      for (const [x, y, r, c, a] of NEBULA) {
        const g = n.createRadialGradient(x * nebula.width, y * nebula.height, 0, x * nebula.width, y * nebula.height, r * big)
        g.addColorStop(0, `rgba(${c}, ${a})`)
        g.addColorStop(0.5, `rgba(${c}, ${a * 0.4})`)
        g.addColorStop(1, `rgba(${c}, 0)`)
        n.fillStyle = g
        n.fillRect(0, 0, nebula.width, nebula.height)
      }
    }

    const draw = (dt) => {
      t += dt
      pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 2.5)
      pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 2.5)
      ctx.fillStyle = '#05060b'
      ctx.fillRect(0, 0, w, h)

      // Nebula, drifting very slowly.
      const drift = still ? 0 : t
      ctx.globalAlpha = 0.9 + 0.1 * Math.sin(drift / 9)
      ctx.drawImage(nebula, Math.sin(drift / 47) * 40 - 40, Math.cos(drift / 59) * 30 - 30, w + 80, h + 60)
      ctx.globalAlpha = 1

      // Stars: nearer ones move more with the mouse and the scroll.
      const scrollY = window.scrollY
      for (const s of stars) {
        const x = (((s.x * w + pointer.sx * s.depth * 18) % w) + w) % w
        const y = (((s.y * h + pointer.sy * s.depth * 12 - scrollY * s.depth * 0.04) % h) + h) % h
        const twinkle = still ? 1 : 0.65 + 0.35 * Math.sin(t * s.sp + s.tw)
        ctx.fillStyle = `rgba(${s.c}, ${s.a * twinkle})`
        if (s.r > 1.3) {
          ctx.beginPath()
          ctx.arc(x, y, s.r, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillRect(x - s.r, y - s.r, s.r * 2, s.r * 2)
        }
      }

      // Shooting stars every few seconds.
      if (!still) {
        nextShot -= dt
        if (nextShot <= 0) {
          nextShot = 4 + Math.random() * 6
          const dir = Math.random() < 0.5 ? -1 : 1
          const speed = 900 + Math.random() * 500
          const angle = (0.35 + Math.random() * 0.3) * (dir > 0 ? 1 : -1)
          shots.push({ x: w * (0.15 + Math.random() * 0.7), y: h * Math.random() * 0.45, vx: Math.cos(angle) * speed * dir, vy: Math.abs(Math.sin(angle)) * speed, age: 0, life: 0.7 + Math.random() * 0.4, len: 110 + Math.random() * 90 })
        }
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i]
          s.age += dt
          if (s.age > s.life) {
            shots.splice(i, 1)
            continue
          }
          s.x += s.vx * dt
          s.y += s.vy * dt
          const fade = Math.sin((s.age / s.life) * Math.PI)
          const k = s.len / Math.hypot(s.vx, s.vy)
          const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * k, s.y - s.vy * k)
          g.addColorStop(0, `rgba(255, 255, 255, ${0.9 * fade})`)
          g.addColorStop(1, 'rgba(255, 255, 255, 0)')
          ctx.strokeStyle = g
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.moveTo(s.x, s.y)
          ctx.lineTo(s.x - s.vx * k, s.y - s.vy * k)
          ctx.stroke()
        }
      }

      // A soft vignette, so the edges fall away into darkness.
      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75)
      v.addColorStop(0, 'rgba(5, 6, 11, 0)')
      v.addColorStop(1, 'rgba(5, 6, 11, 0.7)')
      ctx.fillStyle = v
      ctx.fillRect(0, 0, w, h)
    }

    const frame = (now) => {
      const dt = last ? (now - last) / 1000 : 0
      if (!last || !small || dt >= 1 / 32) {
        last = now
        draw(Math.min(dt, 0.05))
      }
      raf = requestAnimationFrame(frame)
    }

    const onMove = (e) => {
      pointer.x = (e.clientX / w) * 2 - 1
      pointer.y = (e.clientY / h) * 2 - 1
    }
    // With reduced motion the sky is drawn still, and only redrawn when the page scrolls.
    const redraw = () => draw(0)
    const onResize = () => {
      if (canvas.clientWidth === w && canvas.clientHeight === h) return
      build()
      if (still) redraw()
    }

    build()
    if (still) {
      redraw()
      window.addEventListener('scroll', redraw, { passive: true })
    } else {
      raf = requestAnimationFrame(frame)
      window.addEventListener('pointermove', onMove, { passive: true })
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', redraw)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return <canvas className="sky" ref={ref} aria-hidden="true" />
}
