import { useEffect, useState } from 'react'
import { profile, traits } from '../content.js'

// Résumé buttons only appear when profile.resume names a file in /public.
const resumeUrl = profile.resume && import.meta.env.BASE_URL + profile.resume

// Captions that fade in and out with the hero scroll (driven by the --hero CSS variable).
export function Captions() {
  return (
    <div className="captions">
      <div className="intro">
        <p className="greeting">Hi, I'm</p>
        <h1>{profile.name}</h1>
        <p className="tagline">{profile.tagline}</p>
        <p className="role">{profile.role}</p>
        {profile.availability && <p className="availability">{profile.availability}</p>}
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

const SECTIONS = ['about', 'journey', 'contact']

export function TopBar() {
  // The section in the middle of the screen is marked in the nav.
  const [current, setCurrent] = useState(null)
  useEffect(() => {
    const seen = new Map()
    const observer = new IntersectionObserver(
      (changes) => {
        for (const c of changes) seen.set(c.target.id, c.isIntersecting)
        setCurrent(SECTIONS.find((id) => seen.get(id)) ?? null)
      },
      { rootMargin: '-50% 0px -50% 0px' },
    )
    for (const id of SECTIONS) {
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
        {SECTIONS.map((id) => (
          <a key={id} href={`#${id}`} aria-current={current === id ? 'location' : undefined}>
            {id[0].toUpperCase() + id.slice(1)}
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
