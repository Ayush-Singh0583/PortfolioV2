import * as THREE from 'three'

let glow
// Soft white radial falloff, used for light pools, the stage spot and the blob shadow.
export function glowTexture() {
  if (glow) return glow
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.3)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 128, 128)
  glow = new THREE.CanvasTexture(canvas)
  glow.colorSpace = THREE.SRGBColorSpace
  return glow
}
