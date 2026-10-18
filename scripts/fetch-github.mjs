// Pulls your public repos from every GitHub account in `journey.githubAccounts`
// (src/content.js) into src/data/github.json.
// Runs before every build; run it yourself with `npm run sync`.
// Set GITHUB_TOKEN to avoid the 60-requests-per-hour anonymous limit.
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { journey } from '../src/content.js'

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/data/github.json')

const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'portfolio-build' }
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

async function get(url) {
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res.json()
}

try {
  const list = []
  for (const account of journey.githubAccounts) {
    const repos = await get(`https://api.github.com/users/${account}/repos?per_page=100&type=owner&sort=created&direction=asc`)
    for (const r of repos) {
      // Hidden repos are skipped here too, which saves API calls.
      if (r.fork || journey.hideRepos.includes(r.name)) continue
      list.push({
        owner: account,
        name: r.name,
        description: r.description,
        url: r.html_url,
        homepage: r.homepage || null,
        language: r.language,
        languages: await get(r.languages_url),
        topics: r.topics ?? [],
        stars: r.stargazers_count,
        created_at: r.created_at,
        pushed_at: r.pushed_at,
      })
    }
  }
  list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  await mkdir(path.dirname(out), { recursive: true })
  await writeFile(out, JSON.stringify({ accounts: journey.githubAccounts, fetchedAt: new Date().toISOString(), repos: list }, null, 2) + '\n')
  console.log(`github: saved ${list.length} repos from ${journey.githubAccounts.join(', ')} to src/data/github.json`)
} catch (err) {
  // Never fail the build over this; the last saved copy is used instead.
  console.warn(`github: fetch failed (${err.message}), keeping the existing src/data/github.json`)
}
