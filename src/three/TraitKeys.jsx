import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import monoFont from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff?url'
import { traits } from '../content.js'
import { world } from '../lib/store.js'
import { easeOutCubic, lerp, range, remap } from '../lib/math.js'
import { introFrame } from './frame.js'

const U = 0.26 // one keyboard unit, in metres
const KEY_H = 0.13
const FONT = 0.062

// Keycap colourways, loosely after classic GMK sets.
const PALETTE = [
  { cap: '#e5603b', legend: '#fff1e4' },
  { cap: '#e8e2d2', legend: '#26262b' },
  { cap: '#2d2f36', legend: '#e8e2d2' },
  { cap: '#a3a4ac', legend: '#1c1c20' },
  { cap: '#d9a441', legend: '#26262b' },
]
const ORDER = [0, 1, 2, 1, 3, 2, 4, 1, 2, 3]

// Width in key units, snapped to quarters like real keycaps (1.25u, 1.75u, 2.75u…).
function keyUnits(label) {
  const raw = (label.length * 0.6 * FONT + 0.1) / U
  return Math.max(1.25, Math.ceil(raw * 4) / 4)
}

function keycapGeometry(units) {
  const w = units * U - 0.02
  const d = U - 0.02
  const geometry = new RoundedBoxGeometry(w, KEY_H, d, 4, 0.03)
  // Pull the top in so it tapers like a real keycap.
  const p = geometry.attributes.position
  const inset = 0.035
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) + KEY_H / 2) / KEY_H
    p.setX(i, p.getX(i) * (1 - (inset * t) / (w / 2)))
    p.setZ(i, p.getZ(i) * (1 - (inset * t) / (d / 2)))
  }
  geometry.computeBoundingSphere()
  return geometry
}

// Point on an upper elliptical arc; 0 degrees is to the right of the head, 90 straight above it.
const arcPoint = (arc, deg) => [Math.cos((deg * Math.PI) / 180) * arc.rx, Math.sin((deg * Math.PI) / 180) * arc.ry]

const GAP = 0.12 // between keys, at full size
const MAX_SCALE = 0.25 // keys are modelled big; on screen they are drawn at most this scale

function sampleArc(arc) {
  // Sample the arc so we can walk along it by distance.
  const samples = []
  let length = 0
  let prev = arcPoint(arc, arc.from)
  for (let i = 0; i <= 64; i++) {
    const deg = lerp(arc.from, arc.to, i / 64)
    const pt = arcPoint(arc, deg)
    length += Math.hypot(pt[0] - prev[0], pt[1] - prev[1])
    samples.push({ deg, at: length })
    prev = pt
  }
  return { ...arc, samples, length }
}

// Wide screens: two arcs around the head, out to the edges of the frame. Keys shrink
// until they all fit.
function arcLayout(widths, halfW, top) {
  const arcs = [
    { rx: 0.5 * halfW, ry: 0.55 * top, from: 165, to: 15 },
    { rx: 0.84 * halfW, ry: 0.9 * top, from: 172, to: 8 },
  ].map(sampleArc)
  const room = arcs.reduce((sum, a) => sum + a.length * 0.92, 0)
  for (let scale = Math.min(MAX_SCALE, room / widths.reduce((sum, w) => sum + w + GAP, 0)); ; scale *= 0.96) {
    const rows = arcs.map(() => [])
    let a = 0
    let used = 0
    for (let i = 0; i < widths.length; i++) {
      const w = widths[i] * scale
      if (used + w > arcs[a].length * 0.92 && a < arcs.length - 1) {
        a++
        used = 0
      }
      rows[a].push({ i, w })
      used += w + GAP * scale
    }
    if (used - GAP * scale > arcs[a].length * 0.92 && scale > 0.05) continue
    const slots = []
    arcs.forEach((arc, n) => {
      const total = rows[n].reduce((sum, k) => sum + k.w + GAP * scale, -GAP * scale)
      let at = (arc.length - total) / 2
      for (const k of rows[n]) {
        const sample = arc.samples.find((s) => s.at >= at + k.w / 2) ?? arc.samples.at(-1)
        const [x, y] = arcPoint(arc, sample.deg)
        slots[k.i] = { x, y, z: k.i % 2 ? 0.12 : 0.18 }
        at += k.w + GAP * scale
      }
    })
    return { slots, scale }
  }
}

