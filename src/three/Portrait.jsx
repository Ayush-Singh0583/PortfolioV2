import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import meta from '../data/portrait.json'
import face from '../data/face.json'
import { portrait as cfg } from '../content.js'
import { uiStore, world } from '../lib/store.js'
import { clamp, damp, lerp, range } from '../lib/math.js'
import { MagicDust, magic } from './Mind.jsx'

const base = import.meta.env.BASE_URL
const PAPER = new THREE.Color('#f4ebe4') // a touch of warmth so the illustration sits in the dark scene

// Image pixels -> metres. The portrait stands at the origin with the top of the head at cfg.height.
// (The picture is in two layers, split at the forehead; they simply sit together now.)
function layoutFromMeta() {
  const s = 0.13 / (meta.eyes - meta.headTop) // ~13cm from the top of the head to the eyes
  const at = (px, py) => new THREE.Vector3((px - meta.centerX) * s, cfg.height - (py - meta.headTop) * s, 0)
  return {
    body: { size: [meta.width * s, meta.height * s], position: at(meta.width / 2, meta.height / 2) },
    lid: { size: [meta.lid.w * s, meta.lid.h * s], position: at(meta.lid.x + meta.lid.w / 2, meta.lid.y + meta.lid.h / 2) },
    // The top of the head, where the bubbles and the magic dust come out.
    crown: at(meta.centerX, meta.headTop + (meta.eyes - meta.headTop) * 0.25),
    // The face, at eye level: the camera frames the intro around it.
    head: { center: new THREE.Vector3(0, at(0, meta.eyes).y, -0.04) },
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
  const uniforms = useMemo(faceUniforms, [])
  const rig = useMemo(() => withFaceRig(uniforms), [uniforms])
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
    // Where the face is on screen, and where the pointer is relative to it (in screen-height units).
    const e = eyes.current
    // Tell the bubbles (plain HTML over the canvas) where the top of the head is on screen.
    e.face.copy(layout.crown).project(camera)
    world.crown = { x: ((e.face.x + 1) / 2) * size.width, y: ((1 - e.face.y) / 2) * size.height }

    e.face.set(0, layout.head.center.y, 0).project(camera)
    const dx = (pointer.x - e.face.x) * (size.width / size.height)
    const dy = pointer.y - e.face.y

    // Eyes follow the pointer, but glance up at the bubbles while they appear.
    const lookUp = range(h, 0.26, 0.36) * (1 - range(h, 0.8, 0.9))
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

    // Delight while the magic is on, and (beside the About text) when the pointer comes close to the face.
    const near = (1 - range(Math.hypot(dx, dy), 0.2, 0.6)) * range(world.about, 0.4, 0.9)
    uniforms.uJoy.value = damp(uniforms.uJoy.value, Math.max(magic(h), near * 0.9), 8, dt)
  })

  const { crown } = layout
  return (
    <group>
      <mesh position={layout.body.position} renderOrder={1}>
        <planeGeometry args={layout.body.size} />
        <meshBasicMaterial map={bodyMap} color={PAPER} transparent alphaTest={0.02} onBeforeCompile={rig} />
      </mesh>
      <mesh position={[layout.lid.position.x, layout.lid.position.y, 0.002]} renderOrder={2}>
        <planeGeometry args={layout.lid.size} />
        <meshBasicMaterial map={lidMap} color={PAPER} transparent alphaTest={0.02} />
      </mesh>
      <MagicDust center={[crown.x, crown.y, 0.01]} />
    </group>
  )
}
