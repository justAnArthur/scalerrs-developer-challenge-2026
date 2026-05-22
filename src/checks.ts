import type { CheckResult, ChecksReport, Extracted } from "./types.ts"

// factories
const pass = (message: string): CheckResult => ({ status: 'pass', message })
const warn = (message: string, suggestion?: string): CheckResult => ({ status: 'warning', message, suggestion })
const err  = (message: string, suggestion?: string): CheckResult => ({ status: 'error',   message, suggestion })

// ---

function checkH1(headings: Extracted['headings'], title?: string): CheckResult {
  if (headings.h1 === 0) return err('no h1 heading found', 'add exactly one h1 to your document')
  if (headings.h1 > 1)  return err(`${headings.h1} h1 headings found`, 'use exactly one h1 per page')
  if (!title)           return warn('h1 exists but has no text')
  return pass(`h1 looks good: "${title}"`)
}

function checkHeadingStructure(headings: Extracted['headings']): CheckResult {
  if (headings.h2 === 0 && headings.h3 === 0)
    return warn('no h2/h3 headings found', 'add subheadings to improve structure and readability')
  return pass(`heading structure ok (${headings.h2} h2, ${headings.h3} h3)`)
}

// ---

function checkMetaField(value: string | undefined, name: string, min: number, max: number): CheckResult {
  if (!value)             return warn(`missing ${name}`, `add "${name}:" to your document`)
  if (value.length < min) return warn(`${name} too short (${value.length} chars)`, `aim for ${min}–${max} characters`)
  if (value.length > max) return warn(`${name} too long (${value.length} chars)`, `keep it under ${max} characters`)
  return pass(`${name} looks good (${value.length} chars)`)
}

function checkKeywords(keywords?: string): CheckResult {
  if (!keywords) return warn('missing meta keywords', 'add "Meta Keywords:" to your document')
  const count = keywords.split(',').filter(k => k.trim()).length
  if (count < 3)  return warn(`too few keywords (${count})`, 'aim for 5–10')
  if (count > 10) return warn(`too many keywords (${count})`, 'keep it to 10 max')
  return pass(`keywords look good (${count})`)
}

// ---

function checkWordCount(wordCount: number): CheckResult {
  if (wordCount < 300)  return warn(`article too short (${wordCount} words)`, 'aim for at least 300 words')
  if (wordCount > 5000) return warn(`article very long (${wordCount} words)`, 'consider splitting into multiple articles')
  return pass(`word count ok (${wordCount} words)`)
}

// ---

// expected image count scales with word count (~1 per 300 words)
function checkImageCount(images: Extracted['images'], wordCount: number): CheckResult {
  const expected = Math.max(1, Math.floor(wordCount / 300))
  if (images.length === 0)        return warn('no images found', 'add images to engage readers')
  if (images.length < expected)   return warn(`${images.length} image(s) for ${wordCount} words`, `aim for ~1 image per 300 words (${expected} expected)`)
  return pass(`image count ok (${images.length} for ${wordCount} words)`)
}

function checkImageAltText(images: Extracted['images']): CheckResult {
  const missing = images.filter(img => !img.alt).length
  if (missing > 0) return err(`${missing} image(s) have no alt text`, 'add descriptive alt text to every image')
  return pass(`all ${images.length} image(s) have alt text`)
}

// fetches each image and checks it's actually an image (not a Google "You need access" page)
async function checkImagesReachable(images: Extracted['images']): Promise<CheckResult[]> {
  const withSrc = images.filter(img => img.src)
  if (withSrc.length === 0) return []

  return Promise.all(withSrc.map(async ({ src }): Promise<CheckResult> => {
    try {
      const res = await fetch(src)
      const contentType = res.headers.get('content-type') ?? ''

      if (!res.ok) return err(`image not reachable (HTTP ${res.status}): ${src}`, 'fix sharing permissions or re-upload to a public host')

      // google returns 200 with an html access-gate page instead of the actual image
      if (contentType.includes('text/html')) {
        const body = await res.text()
        if (body.includes('You need access') || body.includes('accounts.google.com')) {
          return err(`image requires google login: ${src}`, 'share the file with "anyone with the link" or re-upload to a public host')
        }
        return warn(`image url returned html instead of an image: ${src}`, 'check the url is a direct image link')
      }

      return pass(`image reachable: ${src}`)
    } catch {
      return err(`image unreachable: ${src}`, 'check the url is correct and publicly hosted')
    }
  }))
}

// ---

function checkDuplicateLinks(links: Extracted['links']): CheckResult {
  const seen = new Set<string>()
  const dupes = new Set<string>()
  for (const { href } of links) {
    if (!href) continue
    seen.has(href) ? dupes.add(href) : seen.add(href)
  }
  if (dupes.size > 0) return warn(`${dupes.size} duplicate link(s)`, 'avoid linking to the same url multiple times')
  return pass('no duplicate links')
}

async function checkBrokenLinks(links: Extracted['links']): Promise<CheckResult[]> {
  const external = links.filter(l => l.href.startsWith('http'))
  if (external.length === 0) return []

  return Promise.all(external.map(async ({ href }): Promise<CheckResult> => {
    try {
      // try HEAD first (faster), fall back to GET if server rejects HEAD
      let res = await fetch(href, { method: 'HEAD' })
      if (res.status === 405) res = await fetch(href)
      if (res.ok) return pass(`link ok: ${href}`)
      return err(`broken link (HTTP ${res.status}): ${href}`, 'fix or remove this link')
    } catch {
      return err(`link unreachable: ${href}`, 'check the url is correct')
    }
  }))
}

// ---

export async function runChecks(extracted: Extracted): Promise<ChecksReport> {
  const checks: CheckResult[] = [
    checkH1(extracted.headings, extracted.title),
    checkHeadingStructure(extracted.headings),
    checkMetaField(extracted.metas.metaTitle,       'meta title',       50, 60),
    checkMetaField(extracted.metas.metaDescription, 'meta description', 120, 160),
    checkKeywords(extracted.metas.keywords),
    checkWordCount(extracted.wordCount),
    checkImageCount(extracted.images, extracted.wordCount),
    checkImageAltText(extracted.images),
    ...await checkImagesReachable(extracted.images),
    checkDuplicateLinks(extracted.links),
    ...await checkBrokenLinks(extracted.links),
  ]

  const summary = {
    passed:   checks.filter(c => c.status === 'pass').length,
    warnings: checks.filter(c => c.status === 'warning').length,
    errors:   checks.filter(c => c.status === 'error').length,
  }

  return { checks, summary }
}
