import { useEffect, useRef } from 'react'
import { about } from '../content.js'

// Fade children marked .reveal in as they scroll into view (once).
export function useReveal() {
  const root = useRef()
  useEffect(() => {
    const observer = new IntersectionObserver(
      (seen) => seen.forEach((s) => s.isIntersecting && (s.target.classList.add('in'), observer.unobserve(s.target))),
      { rootMargin: '0px 0px -10% 0px' },
    )
    root.current.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
  return root
}

export function About() {
  const root = useReveal()
  return (
    <div className="about-inner" ref={root}>
      <div className="about-intro reveal">
        <p className="eyebrow">About</p>
        <p className="about-summary">{about.summary}</p>
      </div>

      <div className="about-grid">
        <div className="reveal">
          <h3 className="about-heading">Education</h3>
          <ul className="education">
            {about.education.map((e) => (
              <li key={e.title}>
                <div>
                  <p className="edu-title">{e.title}</p>
                  <p className="edu-place">{e.place}</p>
                </div>
                <div className="edu-side">
                  <p className="edu-years">{e.years}</p>
                  <p className="edu-detail">{e.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="reveal">
          <h3 className="about-heading">Skills</h3>
          <dl className="skills">
            {Object.entries(about.skills).map(([group, items]) => (
              <div key={group}>
                <dt>{group}</dt>
                <dd>
                  <ul className="stack">
                    {items.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}

export function Highlights() {
  const root = useReveal()
  return (
    <div className="highlights-inner" ref={root}>
      <p className="eyebrow reveal">Beyond the code</p>
      <h2 className="reveal">Leadership & certifications</h2>
      <ul className="highlight-cards">
        {about.highlights.map((h) => (
          <li key={h.title} className="highlight-card reveal">
            <p className="highlight-org">{h.org}</p>
            <h3>{h.title}</h3>
            <p>{h.text}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
