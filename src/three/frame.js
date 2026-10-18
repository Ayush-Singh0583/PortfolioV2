import * as THREE from 'three'

// The widest the intro ever gets: head and shoulders, with room above the head for the
// trait bubbles. Ayush picked this as the limit: the portrait may be bigger (the first
// view is closer), never smaller. CameraRig frames the shot with it.
export function introFrame(head, aspect, fov) {
  const t = Math.tan((fov * Math.PI) / 360)
  // Show at least 0.7m of height and 0.55m of width around the target (0.62m on
  // portrait-shaped screens, so phones see the whole of the shoulders).
  const width = aspect < 0.8 ? 0.62 : 0.55
  const r = Math.max(0.7 / (2 * t), width / (2 * t * aspect))
  const target = new THREE.Vector3(head.center.x, head.center.y + 0.1, head.center.z)
  const halfH = r * t
  return { target, r, halfH, halfW: halfH * aspect }
}
