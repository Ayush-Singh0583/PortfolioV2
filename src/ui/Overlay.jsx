import { useEffect, useState } from 'react'
import { profile, traits } from '../content.js'
import { useUI } from '../lib/store.js'

// Résumé buttons only appear when profile.resume names a file in /public.
const resumeUrl = profile.resume && import.meta.env.BASE_URL + profile.resume

// Captions that fade in and out with the hero scroll (driven by the --hero CSS variable).
// The first screen's buttons go inert once the intro text has faded, so nothing invisible
// can be clicked or tabbed to.
export function Captions() {
  const introOn = useUI((s) => s.introOn)
  return (
    <div className="captions">
      <div className="intro">
        <p className="greeting">Hi, I'm</p>
        <h1>{profile.name}</h1>
        <p className="tagline">{profile.tagline}</p>
        <p className="role">{profile.role}</p>
        {profile.availability && <p className="availability">{profile.availability}</p>}
        <div className="intro-actions" inert={!introOn}>
          <a className="button button-primary" href="#work">
            See my work <span aria-hidden="true">↓</span>
          </a>
          {resumeUrl && (
            <a className="button" href={resumeUrl} target="_blank" rel="noreferrer">
              Résumé <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </div>
      <div className="scroll-hint">
        Scroll to read my mind <span aria-hidden="true">↓</span>
      </div>
      <div className="caption caption-mind">
        <p className="eyebrow">Inside my head</p>
        <h2>{traits.length} thoughts, always floating.</h2>
      </div>
    </div>
  )
}

// The menu, and the sections each item stands for: Work covers Selected work and the journey.
const MENU = [
  { label: 'About', ids: ['about'] },
  { label: 'Work', ids: ['work', 'journey'] },
  { label: 'Contact', ids: ['contact'] },
]

export function TopBar() {
  // The item for the section in the middle of the screen is marked in the nav.
  const [current, setCurrent] = useState(null)
  useEffect(() => {
    const seen = new Map()
    const observer = new IntersectionObserver(
      (changes) => {
        for (const c of changes) seen.set(c.target.id, c.isIntersecting)
        setCurrent(MENU.find((item) => item.ids.some((id) => seen.get(id)))?.label ?? null)
      },
      { rootMargin: '-50% 0px -50% 0px' },
    )
    for (const id of MENU.flatMap((item) => item.ids)) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  return (
    <header className="topbar">
      <a className="monogram" href="#top">
        <span aria-hidden="true">
          {profile.name
            .split(' ')
            .map((w) => w[0])
            .join('')}
        </span>
        <span className="sr-only">{profile.name}: back to top</span>
      </a>
      <nav aria-label="Sections">
        {MENU.map(({ label, ids }) => (
          <a key={label} href={`#${ids[0]}`} aria-current={current === label ? 'location' : undefined}>
            {label}
          </a>
        ))}
        {resumeUrl && (
          <a href={resumeUrl} target="_blank" rel="noreferrer">
            Résumé ↗
          </a>
        )}
      </nav>
    </header>
  )
}
