// Soap-bubble physics shared by the intro's trait bubbles and the contact section's
// thought bubbles. Positions are in CSS pixels. Each bubble needs:
//   x, y, vx, vy   position and velocity
//   hx, hy         home it drifts back to
//   r, s           radius and current scale (grows in to 1)
//   wobble, wobbleV, seed, age, grip ({ dx, dy } while held by the pointer, else null)

// One step for the given live bubbles: a soft pull home, gentle drift, being swept along
// by a fast-moving pointer, bumping into each other (a held bubble doesn't give way),
// staying inside `bounds`, and a jelly wobble after bumps. The top edge only applies once
// a bubble is older than `settle` seconds, so new ones can rise in from outside.
// `pointer` is { x, y } (off screen: -1e4); its previous position and time are kept on it.
export function stepBubbles(live, dt, { t, pointer, still, bounds, settle = 0 }) {
  // Only a quick sweep moves bubbles; a slow or still pointer leaves them alone, so they
  // can be grabbed or clicked. Speed is measured in real time (dt is capped for the
  // physics), and the whole path since the last frame counts, so a fast flick between
  // two frames still hits the bubbles it crossed.
  const now = performance.now()
  const tracked = pointer.px > -5000 && pointer.x > -5000 && pointer.pt !== undefined
  const elapsed = tracked ? Math.max((now - pointer.pt) / 1000, 1 / 240) : 1
  const svx = tracked ? Math.max(-3000, Math.min(3000, (pointer.x - pointer.px) / elapsed)) : 0
  const svy = tracked ? Math.max(-3000, Math.min(3000, (pointer.y - pointer.py) / elapsed)) : 0
  const path = tracked && { ax: pointer.px, ay: pointer.py, bx: pointer.x, by: pointer.y }
  pointer.px = pointer.x
  pointer.py = pointer.y
  pointer.pt = now
  const sweeping = Math.hypot(svx, svy) > 500

  for (const b of live) {
    b.age += dt
    b.s = Math.min(1, b.s + dt * 2.4)
    if (b.grip) {
      b.vx = (pointer.x + b.grip.dx - b.x) * 16
      b.vy = (pointer.y + b.grip.dy - b.y) * 16
      continue
    }
    let ax = (b.hx - b.x) * 2.6
    let ay = (b.hy - b.y) * 2.6
    if (!still) {
      ax += Math.sin(t * 0.7 + b.seed) * 22
      ay += Math.cos(t * 0.55 + b.seed * 1.7) * 16
    }
    b.vx = (b.vx + ax * dt) * Math.exp(-2.4 * dt)
    b.vy = (b.vy + ay * dt) * Math.exp(-2.4 * dt)
    if (sweeping) {
      const reach = b.r + 30
      const d = distanceToPath(b.x, b.y, path)
      if (d < reach) {
        const k = Math.min(1, (1 - d / reach) * 14 * dt)
        b.vx += (svx * 0.7 - b.vx) * k
        b.vy += (svy * 0.7 - b.vy) * k
      }
    }
  }

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
    const r = b.r * b.s
    if (b.x < bounds.left + r) (b.x = bounds.left + r), (b.vx = Math.abs(b.vx) * 0.5)
    if (b.x > bounds.right - r) (b.x = bounds.right - r), (b.vx = -Math.abs(b.vx) * 0.5)
    if (b.y < bounds.top + r && b.age > settle) (b.y = bounds.top + r), (b.vy = Math.abs(b.vy) * 0.5)
    if (b.y > bounds.bottom - r) (b.y = bounds.bottom - r), (b.vy = -Math.abs(b.vy) * 0.5)
    b.wobbleV += (-b.wobble * 220 - b.wobbleV * 9) * dt
    b.wobble += b.wobbleV * dt
  }
}

// Distance from (x, y) to the segment the pointer travelled.
function distanceToPath(x, y, { ax, ay, bx, by }) {
  const vx = bx - ax
  const vy = by - ay
  const len2 = vx * vx + vy * vy
  const k = len2 ? Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / len2)) : 0
  return Math.hypot(x - (ax + k * vx), y - (ay + k * vy))
}

// CSS transform for a bubble element positioned at the top-left of its layer.
export function bubbleTransform(b) {
  const w = Math.max(-0.12, Math.min(0.12, b.wobble))
  return `translate3d(${b.x - b.r}px, ${b.y - b.r}px, 0) scale(${b.s * (1 + w)}, ${b.s * (1 - w)})`
}
