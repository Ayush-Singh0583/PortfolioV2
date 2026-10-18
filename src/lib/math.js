export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v))
export const lerp = (a, b, t) => a + (b - a) * t
// 0..1 position of v between a and b.
export const remap = (v, a, b) => clamp((v - a) / (b - a))
export const smoothstep = (t) => t * t * (3 - 2 * t)
// Eased 0..1 as v moves from a to b; the workhorse for scroll choreography.
export const range = (v, a, b) => smoothstep(remap(v, a, b))
// Frame-rate independent exponential smoothing.
export const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt))
