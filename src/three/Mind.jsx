import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world } from '../lib/store.js'
import { range } from '../lib/math.js'
import { glowTexture } from '../lib/textures.js'

// The warm glow behind the portrait while the thoughts come out.
export const GLOW = new THREE.Color('#ffb15c')

// The bubble colours (matching the tints in src/ui/Bubbles.jsx), for the magic dust.
const TINTS = ['#ffb15c', '#ff80a0', '#78beff', '#ba96ff', '#78e1b9'].map((c) => new THREE.Color(c))

// How strongly the magic is on for a given hero progress (0 off, 1 full): it builds just
// before the first bubble appears and fades as they pop.
export const magic = (hero) => range(hero, 0.2, 0.32) * (1 - range(hero, 0.87, 0.95))

// Glittering dust spiralling up out of the head, in the bubble colours, with a soft halo
// above it: the bubbles appear out of this, as if by magic.
export function MagicDust({ center, count = 90 }) {
  const dust = useRef()
  const halo = useRef()
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        angle: Math.random() * Math.PI * 2,
        radius: 0.05 + Math.random() * 0.09,
        speed: 0.18 + Math.random() * 0.32,
        phase: Math.random(),
        twinkle: Math.random() * 20,
        tint: TINTS[i % TINTS.length],
      })),
    [count],
  )
  const positions = useMemo(() => new Float32Array(count * 3), [count])
  const colors = useMemo(() => new Float32Array(count * 3), [count])

  useFrame(({ clock }) => {
    const m = magic(world.hero)
    const on = m > 0.01
    dust.current.visible = halo.current.visible = on
    if (!on) return
    const t = clock.elapsedTime
    seeds.forEach((s, i) => {
      const life = (t * s.speed + s.phase) % 1
      // Rise in a widening spiral, flattened front to back so it stays around the head.
      const r = s.radius * (1 + life * 2.6)
      const a = s.angle + life * 4 + t * 0.6
      positions[i * 3] = Math.cos(a) * r
      positions[i * 3 + 1] = life * 0.75 * m
      positions[i * 3 + 2] = Math.sin(a) * r * 0.4
      // Additive blending, so fading the colour fades the speck; each one twinkles.
      const fade = Math.sin(life * Math.PI) * m * (0.6 + 0.4 * Math.sin(t * 8 + s.twinkle)) * 1.7
      colors[i * 3] = s.tint.r * fade
      colors[i * 3 + 1] = s.tint.g * fade
      colors[i * 3 + 2] = s.tint.b * fade
    })
    dust.current.geometry.attributes.position.needsUpdate = true
    dust.current.geometry.attributes.color.needsUpdate = true
    // The halo breathes slowly.
    halo.current.scale.setScalar(0.26 + 0.02 * Math.sin(t * 1.7))
    halo.current.material.opacity = m * 0.35
  })

  return (
    <group position={center}>
      <mesh ref={halo} position={[0, 0.05, -0.01]} visible={false}>
        <planeGeometry />
        <meshBasicMaterial map={glowTexture()} color="#d8c4ff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <points ref={dust} frustumCulled={false} visible={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial map={glowTexture()} vertexColors size={0.04} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  )
}
