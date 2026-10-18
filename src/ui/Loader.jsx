import { useProgress } from '@react-three/drei'
import { useUI } from '../lib/store.js'

export default function Loader() {
  const { progress } = useProgress()
  const ready = useUI((s) => s.ready)
  return (
    <div className={`loader ${ready ? 'done' : ''}`} aria-hidden={ready}>
      <div className="bubble loader-bubble" />
      <p>Loading my mind… {Math.round(progress)}%</p>
    </div>
  )
}
