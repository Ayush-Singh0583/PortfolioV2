# Portfolio V2

A dark, scroll-driven portfolio.

1. **Intro (3D):** a cutout of my Ghibli-style portrait. Its eyes follow the mouse and it blinks. On scroll, the top of the head swings open on a glowing brain, the face lights up (brows lift, a smile, a blush), and my traits float out as soap bubbles you can grab, fling and bump into each other.
2. **About:** summary, education and skills, taken from my résumé.
3. **Journey:** a timeline of my progress year by year, from day one of college to now. It combines milestones, every project on my GitHub, and résumé details for the featured ones.
4. **Beyond the code:** leadership and certifications.
5. **Contact:** "Let's work together", a contact form, and a panel of thought bubbles beside it: conversation starters to click, the visitor's words floating up as they type, and a pop when they send. Plus links. The form opens the visitor's email app by default; set `contact.endpoint` (Formspree or Web3Forms) to receive messages directly. An optional résumé download is switched on with `profile.resume`.

Built with Vite, React, React Three Fiber (Three.js) and Lenis for smooth scrolling.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/ (refreshes GitHub data first)
npm run preview    # serve the production build locally
```

## Where to edit things

Almost everything personal lives in **`src/content.js`**:

| What | Key |
| --- | --- |
| Name, tagline, availability, links, optional résumé file | `profile` |
| Contact email, form endpoint, conversation-starter topics | `contact` |
| The words in the bubbles | `traits` |
| Summary, education, skills, leadership & certifications | `about` |
| Non-GitHub moments on the timeline | `journey.milestones` |
| Work that isn't a public repo (e.g. the banking API) | `journey.extraProjects` |
| Repos to hide; titles, descriptions, stacks, highlights, featured | `journey.hideRepos`, `journey.repoOverrides` |
| When 1st year started | `journey.collegeStart` |
| The portrait layers | `portrait` |

GitHub data is cached in `src/data/github.json`. Refresh it with `npm run sync` (this also runs automatically on every build). If you hit GitHub's anonymous rate limit, set a `GITHUB_TOKEN` environment variable.

## The portrait

`public/portrait/` holds two layers cut from the Ghibli picture: `body.webp` (everything below the head cut) and `lid.webp` (the top of the head). `src/data/portrait.json` records where things sit in the picture. To redo them from a different picture:

```bash
pip install "rembg[cpu]" pillow numpy
python scripts/make-portrait.py path/to/picture.png --cut 418
```

`--cut` is the pixel row, from the top of the picture, where the head opens, just above the eyebrows. The script removes the background, cleans the hair edges, splits the layers and writes the metadata. A waist-up picture works best; the bottom 10% fades out.

`src/data/face.json` drives the face. It holds hand-measured eye shapes and iris positions, plus the brows, mouth, cheeks and colours, all in picture pixels. With a new picture, re-measure these, or the eyes will be painted in the wrong place.

## How it fits together

- `src/lib/store.js` turns scroll position into 0–1 progress for the intro, About and journey sections, and exposes it as CSS variables (`--hero`, `--about-in`, `--journey`, `--journey-in`).
- `src/lib/journey.js` merges GitHub repos and milestones and groups them by academic year.
- `src/three/Experience.jsx` holds the canvas, lights, dark backdrop and post-processing. Rendering stops once the portrait has scrolled away (after the About section on wide screens).
- `src/three/Portrait.jsx` handles the cutout: the lid, the glowing opening and light beam, and the face rig. The face rig is a shader that repaints the eyes (iris follows the pointer, blinking) and adds the expression (brows lift, eyes widen, mouth corners lift, blush).
- `src/three/Mind.jsx` holds the head-opening timing, glow and rising specks.
- `src/ui/Bubbles.jsx` holds the trait bubbles: HTML over the canvas, using the shared physics (rise from the head, collisions, cursor push, drag and fling, pop).
- `src/three/frame.js` sets the widest the intro framing ever gets (the portrait can be bigger, never smaller). `src/three/CameraRig.jsx` sets the camera path: a close first view, easing out to that frame, then a pan so the portrait sits beside the About text.
- `src/ui/Contact.jsx` holds the contact section: the form (mailto fallback, optional endpoint, honeypot) and the thought-bubble panel. `src/lib/bubblePhysics.js` is the bubble physics shared with the intro.
- `src/ui/About.jsx` contains the About and "Beyond the code" sections. `src/ui/Timeline.jsx` is the journey section. Each year pins in place while its project cards slide in and stack up like a deck, beside the year's title and list of projects, on alternating sides of a meandering line. The line behaves like a string: it ripples when you scroll or sweep the mouse across it, and fills down to a glowing tip. Set `journey.layout: 'list'` in `content.js` for a plain scrolling column instead. `src/ui/Overlay.jsx` has the captions, top bar and closing section.

The build uses relative paths (`base: './'`), so the `dist/` folder works on Vercel, Netlify or GitHub Pages without changes.
# PortfolioV2
