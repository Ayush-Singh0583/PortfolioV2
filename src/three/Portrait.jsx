import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import meta from '../data/portrait.json'
import face from '../data/face.json'
import { portrait as cfg } from '../content.js'
import { uiStore, world } from '../lib/store.js'
import { clamp, damp, lerp, range } from '../lib/math.js'
import { GLOW, skullOpen, Thoughts } from './Mind.jsx'

const base = import.meta.env.BASE_URL
const PAPER = new THREE.Color('#f4ebe4') // a touch of warmth so the illustration sits in the dark scene
const BRAIN_RED = new THREE.Color('#ff4f5e')

// The cut surface seen when the lid lifts: a rim of skin around a glowing red brain,
// with soft folds and the line between the two halves (front to back).
function brainTexture(skin) {
  const size = 512
  const c = size / 2
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.arc(c, c, c - 1, 0, Math.PI * 2)
  ctx.fill()

  const inner = c * 0.86
  const glow = ctx.createRadialGradient(c, c, 0, c, c, inner)
  glow.addColorStop(0, '#ffd6d6')
  glow.addColorStop(0.3, '#ff6b74')
  glow.addColorStop(0.65, '#f0283e')
  glow.addColorStop(0.92, '#9e0d22')
  glow.addColorStop(1, '#4a0610')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(c, c, inner, 0, Math.PI * 2)
  ctx.fill()

  // Folds: meandering darker strokes, kept inside the brain.
  ctx.save()
  ctx.beginPath()
  ctx.arc(c, c, inner * 0.97, 0, Math.PI * 2)
  ctx.clip()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  let seed = 11
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 34; i++) {
    const r = Math.sqrt(rand()) * inner * 0.9
    const a0 = rand() * Math.PI * 2
    let x = c + Math.cos(a0) * r
    let y = c + Math.sin(a0) * r
    let heading = rand() * Math.PI * 2
    ctx.strokeStyle = `rgba(110, 0, 20, ${0.28 + rand() * 0.22})`
    ctx.lineWidth = 5 + rand() * 4
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let k = 0; k < 9; k++) {
      heading += (rand() - 0.5) * 2.2
      const nx = x + Math.cos(heading) * 22
      const ny = y + Math.sin(heading) * 22
      ctx.quadraticCurveTo(x + Math.cos(heading + 1) * 14, y + Math.sin(heading + 1) * 14, nx, ny)
      x = nx
      y = ny
    }
    ctx.stroke()
  }
  // The fissure between the hemispheres.
  ctx.strokeStyle = 'rgba(70, 0, 14, 0.7)'
  ctx.lineWidth = 9
  ctx.beginPath()
  ctx.moveTo(c, c - inner)
  ctx.bezierCurveTo(c + 14, c - inner * 0.35, c - 14, c + inner * 0.35, c, c + inner)
  ctx.stroke()
  ctx.restore()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// A soft shaft of light rising out of the head: bright at the bottom, fading up and to the sides.
function beamTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  const up = ctx.createLinearGradient(0, 256, 0, 0)
  up.addColorStop(0, 'rgba(255,255,255,1)')
  up.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = up
  ctx.fillRect(0, 0, 64, 256)
  const across = ctx.createLinearGradient(0, 0, 64, 0)
  across.addColorStop(0, 'rgba(0,0,0,0)')
  across.addColorStop(0.5, 'rgba(0,0,0,1)')
  across.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = across
  ctx.fillRect(0, 0, 64, 256)
  return new THREE.CanvasTexture(canvas)
}

// Image pixels -> metres. The portrait stands at the origin with the top of the head at cfg.height.
function layoutFromMeta() {
  const s = 0.13 / (meta.eyes - meta.headTop) // ~13cm from the top of the head to the eyes
  const at = (px, py) => new THREE.Vector3((px - meta.centerX) * s, cfg.height - (py - meta.headTop) * s, 0)
  const hinge = at(meta.cutRight, meta.cut)
  const cut = at(meta.centerX, meta.cut)
  return {
    body: { size: [meta.width * s, meta.height * s], position: at(meta.width / 2, meta.height / 2) },
    lid: { size: [meta.lid.w * s, meta.lid.h * s], offset: at(meta.lid.x + meta.lid.w / 2, meta.lid.y + meta.lid.h / 2).sub(hinge) },
    hinge,
    cut,
    radius: ((meta.cutRight - meta.cutLeft) / 2) * s,
    // Keycaps start just behind the face, so they appear to rise out of the opening.
    head: { center: new THREE.Vector3(0, at(0, meta.eyes).y, -0.04), cutY: cut.y, hinge },
  }
}

// ---- Face rig: eyes that follow the pointer, blinking, and a delighted expression ----
// Everything happens in the portrait's own pixel space (see src/data/face.json).