// Tall screens: loose rows stacked above the head, shrinking until they fit.
function rowLayout(widths, halfW, top) {
  const maxRow = halfW * 2 * 0.92
  for (let scale = MAX_SCALE; ; scale *= 0.96) {
    const rows = [[]]
    let used = 0
    widths.forEach((w0, i) => {
      const w = w0 * scale
      if (rows.at(-1).length && used + w > maxRow) {
        rows.push([])
        used = 0
      }
      rows.at(-1).push({ i, w })
      used += w + GAP * scale
    })
    const rowH = U * scale * 1.45
    if (0.22 + rows.length * rowH > top - U * scale * 0.6 && scale > 0.05) continue
    const slots = []
    rows.forEach((row, r) => {
      const total = row.reduce((sum, k) => sum + k.w + GAP * scale, -GAP * scale)
      let x = -total / 2
      for (const k of row) {
        slots[k.i] = { x: x + k.w / 2, y: 0.22 + (r + 0.5) * rowH, z: k.i % 2 ? 0.12 : 0.18 }
        x += k.w + GAP * scale
      }
    })
    return { slots, scale }
  }
}

// Usable height above the head centre, keeping the top 12% of the screen clear for the top bar.
const roomAbove = (frame, head) => frame.target.y + frame.halfH * 0.76 - head.center.y

// Fit the keys inside the intro frame, around the head (positions are relative to its centre).
function layout(widths, frame, head) {
  const top = roomAbove(frame, head)
  return frame.halfW / frame.halfH < 0.8 ? rowLayout(widths, frame.halfW, top) : arcLayout(widths, frame.halfW, top)
}

export default function TraitKeys() {
  const aspect = useThree((s) => s.size.width / s.size.height)
  const fov = useThree((s) => s.camera.fov)
  const keys = useMemo(
    () =>
      traits.map((label, i) => {
        const units = keyUnits(label)
        return { label, units, geometry: keycapGeometry(units), colors: PALETTE[ORDER[i % ORDER.length]], seed: i * 1.7 }
      }),
    [],
  )
  const refs = useRef([])
  const fit = useRef({ head: null, aspect: 0, slots: null, scale: 1, rise: 0.3 })

  useFrame(({ clock }) => {
    const head = world.head
    if (!head) return
    const f = fit.current
    if (f.head !== head || f.aspect !== aspect) {
      const frame = introFrame(head, aspect, fov)
      const rise = Math.min(0.3, roomAbove(frame, head) * 0.55)
      Object.assign(f, { head, aspect, rise, ...layout(keys.map((k) => k.units * U), frame, head) })
    }
    const h = world.hero
    const t = clock.elapsedTime
    const leave = range(h, 0.86, 0.95)
    const c = head.center

    keys.forEach((k, i) => {
      const g = refs.current[i]
      const start = 0.42 + (i / keys.length) * 0.28
      const p = remap(h, start, start + 0.13)
      g.visible = p > 0 && leave < 1
      if (!g.visible) return

      // Rise straight out of the skull, then fly out to its slot.
      const rise = easeOutCubic(remap(p, 0, 0.35))
      const fly = easeOutCubic(remap(p, 0.35, 1))
      const slot = f.slots[i]
      g.position.set(
        lerp(c.x, c.x + slot.x, fly),
        lerp(lerp(c.y - 0.05, c.y + f.rise, rise), c.y + slot.y, fly) + Math.sin(t * 1.3 + k.seed) * 0.008 * fly,
        lerp(c.z, c.z + slot.z, fly),
      )
      // On the way out they drift up and away.
      const e = leave * leave
      g.position.x += slot.x * e * 1.2
      g.position.y += e * 2.2
      g.scale.setScalar(Math.max(lerp(0.12, 1, rise) * (1 - leave) * f.scale, 1e-4))

      // Spin while flying, then settle facing the camera with a gentle wobble.
      const spin = (1 - fly) * (2.4 + k.seed)
      g.rotation.set(
        Math.PI / 2 - 0.1 + Math.sin(t * 0.9 + k.seed) * 0.12 * fly + spin,
        Math.sin(t * 0.7 + k.seed) * 0.18 * fly + spin * 0.5,
        Math.sin(t * 0.5 + k.seed) * 0.06,
      )
    })
  })

  return keys.map((k, i) => (
    <group key={k.label} ref={(el) => (refs.current[i] = el)} visible={false}>
      <mesh geometry={k.geometry}>
        <meshStandardMaterial color={k.colors.cap} roughness={0.55} />
      </mesh>
      <Text
        font={monoFont}
        fontSize={FONT}
        color={k.colors.legend}
        position={[0, KEY_H / 2 + 0.003, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        anchorX="center"
        anchorY="middle"
      >
        {k.label}
      </Text>
    </group>
  ))
}
