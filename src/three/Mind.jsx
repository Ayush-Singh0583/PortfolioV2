import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world } from '../lib/store.js'
import { range } from '../lib/math.js'
import { glowTexture } from '../lib/textures.js'

// How the opened mind looks and when it opens.
export const GLOW = new THREE.Color('#ffb15c')

// How far open the skull is for a given hero progress (0 closed, 1 fully open).
export const skullOpen = (hero) => range(hero, 0.2, 0.4) * (1 - range(hero, 0.87, 0.95))

// Specks of light spiralling up out of the open skull.
export function Thoughts({ center, count = 48 }) {
  const ref = useRef()
  const seeds = useMemo(
    () => Array.from({ length: count }, () => ({ angle: Math.random() * Math.PI * 2, radius: 0.02 + Math.random() * 0.08, speed: 0.12 + Math.random() * 0.3, phase: Math.random() })),
    [count],
  )
  const positions = useMemo(() => new Float32Array(count * 3), [count])
  const colors = useMemo(() => new Float32Array(count * 3), [count])
  useFrame(({ clock }) => {
    const open = skullOpen(world.hero)
    ref.current.visible = open > 0.01
    if (!ref.current.visible) return
    const t = clock.elapsedTime
    seeds.forEach((s, i) => {
      const life = (t * s.speed + s.phase) % 1
      const r = s.radius * (1 + life * 4)
      positions[i * 3] = Math.cos(s.angle + life * 3) * r
      positions[i * 3 + 1] = life * 1.1 * open
      positions[i * 3 + 2] = Math.sin(s.angle + life * 3) * r
      // Additive blending, so fading the colour fades the speck.
      const fade = Math.sin(life * Math.PI) * open * 1.6
      colors[i * 3] = GLOW.r * fade
      colors[i * 3 + 1] = GLOW.g * fade
      colors[i * 3 + 2] = GLOW.b * fade
    })
    ref.current.geometry.attributes.position.needsUpdate = true
    ref.current.geometry.attributes.color.needsUpdate = true
  })
  return (
    <points ref={ref} position={center} frustumCulled={false} visible={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial map={glowTexture()} vertexColors size={0.045} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}