function faceUniforms() {
  const v2 = ([x, y]) => new THREE.Vector2(x, y)
  const c = (hex) => new THREE.Color(hex)
  return {
    uImage: { value: new THREE.Vector2(meta.width, meta.height) },
    uEyeC: { value: face.eyes.map((e) => v2(e.c)) },
    uEyeAB: { value: face.eyes.map((e) => new THREE.Vector2(e.a, e.b)) },
    uIrisC: { value: face.eyes.map((e) => v2(e.iris)) },
    uIrisR: { value: face.eyes.map((e) => e.r) },
    uTilt: { value: (face.tilt * Math.PI) / 180 },
    uBrows: { value: face.brows.map(v2) },
    uMouthCorners: { value: face.mouthCorners.map(v2) },
    uCheeks: { value: face.cheeks.map(v2) },
    uLook: { value: new THREE.Vector2() },
    uBlink: { value: 0 },
    uJoy: { value: 0 },
    uSclera: { value: c(face.colors.sclera) },
    uLid: { value: c(face.colors.lid) },
    uLash: { value: c('#26161a') },
    uBlush: { value: c('#ff8a8a') },
  }
}

const FACE_GLSL = /* glsl */ `
  uniform vec2 uImage;
  uniform vec2 uEyeC[2];
  uniform vec2 uEyeAB[2];
  uniform vec2 uIrisC[2];
  uniform float uIrisR[2];
  uniform float uTilt;
  uniform vec2 uBrows[2];
  uniform vec2 uMouthCorners[2];
  uniform vec2 uCheeks[2];
  uniform vec2 uLook;
  uniform float uBlink;
  uniform float uJoy;
  uniform vec3 uSclera, uLid, uLash, uBlush;

  vec2 faceToUv(vec2 p) { return vec2(p.x / uImage.x, 1.0 - p.y / uImage.y); }
  // Into the face's tilted frame (the head leans about 6 degrees).
  vec2 untilt(vec2 v) { float c = cos(uTilt), s = sin(uTilt); return vec2(c * v.x + s * v.y, -s * v.x + c * v.y); }
  float gauss(vec2 d, vec2 s) { vec2 k = d / s; return exp(-0.5 * dot(k, k)); }

  // Backward warp: which pixel of the original picture shows up here.
  vec2 faceWarp(vec2 p) {
    vec2 q = p;
    for (int i = 0; i < 2; i++) {
      q.y += uJoy * 5.0 * gauss(p - uBrows[i], vec2(30.0, 9.0)); // eyebrows lift
      vec2 d = p - uEyeC[i];
      float w = gauss(d, vec2(uEyeAB[i].x * 1.3, uEyeAB[i].y * 1.5));
      q.y -= d.y * (1.0 - 1.0 / (1.0 + 0.3 * uJoy)) * w; // eyes open wider
      q.y += uJoy * 2.5 * gauss(p - uMouthCorners[i], vec2(9.0, 6.0)); // corners of the mouth lift into a smile
    }
    return q;
  }

  vec3 faceDetails(vec2 q, vec3 col) {
    for (int i = 0; i < 2; i++) {
      vec2 l = untilt(q - uEyeC[i]);
      vec2 ab = uEyeAB[i];
      float e = length(l / ab);
      if (e < 1.0) {
        // Repaint the eye: the white (shadowed under the upper lid), then the iris moved to
        // where we're looking, then the lid when blinking.
        float halfH = ab.y * sqrt(max(0.0, 1.0 - (l.x * l.x) / (ab.x * ab.x)));
        vec3 white = uSclera * (0.6 + 0.4 * clamp((l.y + halfH) / (ab.y * 1.2), 0.0, 1.0));
        vec2 iq = q - uLook;
        float iris = smoothstep(uIrisR[i], uIrisR[i] - 1.2, distance(iq, uIrisC[i]));
        vec3 c = mix(white, texture2D(map, faceToUv(iq)).rgb, iris);
        float lidY = mix(-halfH - 1.0, halfH, uBlink);
        if (l.y < lidY) c = uLid;
        if (uBlink > 0.02 && abs(l.y - lidY) < 1.2) c = uLash;
        col = mix(col, c, smoothstep(1.0, 0.9, e));
      }
    }
    for (int i = 0; i < 2; i++) col = mix(col, uBlush, 0.3 * uJoy * gauss(q - uCheeks[i], vec2(15.0, 8.0)));
    return col;
  }
`

