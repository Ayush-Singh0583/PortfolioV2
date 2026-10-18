import { useEffect, useRef } from 'react'
import Experience from './three/Experience.jsx'
import Loader from './ui/Loader.jsx'
import Bubbles from './ui/Bubbles.jsx'
import Sky from './ui/Sky.jsx'
import Timeline from './ui/Timeline.jsx'
import { About, Highlights } from './ui/About.jsx'
import Contact from './ui/Contact.jsx'
import { Captions, TopBar } from './ui/Overlay.jsx'
import { startScroll } from './lib/store.js'

export default function App() {
  const hero = useRef()
  const about = useRef()
  const journey = useRef()

  useEffect(() => startScroll({ hero: hero.current, about: about.current, journey: journey.current }), [])

  return (
    <>
      {/* Behind everything: the night sky. */}
      <Sky />
      {/* Then the portrait, blurred, which fades in as the 3D scene fades out, so the page
          never cuts to black. */}
      <div className="backdrop" aria-hidden="true">
        <img src={`${import.meta.env.BASE_URL}portrait/blur.webp`} alt="" />
      </div>
      {/* The 3D scene is visual only; its words are in the captions and bubbles below. */}
      <div className="stage" aria-hidden="true">
        <Experience />
      </div>
      <TopBar />
      <Loader />
      <main id="top">
        {/* Fixed overlays for the intro, inside <main> so they belong to the page content. */}
        <Captions />
        <Bubbles />
        {/* An empty, tall section: scrolling through it drives the 3D intro. */}
        <section ref={hero} className="hero" aria-label="Introduction" />
        <section ref={about} id="about" className="about" aria-label="About">
          <About />
        </section>
        <section ref={journey} id="journey" className="journey" aria-label="Journey">
          <Timeline />
        </section>
        <section className="beyond" aria-label="Leadership and certifications">
          <Highlights />
        </section>
        <section id="contact" className="contact" aria-label="Contact">
          <Contact />
        </section>
      </main>
    </>
  )
}
