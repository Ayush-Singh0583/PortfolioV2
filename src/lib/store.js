import { useSyncExternalStore } from 'react'
import Lenis from 'lenis'
import { clamp } from './math.js'

// Raw scroll state, written by the scroll listener. For each section: `<name>` is 0..1
// progress through it, `<name>In` is 0..1 as its top edge travels up the viewport.
export const scroll = { hero: 0, about: 0, aboutIn: 0, journey: 0, journeyIn: 0 }

// Below this width the About section has no room for the portrait beside it.
export const isCompact = () => window.innerWidth <= 900

// Shared per-frame state for the 3D scene, written once per frame.
export const world = {
  hero: 0, // smoothed hero progress
  about: 0, // smoothed: how far the About section has come into view
  head: null, // the head that opens: { center, cutY, hinge } in world units
  opening: null, // where the open skull is on screen, in CSS pixels: { x, y } (the bubbles rise from here)
}

// Small subscribable store for the bits of UI that need React re-renders.
let ui = { ready: false, sceneVisible: true }
const listeners = new Set()
export const uiStore = {
  get: () => ui,
  set(patch) {
    for (const k in patch) {
      if (patch[k] !== ui[k]) {
        ui = { ...ui, ...patch }
        listeners.forEach((l) => l())
        return
      }
    }
  },
  subscribe(l) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}
export const useUI = (select) => useSyncExternalStore(uiStore.subscribe, () => select(uiStore.get()))

// Phones change the viewport height as the address bar hides and shows while scrolling.
// Anything that must not jump when that happens (the fixed canvases, scroll progress)
// uses the tallest height seen at the current width instead; it resets on rotation.
// Exposed as --stable-h. Registered at import, so it runs before other resize handlers.
let stableW = 0
let stableH = 0
export const stableHeight = () => stableH
function trackStableHeight() {
  if (window.innerWidth !== stableW) {
    stableW = window.innerWidth
    stableH = window.innerHeight
  } else {
    stableH = Math.max(stableH, window.innerHeight)
  }
  document.documentElement.style.setProperty('--stable-h', `${stableH}px`)
}
if (typeof window !== 'undefined') {
  trackStableHeight()
  window.addEventListener('resize', trackStableHeight)
}

function progressOf(el) {
  const r = el.getBoundingClientRect()
  const travel = r.height - stableH
  return travel > 0 ? clamp(-r.top / travel) : r.top <= 0 ? 1 : 0
}

let lenis = null

// Smoothly scroll the page to y (px from the top).
export const scrollToY = (y) => (lenis ? lenis.scrollTo(y) : window.scrollTo({ top: y, behavior: 'smooth' }))

const enteredOf = (el) => clamp(1 - el.getBoundingClientRect().top / stableH)

// Smooth scrolling plus section progress. Progress is also exposed as CSS variables
// (--hero, --about-in, --journey, --journey-in…) so overlays can animate with plain CSS.
export function startScroll(sections) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  lenis = new Lenis({ lerp: reduced ? 1 : 0.09, anchors: true })
  let raf = requestAnimationFrame(function loop(t) {
    lenis.raf(t)
    raf = requestAnimationFrame(loop)
  })
  const style = document.documentElement.style
  const update = () => {
    for (const key in sections) {
      scroll[key] = progressOf(sections[key])
      scroll[`${key}In`] = enteredOf(sections[key])
      style.setProperty(`--${key}`, scroll[key].toFixed(4))
      style.setProperty(`--${key}-in`, scroll[`${key}In`].toFixed(4))
    }
    // The 3D scene stays while the portrait is on screen: through the About section on
    // wide screens, only the intro on narrow ones. It stops rendering once faded out.
    uiStore.set({ sceneVisible: isCompact() ? scroll.aboutIn < 0.5 : scroll.journeyIn < 0.6 })
  }
  lenis.on('scroll', update)
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update)
  update()
  return () => {
    cancelAnimationFrame(raf)
    lenis.destroy()
    lenis = null
    window.removeEventListener('scroll', update)
    window.removeEventListener('resize', update)
  }
}
