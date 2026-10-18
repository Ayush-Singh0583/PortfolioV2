import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { contact, profile } from '../content.js'
import { years } from '../lib/journey.js'
import { bubbleTransform, stepBubbles } from '../lib/bubblePhysics.js'

const TINTS = ['255, 177, 92', '255, 128, 160', '120, 190, 255', '186, 150, 255', '120, 225, 185']
const MAX_WORDS = 12 // older word bubbles pop to make room
const SKIP = new Set('the and you your for with that this are was but have about just from would like can will its not our out all any has had how who what when where why'.split(' '))

const topicItems = () => contact.topics.map((topic, i) => ({ id: `topic-${i}-${Date.now()}`, text: topic.label, kind: 'topic', topic }))

// The thoughts beside the form: conversation starters to click, the visitor's words
// floating up as they type, and a pop when the message is sent. Same bubble physics as
// the intro (src/lib/bubblePhysics.js), inside this panel.
function Thoughts({ api, onTopic }) {
  const panel = useRef()
  const bodies = useRef(new Map()) // id -> physics body, including its element
  const [items, setItems] = useState(topicItems)
  const counter = useRef(0)

  useImperativeHandle(api, () => ({
    say(text, kind = 'word') {
      const id = `${kind}-${counter.current++}`
      setItems((list) => {
        const words = list.filter((i) => i.kind !== 'topic')
        const oldest = words.length >= MAX_WORDS && bodies.current.get(words[0].id)
        if (oldest?.ready) oldest.popping = true
        return [...list, { id, text, kind }]
      })
    },
    popAll() {
      for (const b of bodies.current.values()) if (b.ready) b.popping = true
      setTimeout(() => setItems(topicItems()), 1800)
    },
  }))

  // Note each new bubble as it mounts. Its body is set up on the next frame, because child
  // refs attach before the panel's own ref, so the panel can't be measured yet.
  const register = (item) => (el) => {
    if (el && !bodies.current.has(item.id)) bodies.current.set(item.id, { id: item.id, el, item, ready: false })
  }

  // Topics start in a ring; words (and the greeting) rise from the bottom.
  const setUp = (b, w, h) => {
    const { item } = b
    const r = item.kind === 'topic' ? 34 + 6 * Math.sqrt(item.text.length) : item.kind === 'name' ? 40 : 22 + 4.5 * Math.sqrt(item.text.length)
    b.el.style.width = b.el.style.height = `${r * 2}px`
    const word = item.kind !== 'topic'
    const angle = word ? 0 : (contact.topics.indexOf(item.topic) / contact.topics.length) * Math.PI * 2 - Math.PI / 2
    const hx = word ? r + Math.random() * (w - 2 * r) : w / 2 + Math.cos(angle) * w * 0.28
    const hy = word ? r + Math.random() * (h * 0.7 - r) : h / 2 + Math.sin(angle) * h * 0.28
    Object.assign(b, {
      ready: true,
      r,
      x: word ? w / 2 + (Math.random() - 0.5) * 80 : hx,
      y: word ? h - r : hy,
      vx: (Math.random() - 0.5) * 80,
      vy: word ? -420 : 0,
      hx,
      hy,
      s: word ? 0.2 : 0.6,
      wobble: 0,
      wobbleV: 0,
      seed: Math.random() * 10,
      age: 0,
      grip: null,
      popping: false,
      popAge: 0,
    })
  }

  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const pointer = { x: -1e4, y: -1e4 }
    let t = 0
    let last = 0
    let raf = 0
    const frame = (now) => {
      const dt = Math.min((now - (last || now)) / 1000, 1 / 30)
      last = now
      t += dt
      const w = panel.current.clientWidth
      const h = panel.current.clientHeight
      for (const b of bodies.current.values()) {
        if (!b.el.isConnected) bodies.current.delete(b.id)
        else if (!b.ready) setUp(b, w, h)
      }
      const all = [...bodies.current.values()]
      stepBubbles(
        all.filter((b) => !b.popping),
        dt,
        { t, pointer, still, bounds: { left: 0, top: 0, right: w, bottom: h }, settle: 0.5 },
      )
      const popped = []
      for (const b of all) {
        if (b.popping) {
          b.popAge += dt
          b.s += dt * 1.8
          b.el.style.opacity = Math.max(0, 1 - b.popAge / 0.22)
          if (b.popAge > 0.22) popped.push(b.id)
        }
        b.el.style.transform = bubbleTransform(b)
      }
      if (popped.length) setItems((list) => list.filter((i) => !popped.includes(i.id)))
      raf = requestAnimationFrame(frame)
    }
    const onMove = (e) => {
      const rect = panel.current.getBoundingClientRect()
      pointer.x = e.clientX - rect.left
      pointer.y = e.clientY - rect.top
    }
    // Only animate while the panel is on screen.
    const visibility = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf)
      last = 0
      if (entry.isIntersecting) raf = requestAnimationFrame(frame)
    })
    visibility.observe(panel.current)
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      visibility.disconnect()
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  const pick = (item) => {
    const b = bodies.current.get(item.id)
    if (b?.ready) b.wobbleV += 3
    onTopic(item.topic)
  }

  return (
    <div className="thoughts-wrap">
      <div className="thoughts" ref={panel}>
        {items.map((item, i) =>
          item.kind === 'topic' ? (
            <button
              key={item.id}
              type="button"
              ref={register(item)}
              className="bubble shown thought topic"
              style={{ '--tint': TINTS[i % TINTS.length] }}
              onClick={() => pick(item)}
            >
              <span>{item.text}</span>
            </button>
          ) : (
            <div key={item.id} ref={register(item)} className={`bubble shown thought ${item.kind}`} style={{ '--tint': TINTS[(i + 2) % TINTS.length] }}>
              <span>{item.text}</span>
            </div>
          ),
        )}
      </div>
      <p className="thoughts-caption">Pick a topic to start, or just type: your words float up here.</p>
    </div>
  )
}

