import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { isCompact, world } from '../lib/store.js'
import { damp, lerp, range } from '../lib/math.js'
import { introFrame } from './frame.js'

// A camera pose: the point it looks at, how far away it is, and how far above that point.
const pose = (target, r, y) => ({ target, r, y })

// Camera path through the intro, as keyframes on hero progress. It opens close in, the
// portrait filling the screen, then eases back to the intro frame to make room for the
// bubbles. The frame is as far out as the camera ever goes.
function heroKeys(f, head) {
  const aspect = f.halfW / f.halfH
  // Phones zoom in less: the screen is narrow, so a close-up crops the shoulders.
  const close = f.r * (aspect < 0.8 ? 0.9 : 0.78)
  // Keep a little space above the head; the rest of the screen is face and shoulders. On
  // wide screens the portrait sits right of centre, leaving the left for the name.
  // (Less-wide screens need more, since the portrait takes up more of their width.)
  const aside = aspect > 1.25 ? f.halfW * (close / f.r) * Math.min(0.32, Math.max(0.2, 0.2 + (1.9 - aspect) * 0.25)) : 0
  const closeTarget = new THREE.Vector3(f.target.x - aside, head.center.y + 0.19 - close * (f.halfH / f.r), f.target.z)
  return [
    { at: 0, ...pose(closeTarget, close, 0.03) },
    { at: 0.12, ...pose(closeTarget, close, 0.03) },
    { at: 0.34, ...pose(f.target, f.r, 0.05) },
    { at: 1, ...pose(f.target, f.r, 0.05) },
  ]
}

function sample(keys, h, out) {
  let i = 0
  while (i < keys.length - 2 && h > keys[i + 1].at) i++
  const a = keys[i]
  const b = keys[i + 1]
  const k = range(h, a.at, b.at)
  out.target.lerpVectors(a.target, b.target, k)
  out.r = lerp(a.r, b.r, k)
  out.y = lerp(a.y, b.y, k)
}

export default function CameraRig() {
  const camera = useThree((s) => s.camera)
  const aspect = useThree((s) => s.size.width / s.size.height)
  const cache = useRef({ head: null, aspect: 0, frame: null, keys: null })
  const out = useMemo(() => pose(new THREE.Vector3(), 1, 0), [])
  const sway = useRef({ x: 0, y: 0 })

  useFrame(({ pointer }, delta) => {
    const { head } = world
    if (!head) return
    const c = cache.current
    if (c.head !== head || c.aspect !== aspect) {
      const frame = introFrame(head, aspect, camera.fov)
      Object.assign(c, { head, aspect, frame, keys: heroKeys(frame, head) })
    }
    sample(c.keys, world.hero, out)

    // Into the About section: on wide screens the portrait slides over to the right of
    // the text, at the same size; on narrow ones it rises off screen.
    const into = range(world.about, 0, 0.85)
    if (isCompact()) out.target.y -= c.frame.halfH * 2.2 * into
    else out.target.x -= c.frame.halfW * 0.5 * into

    // A touch of pointer parallax so the scene feels alive even when not scrolling.
    const dt = Math.min(delta, 0.05)
    sway.current.x = damp(sway.current.x, pointer.x, 3, dt)
    sway.current.y = damp(sway.current.y, pointer.y, 3, dt)
    const theta = sway.current.x * 0.04
    camera.position.set(
      out.target.x + Math.sin(theta) * out.r,
      out.target.y + out.y + sway.current.y * 0.03,
      out.target.z + Math.cos(theta) * out.r,
    )
    camera.lookAt(out.target)
  })
  return null
}
