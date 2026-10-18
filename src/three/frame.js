import * as THREE from 'three'

// The widest the intro ever gets: head and shoulders, with room above the head for the
// keycaps. Ayush picked this as the limit; the portrait may be bigger, never smaller
// (see kb/decisions.md). The camera frames the shot with it; the keycaps fit inside it.
export function introFrame(head, aspect, fov) {
  const t = Math.tan((fov * Math.PI) / 360)
  // Show at least 0.7m of height and 0.55m of width around the target.
  const r = Math.max(0.7 / (2 * t), 0.55 / (2 * t * aspect))
  const target = new THREE.Vector3(head.center.x, head.center.y + 0.1, head.center.z)
  const halfH = r * t
  return { target, r, halfH, halfW: halfH * aspect }
}
