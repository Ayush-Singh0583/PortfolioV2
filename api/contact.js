// The contact form's endpoint (a Vercel serverless function at /api/contact): checks the
// message and emails it to Ayush through Resend (https://resend.com), with the visitor as
// reply-to so answering is one click.
//
// The API key is the RESEND_API_KEY environment variable: .env on this computer, and Vercel →
// Settings → Environment Variables for the live site. It never reaches the page.
// Until a domain is verified in Resend, mail can only go from onboarding@resend.dev to the
// address the Resend account was made with. If that isn't contact.email in content.js, set
// CONTACT_TO; with a verified domain, set CONTACT_FROM (e.g. "Portfolio <hi@yourdomain.com>").
import { contact, profile } from '../src/content.js'

const LIMITS = { name: 100, email: 200, message: 5000 }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// A few messages per visitor every 10 minutes. Best effort: each running copy of the function
// keeps its own count, and Resend's daily limit caps the rest.
const WINDOW = 10 * 60 * 1000
const MAX = 5
const recent = new Map()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Send the form with POST.' })
  }
  // Only this site's own pages (and a local preview) may use it.
  const origin = req.headers.origin
  if (origin && !fromThisSite(origin)) return res.status(403).json({ error: 'Not allowed from this site.' })

  const body = typeof req.body === 'object' && req.body ? req.body : {}
  // A bot filled the hidden field: say it worked, send nothing.
  if (body.company) return res.status(200).json({ ok: true })
  const fields = {
    name: String(body.name ?? '').replace(/\s+/g, ' ').trim(),
    email: String(body.email ?? '').trim(),
    message: String(body.message ?? '').trim(),
  }
  for (const [key, value] of Object.entries(fields)) {
    if (!value || value.length > LIMITS[key]) return res.status(400).json({ error: `Check the ${key}.` })
  }
  if (!EMAIL.test(fields.email)) return res.status(400).json({ error: 'Check the email address.' })

  const visitor = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown'
  const now = Date.now()
  const times = (recent.get(visitor) ?? []).filter((t) => now - t < WINDOW)
  if (times.length >= MAX) return res.status(429).json({ error: 'Too many messages; try again in a few minutes.' })
  recent.set(visitor, [...times, now])

  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.error('contact: RESEND_API_KEY is not set')
    return res.status(500).json({ error: 'The form is not set up yet.' })
  }
  const sent = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM || 'Portfolio contact <onboarding@resend.dev>',
      to: [process.env.CONTACT_TO || contact.email],
      reply_to: fields.email,
      subject: `Portfolio: message from ${fields.name}`,
      text: `${fields.message}\n\n— ${fields.name} (${fields.email})\nSent from the contact form on ${profile.site ?? 'the portfolio'}.`,
    }),
  }).catch((error) => ({ ok: false, status: 0, text: async () => error.message }))
  if (!sent.ok) {
    console.error('contact: Resend said', sent.status, await sent.text())
    return res.status(502).json({ error: 'The message could not be sent.' })
  }
  return res.status(200).json({ ok: true })
}

// The live site, its Vercel deployment and preview addresses, or a local preview.
function fromThisSite(origin) {
  try {
    const { hostname } = new URL(origin)
    const hosts = [profile.site, process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
      .filter(Boolean)
      .map((h) => new URL(h.startsWith('http') ? h : `https://${h}`).hostname)
    return hosts.includes(hostname) || hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}
