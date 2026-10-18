import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { scroll, useUI, world } from '../lib/store.js'
import { damp } from '../lib/math.js'
import { glowTexture } from '../lib/textures.js'
import Portrait from './Portrait.jsx'
import CameraRig from './CameraRig.jsx'
import { GLOW, skullOpen } from './Mind.jsx'

const BG = '#07080c'

// Runs before everything else each frame: smooths scroll progress.
function Director() {
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    world.hero = damp(world.hero, scroll.hero, 6, dt)
    world.about = damp(world.about, scroll.aboutIn, 6, dt)
  }, -1)
  return null
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[2, 4, 5]} intensity={2} color="#fff1e4" />
      <directionalLight position={[-3, 2, -3]} intensity={1} color="#8fa4ff" />
    </>
  )
}

// A little dust drifting slowly upward through the light.
function Dust({ count = 220 }) {
  const ref = useRef()
  const seeds = useMemo(
    () => Array.from({ length: count }, () => ({ x: (Math.random() - 0.5) * 7, y: Math.random() * 3.4, z: -2.2 + Math.random() * 3, speed: 0.03 + Math.random() * 0.06, phase: Math.random() * 6 })),
    [count],
  )
  const positions = useMemo(() => new Float32Array(count * 3), [count])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    seeds.forEach((s, i) => {
      positions[i * 3] = s.x + Math.sin(t * 0.2 + s.phase) * 0.15
      positions[i * 3 + 1] = 0.2 + ((s.y + t * s.speed) % 3.4)
      positions[i * 3 + 2] = s.z
    })
    ref.current.geometry.attributes.position.needsUpdate = true
  })
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial map={glowTexture()} color="#5d669a" size={0.025} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

// Dark studio backdrop: a soft indigo glow behind the portrait that warms up while the head is open.
function Backdrop() {
  const warm = useRef()
  useFrame(() => warm.current.color.copy(GLOW).multiplyScalar(0.22 * skullOpen(world.hero)))
  return (
    <group position={[0, 1.5, -2.5]}>
      <mesh scale={[8, 8, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={glowTexture()} color="#20253f" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.4, 0.01]} scale={[4.5, 4.5, 1]}>
        <planeGeometry />
        <meshBasicMaterial ref={warm} map={glowTexture()} color="#000" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

export default function Experience() {
  const visible = useUI((s) => s.sceneVisible)
  const small = window.innerWidth < 720
  return (
    <Canvas
      // Stop rendering once the portrait has scrolled away; the canvas is invisible then.
      frameloop={visible ? 'always' : 'never'}
      // Listen for the pointer on the whole page, so the eyes follow it over the text too.
      eventSource={document.getElementById('root')}
      eventPrefix="client"
      dpr={[1, small ? 1.5 : 1.75]}
      camera={{ fov: 40, near: 0.05, far: 60, position: [0, 1.4, 2] }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[BG]} />
      <Lights />
      <Director />
      <Suspense fallback={null}>
        <Backdrop />
        <Dust />
        <Portrait />
        <CameraRig />
      </Suspense>
      <EffectComposer multisampling={small ? 0 : 4}>
        <Bloom mipmapBlur intensity={0.8} luminanceThreshold={1} luminanceSmoothing={0.25} />
        <Vignette offset={0.3} darkness={0.7} />
        {/* Neutral keeps the illustration's colours close to the original. */}
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      </EffectComposer>
    </Canvas>
  )
}