function ContactForm({ messageRef, onMessage, onName, onSent }) {
  const form = useRef()
  const [status, setStatus] = useState('idle') // idle | sending | sent | error | mailto

  const submit = async (e) => {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(form.current))
    if (data.company) return // a bot filled the hidden field
    if (!contact.endpoint) {
      const subject = `Portfolio: message from ${data.name}`
      const body = `${data.message}\n\n— ${data.name} (${data.email})`
      window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      setStatus('mailto')
      onSent()
      return
    }
    setStatus('sending')
    try {
      const res = await fetch(contact.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...contact.extraFields, name: data.name, email: data.email, message: data.message }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      form.current.reset()
      setStatus('sent')
      onSent()
    } catch {
      setStatus('error')
    }
  }

  const mail = <a href={`mailto:${contact.email}`}>{contact.email}</a>
  const notes = {
    sending: 'Sending…',
    sent: "Thanks! Your message is on its way. I'll get back to you soon.",
    error: <>That didn't go through. Please email me directly at {mail}.</>,
    mailto: <>Your email app should open with the message ready to send. If it doesn't, email me at {mail}.</>,
  }

  return (
    <form className="contact-card" ref={form} onSubmit={submit}>
      <h3>Contact form</h3>
      <p className="contact-note">Email me directly at {mail}, or drop your details here.</p>
      <div className="fields">
        <label>
          <span>Full name</span>
          <input name="name" required autoComplete="name" placeholder="Your name" onBlur={(e) => onName(e.target.value)} />
        </label>
        <label>
          <span>Email address</span>
          <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
        </label>
        <label className="wide">
          <span>Your message</span>
          <textarea
            ref={messageRef}
            name="message"
            required
            rows={5}
            placeholder="Tell me about your project, role or idea…"
            onInput={(e) => onMessage(e.target.value)}
          />
        </label>
        {/* Hidden from people; bots tend to fill it in. */}
        <input className="trap" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      </div>
      <button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send message'} <span aria-hidden="true">›</span>
      </button>
      {status !== 'idle' && (
        <p className={`form-status ${status}`} role="status">
          {notes[status]}
        </p>
      )}
    </form>
  )
}

export default function Contact() {
  const thoughts = useRef()
  const messageRef = useRef()
  const seen = useRef(0) // finished words already turned into bubbles
  const lastName = useRef('')
  const current = years.find((y) => y.current) ?? years.at(-1)

  // Every newly finished word (not the one still being typed) becomes a bubble.
  const trackWords = (value, silent = false) => {
    const words = value.split(/[^\p{L}\p{N}'-]+/u).slice(0, -1).filter(Boolean)
    if (!silent) {
      for (const word of words.slice(seen.current).slice(-3)) {
        if (word.length >= 3 && !SKIP.has(word.toLowerCase())) thoughts.current?.say(word)
      }
    }
    seen.current = words.length
  }

  // A clicked topic starts the message (unless they've already written their own).
  const startTopic = (topic) => {
    const box = messageRef.current
    if (!box.value.trim() || contact.topics.some((t) => t.message === box.value)) box.value = topic.message
    trackWords(box.value, true)
    box.focus()
    box.setSelectionRange(box.value.length, box.value.length)
  }

  const greet = (name) => {
    const first = name.trim().split(/\s+/)[0]
    if (first && first !== lastName.current) thoughts.current?.say(`Hi, ${first}!`, 'name')
    lastName.current = first
  }

  return (
    <div className="contact-inner">
      <header className="contact-head">
        <p className="eyebrow">What's next</p>
        <h2>Let's work together</h2>
        <p className="contact-sub">{current.title} is still being written. If something here caught your eye, I'd love to hear from you.</p>
        {profile.availability && <p className="availability">{profile.availability}</p>}
      </header>
      <div className="contact-grid">
        <ContactForm
          messageRef={messageRef}
          onMessage={(v) => trackWords(v)}
          onName={greet}
          onSent={() => {
            seen.current = 0
            thoughts.current?.popAll()
          }}
        />
        <Thoughts api={thoughts} onTopic={startTopic} />
      </div>
      <footer className="contact-foot">
        <div className="end-links">
          {profile.resume && (
            <a href={import.meta.env.BASE_URL + profile.resume} target="_blank" rel="noreferrer">
              Résumé ↗
            </a>
          )}
          {profile.links.map((l) => (
            <a key={l.url} href={l.url} {...(l.url.startsWith('http') && { target: '_blank', rel: 'noreferrer' })}>
              {l.label} ↗
            </a>
          ))}
        </div>
        <p>
          © {new Date().getFullYear()} {profile.name}
        </p>
      </footer>
    </div>
  )
}
