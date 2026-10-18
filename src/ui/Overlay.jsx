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

export function TopBar() {
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
      <nav>
        <a href="#about">About</a>
        <a href="#journey">Journey</a>
        <a href="#contact">Contact</a>
        {resumeUrl && (
          <a href={resumeUrl} target="_blank" rel="noreferrer">
            Résumé ↗
          </a>
        )}
      </nav>
    </header>
  )
}