function withFaceRig(uniforms) {
  return (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', FACE_GLSL + '\nvoid main() {')
      .replace(
        '#include <map_fragment>',
        `vec2 faceQ = faceWarp(vec2(vMapUv.x, 1.0 - vMapUv.y) * uImage);
        vec4 sampledDiffuseColor = texture2D(map, faceToUv(faceQ));
        sampledDiffuseColor.rgb = faceDetails(faceQ, sampledDiffuseColor.rgb);
        diffuseColor *= sampledDiffuseColor;`,
      )
  }
}

export default function Portrait() {
  const [bodyMap, lidMap] = useTexture([base + cfg.body, base + cfg.lid])
  const layout = useMemo(layoutFromMeta, [])
  const textures = useMemo(() => ({ opening: brainTexture(meta.skin), beam: beamTexture() }), [])
  const beamGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), []) // grows upward from its base
  const uniforms = useMemo(faceUniforms, [])
  const rig = useMemo(() => withFaceRig(uniforms), [uniforms])
  const pivot = useRef()
  const tilt = useRef()
  const opening = useRef()
  const beam = useRef()
  const light = useRef()
  const mats = useRef({})
  const eyes = useRef({ look: new THREE.Vector2(), target: new THREE.Vector2(), face: new THREE.Vector3(), nextBlink: 2, blinkAt: -1 })

  useLayoutEffect(() => {
    for (const t of [bodyMap, lidMap]) {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 4
      t.needsUpdate = true
    }
    world.head = layout.head
    uiStore.set({ ready: true })
  }, [bodyMap, lidMap, layout])

  useFrame(({ clock, pointer, camera, size }, delta) => {
    const h = world.hero
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const open = skullOpen(h)
    const { opening: openingMat, beam: beamMat } = mats.current

    // The lid swings up and over on a hinge at the side of the head, tipping back a little.
    pivot.current.rotation.z = -open * 1.75
    pivot.current.position.y = layout.hinge.y + open * 0.02
    tilt.current.rotation.x = -open * 0.35

    opening.current.visible = open > 0.01
    // The brain glows (bright enough to bloom) and gently pulses.
    openingMat.opacity = Math.min(1, open * 3)
    openingMat.color.setScalar(open * (1.3 + 0.3 * Math.sin(t * 2.6)))
    beam.current.visible = open > 0.01
    beam.current.scale.y = 0.75 * (0.3 + open * 0.7)
    beamMat.opacity = open * 0.5
    light.current.intensity = open * 1.5

    // Where the face is on screen, and where the pointer is relative to it (in screen-height units).
    const e = eyes.current
    // Tell the bubbles (plain HTML over the canvas) where the open skull is on screen.
    e.face.copy(layout.cut).project(camera)
    world.opening = { x: ((e.face.x + 1) / 2) * size.width, y: ((1 - e.face.y) / 2) * size.height }

    e.face.set(0, layout.head.center.y, 0).project(camera)
    const dx = (pointer.x - e.face.x) * (size.width / size.height)
    const dy = pointer.y - e.face.y

    // Eyes follow the pointer, but glance up at the thoughts while they pour out.
    const lookUp = range(h, 0.28, 0.42) * (1 - range(h, 0.8, 0.9))
    e.target.set(clamp(dx * 0.9, -1, 1) * 5 * (1 - lookUp * 0.6), lerp(clamp(-dy * 1.2, -1, 1) * 3, -3.5, lookUp))
    e.look.x = damp(e.look.x, e.target.x, 10, dt)
    e.look.y = damp(e.look.y, e.target.y, 10, dt)
    uniforms.uLook.value.copy(e.look)

    // Blink every few seconds.
    if (t > e.nextBlink) {
      e.blinkAt = t
      e.nextBlink = t + 2.5 + Math.random() * 3.5
    }
    const k = (t - e.blinkAt) / 0.16
    uniforms.uBlink.value = k >= 0 && k <= 1 ? Math.sin(k * Math.PI) : 0

    // Delight while the head is open, and (beside the About text) when the pointer comes close to the face.
    const opened = range(h, 0.18, 0.34) * (1 - range(h, 0.88, 0.97))
    const near = (1 - range(Math.hypot(dx, dy), 0.2, 0.6)) * range(world.about, 0.4, 0.9)
    uniforms.uJoy.value = damp(uniforms.uJoy.value, Math.max(opened, near * 0.9), 8, dt)
  })

  const keep = (name) => (m) => (mats.current[name] = m)
  const { cut, radius } = layout
  return (
    <group>
      <mesh position={layout.body.position} renderOrder={1}>
        <planeGeometry args={layout.body.size} />
        <meshBasicMaterial map={bodyMap} color={PAPER} transparent alphaTest={0.02} onBeforeCompile={rig} />
      </mesh>
      <mesh ref={opening} position={[cut.x, cut.y, 0]} rotation-x={-Math.PI / 2} scale={[radius, radius * 0.85, 1]} renderOrder={2} visible={false}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial ref={keep('opening')} map={textures.opening} transparent depthWrite={false} />
      </mesh>
      <mesh ref={beam} geometry={beamGeometry} position={[cut.x, cut.y, 0.01]} scale={[radius * 2.4, 0.75, 1]} renderOrder={3} visible={false}>
        <meshBasicMaterial ref={keep('beam')} map={textures.beam} color={GLOW.clone().multiplyScalar(1.6)} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <group ref={pivot} position={layout.hinge}>
        <group ref={tilt}>
          <mesh position={[layout.lid.offset.x, layout.lid.offset.y, 0.002]} renderOrder={4}>
            <planeGeometry args={layout.lid.size} />
            <meshBasicMaterial map={lidMap} color={PAPER} transparent alphaTest={0.02} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
      <pointLight ref={light} position={[cut.x, cut.y + 0.05, 0.1]} color={BRAIN_RED} distance={1.6} decay={1.5} intensity={0} />
      <Thoughts center={[cut.x, cut.y - 0.02, 0]} />
    </group>
  )
}
