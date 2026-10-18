import { useProgress } from '@react-three/drei'
import { useUI } from '../lib/store.js'

export default function Loader() {
  const { progress } = useProgress()
  const ready = useUI((s) => s.ready)
  return (
    <div className={`loader ${ready ? 'done' : ''}`} aria-hidden={ready}>
      <div className="loader-key">
        <span>esc</span>
      </div>
      <p>Loading my mind… {Math.round(progress)}%</p>
    </div>
  )
}
