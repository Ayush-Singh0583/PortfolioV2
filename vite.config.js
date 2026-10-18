import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { profile } from './src/content.js'

// Link previews (LinkedIn, WhatsApp, X…) need absolute addresses, so the preview tags are
// filled in from profile.site in src/content.js, with the page's own title and description.
// The picture is public/og.jpg (1200×630).
function sharePreview() {
  return {
    name: 'share-preview',
    transformIndexHtml(html) {
      if (!profile.site) return html
      const site = profile.site.replace(/\/$/, '')
      const title = html.match(/<title>(.*?)<\/title>/)?.[1] ?? profile.name
      const description = html.match(/<meta name="description" content="(.*?)"/)?.[1] ?? ''
      const meta = (key, content) => ({ tag: 'meta', attrs: { [key.startsWith('og:') ? 'property' : 'name']: key, content }, injectTo: 'head' })
      return [
        { tag: 'link', attrs: { rel: 'canonical', href: `${site}/` }, injectTo: 'head' },
        meta('og:type', 'website'),
        meta('og:url', `${site}/`),
        meta('og:title', title),
        meta('og:description', description),
        meta('og:image', `${site}/og.jpg`),
        meta('og:image:width', '1200'),
        meta('og:image:height', '630'),
        meta('og:image:alt', `${profile.name}: an illustrated portrait beside the name`),
        meta('twitter:card', 'summary_large_image'),
      ]
    },
  }
}

export default defineConfig({
  plugins: [react(), sharePreview()],
  // Relative asset paths, so the build works on Vercel, Netlify or a GitHub Pages sub-path alike.
  base: './',
})
