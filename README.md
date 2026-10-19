# Portfolio V2

A dark, scroll-driven portfolio.

1. **Intro (3D):** a cutout of my Ghibli-style portrait. Its eyes follow the mouse and it blinks. On scroll, glittering dust spirals up from the top of my head, the face lights up (brows lift, a smile, a blush), and my traits appear out of my head as if by magic, as soap bubbles you can grab, fling and bump into each other. A living night sky (twinkling stars, a drifting nebula, the odd shooting star) runs behind the whole page.
2. **About:** summary, education and skills, taken from my résumé.
3. **Journey:** a timeline of my progress year by year, from day one of college to now. Each year's projects stand in a row that loops round, oldest to newest, like a row of shows on Netflix, Prime Video or Hotstar on a TV: the selected project sits in the middle at full size with a focus border, the others smaller and dimmer, and the row slides quickly to whichever you pick. Scroll down to move along the year, or drag, flick, scroll sideways, use the ‹ › buttons or arrow keys, click a card, or use the round dial beside the year (hovering a dot or arrow shows where it leads); after the newest it comes round to the oldest again, both ways. It combines milestones, every project on both my GitHub accounts, and résumé details for the featured ones.
4. **Beyond the code:** leadership and certifications.
5. **Contact:** "Let's work together", a contact form, and a panel of thought bubbles beside it: conversation starters to click, the visitor's words floating up as they type, and a pop when they send. Plus links. Each field checks itself when you leave it and says how to fix it, and a half-written message survives a reload. The form opens the visitor's email app by default; set `contact.endpoint` (Formspree or Web3Forms) to receive messages directly. An optional résumé download is switched on with `profile.resume` (everything in `public/` is published, so only put a version without personal details there).

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
| The live address, for link previews on LinkedIn, WhatsApp, X… | `profile.site` |
| Contact email, form endpoint, conversation-starter topics | `contact` |
| The words in the bubbles | `traits` |
| Summary, education, skills, leadership & certifications | `about` |
| GitHub accounts to pull repos from | `journey.githubAccounts` |
| Journey look: `ring` (default), `stack` or `list` | `journey.layout` |
| Non-GitHub moments on the timeline | `journey.milestones` |
| Work that isn't a public repo (e.g. the banking API) | `journey.extraProjects` |
| Repos to hide; titles, descriptions, stacks, highlights, featured, a corrected `date` and `label` | `journey.hideRepos`, `journey.repoOverrides` |
| When 1st year started | `journey.collegeStart` |
| The portrait layers | `portrait` |

Link previews use `public/og.jpg` (1200×630, a shot of the intro) and the page's title and description; `vite.config.js` adds the tags at build time from `profile.site`.

GitHub data from every account in `journey.githubAccounts` (forks skipped) is cached in `src/data/github.json`. Refresh it with `npm run sync` (this also runs automatically on every build). If you hit GitHub's anonymous rate limit, set a `GITHUB_TOKEN` environment variable.

## The portrait

`public/portrait/` holds two layers cut from the Ghibli picture: `body.webp` (everything below the forehead) and `lid.webp` (the top of the head). They sit together as one picture; the split is left over from when the head used to open. `src/data/portrait.json` records where things sit in the picture. To redo them from a different picture:

```bash
pip install "rembg[cpu]" pillow numpy
python scripts/make-portrait.py path/to/picture.png --cut 418
```

`--cut` is the pixel row, from the top of the picture, where the two layers meet, just above the eyebrows. The script removes the background, cleans the hair edges, splits the layers and writes the metadata. A waist-up picture works best; the bottom 10% fades out.

`src/data/face.json` drives the face. It holds hand-measured eye shapes and iris positions, plus the brows, mouth, cheeks and colours, all in picture pixels. With a new picture, re-measure these, or the eyes will be painted in the wrong place.

## How it fits together

- `src/lib/store.js` turns scroll position into 0–1 progress for the intro, About and journey sections, and exposes it as CSS variables (`--hero`, `--about-in`, `--journey`, `--journey-in`).
- `src/lib/journey.js` merges GitHub repos and milestones and groups them by academic year.
- `src/three/Experience.jsx` holds the canvas, lights, dark backdrop and post-processing. Rendering stops once the portrait has scrolled away (after the About section on wide screens).
- `src/three/Portrait.jsx` handles the cutout (both layers), publishes where the top of the head is on screen for the bubbles, and runs the face rig. The face rig is a shader that repaints the eyes (iris follows the pointer, blinking) and adds the expression (brows lift, eyes widen, mouth corners lift, blush).
- `src/three/Mind.jsx` holds the magic timing (`magic(hero)`) and the glittering dust and halo that spiral up out of the head.
- `src/ui/Bubbles.jsx` holds the trait bubbles: HTML over the canvas, using the shared physics (rise from the head, collisions, knocked aside by a quick sweep of the mouse but still when you approach slowly, drag and fling, pop).
- `src/ui/Sky.jsx` draws the night sky behind everything on a 2D canvas; the 3D canvas is transparent so the sky shows around the portrait.
- `src/three/frame.js` sets the widest the intro framing ever gets (the portrait can be bigger, never smaller). `src/three/CameraRig.jsx` sets the camera path: a close first view, easing out to that frame, then a pan so the portrait sits beside the About text.
- `src/ui/Contact.jsx` holds the contact section: the form (mailto fallback, optional endpoint, honeypot) and the thought-bubble panel. `src/lib/bubblePhysics.js` is the bubble physics shared with the intro.
- `src/ui/About.jsx` contains the About and "Beyond the code" sections. `src/ui/Timeline.jsx` is the journey section. By default (`journey.layout: 'ring'`) each year pins in place and its cards stand in a flat row that loops round, oldest first, styled like a TV app's row: the selected card centred at full size with a focus border, the rest smaller and dimmed. The row slides to the selected card (quick start, soft landing); the selection changes as soon as you click, press a key or turn the wheel, and the page then glides to that card. Dragging moves the row under the pointer. The round dial (a dot per entry, a fill to a glowing tip; drag it round or click a dot), arrow buttons and keys work in either direction, wrapping from the last card to the first. With `'stack'`, each year's cards instead slide in and stack up like a deck, beside the year's title and list of projects, on alternating sides of a meandering line. Every card in a deck is as tall as the tallest one (measured from its content), so nothing is cut off; on screens too short for that, only the card's middle scrolls. The line behaves like a string: it ripples when you scroll or sweep the mouse across it, and fills down to a glowing tip. Set `journey.layout: 'list'` in `content.js` for a plain scrolling column instead. `src/ui/Overlay.jsx` has the intro captions and the top bar.

## Keyboard, touch and motion

- Everything works from the keyboard, with a visible amber focus ring. On the journey, each year's dial is one Tab stop: ← → turn the ring (also whenever a year fills the screen), and Home / End on the dial jump to the first and last card. Only the card in front can be tabbed into.
- Small buttons and links have a tap area of at least 44px on phones.
- With "reduce motion" switched on in the system settings, nothing moves with the scroll or drifts on its own: the ring turns without zooming, the bubbles appear in place, the sky stays still and sections just fade in.

The build uses relative paths (`base: './'`), so the `dist/` folder works on Vercel, Netlify or GitHub Pages without changes.
# PortfolioV2
