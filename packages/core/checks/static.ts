import type { CheckResult, Extracted } from "../types"

// factories
const pass = (id: string, message: string): CheckResult => ({ id, type: 'static', status: 'pass', message })
const warn = (id: string, message: string, suggestion?: string): CheckResult => ({
  id,
  type: 'static',
  status: 'warning',
  message,
  suggestion
})
const err = (id: string, message: string, suggestion?: string): CheckResult => ({
  id,
  type: 'static',
  status: 'error',
  message,
  suggestion
})

// ---

function countHeadings(list: string[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const tag of list) counts[tag] = (counts[tag] ?? 0) + 1
  return counts
}

function checkH1(headingsList: string[], title?: string): CheckResult {
  const count = headingsList.filter(t => t === 'h1').length
  if (count === 0) return err('h1', 'no h1 heading found', 'add exactly one h1 to your document')
  if (count > 1) return err('h1', `${count} h1 headings found`, 'use exactly one h1 per page')
  if (!title) return warn('h1', 'h1 exists but has no text')
  return pass('h1', `h1 looks good: "${title}"`)
}

function checkHeadingStructure(headingsList: string[]): CheckResult {
  if (headingsList.length === 0)
    return warn('heading-structure', 'no headings found', 'add headings to structure the article')

  const violations: string[] = []

  for (let i = 1; i < headingsList.length; i++) {
    const prev = headingsList[i - 1] as string
    const curr = headingsList[i] as string
    const prevLevel = parseInt(prev[1]!)
    const currLevel = parseInt(curr[1]!)

    if (curr === 'h1')
      violations.push(`h1 appears after ${prev} (h1 must be first)`)

    if (currLevel > prevLevel + 1)
      violations.push(`${curr} follows ${prev} (skipped a level)`)
  }

  if (violations.length > 0)
    return warn('heading-structure', `heading hierarchy issue: ${violations[0]}`, violations.length > 1 ? `${violations.length} issue(s) total` : undefined)

  const counts = countHeadings(headingsList)
  const summary = Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, n]) => `${n} ${tag}`)
    .join(', ')

  return pass('heading-structure', `heading structure ok (${summary})`)
}

// ---

function checkMetaField(id: string, value: string | undefined, name: string, min: number, max: number): CheckResult {
  if (!value) return warn(id, `missing ${name}`, `add "${name}:" to your document`)
  if (value.length < min) return warn(id, `${name} too short (${value.length} chars)`, `aim for ${min}–${max} characters`)
  if (value.length > max) return warn(id, `${name} too long (${value.length} chars)`, `keep it under ${max} characters`)
  return pass(id, `${name} looks good (${value.length} chars)`)
}

function checkKeywords(keywords?: string): CheckResult {
  if (!keywords) return warn('keywords', 'missing meta keywords', 'add "Meta Keywords:" to your document')
  const count = keywords.split(',').filter(k => k.trim()).length
  if (count < 3) return warn('keywords', `too few keywords (${count})`, 'aim for 5–10')
  if (count > 10) return warn('keywords', `too many keywords (${count})`, 'keep it to 10 max')
  return pass('keywords', `keywords look good (${count})`)
}

// ---

function checkWordCount(wordCount: number): CheckResult {
  if (wordCount < 300) return warn('word-count', `article too short (${wordCount} words)`, 'aim for at least 300 words')
  if (wordCount > 5000) return warn('word-count', `article very long (${wordCount} words)`, 'consider splitting into multiple articles')
  return pass('word-count', `word count ok (${wordCount} words)`)
}

// ---

// expected image count scales with word count (~1 per 300 words)
function checkImageCount(images: Extracted['images'], wordCount: number): CheckResult {
  const expected = Math.max(1, Math.floor(wordCount / 300))
  if (images.length === 0) return warn('image-count', 'no images found', 'add images to engage readers')
  if (images.length < expected) return warn('image-count', `${images.length} image(s) for ${wordCount} words`, `aim for ~1 image per 300 words (~${expected} expected)`)
  return pass('image-count', `image count ok (${images.length} for ${wordCount} words)`)
}

function checkImageAltText(images: Extracted['images']): CheckResult {
  const missing = images.filter(img => !img.alt).length
  if (missing > 0) return err('image-alt', `${missing} image(s) have no alt text`, 'add descriptive alt text to every image')
  return pass('image-alt', `all ${images.length} image(s) have alt text`)
}

// fetches each image - only surfaces failures, one summary pass if all ok
async function checkImagesReachable(images: Extracted['images']): Promise<CheckResult[]> {
  const withSrc = images.filter(img => img.src)
  if (withSrc.length === 0) return []

  type Result = { src: string; result: CheckResult | null }

  const results: Result[] = await Promise.all(withSrc.map(async ({ src }): Promise<Result> => {
    const id = `image-reachable:${src}`
    try {
      const res = await fetch(src)
      const contentType = res.headers.get('content-type') ?? ''

      if (!res.ok)
        return {
          src,
          result: err(id, `image not reachable (HTTP ${res.status}): ${src}`, 'fix sharing permissions or re-upload to a public host')
        }

      // google returns 200 with an html access-gate instead of the actual image
      if (contentType.includes('text/html')) {
        const body = await res.text()
        if (body.includes('You need access') || body.includes('accounts.google.com'))
          return {
            src,
            result: err(id, `image requires google login: ${src}`, 'share the file "anyone with the link" or re-upload to a public host')
          }
        return {
          src,
          result: warn(id, `image url returned html instead of an image: ${src}`, 'check the url is a direct image link')
        }
      }

      return { src, result: null }
    } catch {
      return { src, result: err(id, `image unreachable: ${src}`, 'check the url is correct and publicly hosted') }
    }
  }))

  const failures = results.map(r => r.result).filter(Boolean) as CheckResult[]
  if (failures.length === 0) return [pass('images-reachable', `all ${withSrc.length} image(s) reachable`)]
  return failures
}

// ---

function checkDuplicateLinks(links: Extracted['links']): CheckResult {
  const seen = new Set<string>()
  const dupes = new Set<string>()
  for (const { href } of links) {
    if (!href) continue
    seen.has(href) ? dupes.add(href) : seen.add(href)
  }
  if (dupes.size > 0) return warn('duplicate-links', `${dupes.size} duplicate link(s)`, 'avoid linking to the same url multiple times')
  return pass('duplicate-links', 'no duplicate links')
}

async function checkBrokenLinks(links: Extracted['links']): Promise<CheckResult[]> {
  const external = links.filter(l => l.href.startsWith('http'))
  if (external.length === 0) return []

  const results = await Promise.all(external.map(async ({ href }) => {
    try {
      // try HEAD first (faster), fall back to GET if server rejects HEAD
      let res = await fetch(href, { method: 'HEAD' })
      if (res.status === 405) res = await fetch(href)
      if (res.ok) return null
      return err(`link:${href}`, `broken link (HTTP ${res.status}): ${href}`, 'fix or remove this link')
    } catch {
      return err(`link:${href}`, `link unreachable: ${href}`, 'check the url is correct')
    }
  }))

  const failures = results.filter(Boolean) as CheckResult[]
  if (failures.length === 0) return [pass('links-reachable', `all ${external.length} link(s) reachable`)]
  return failures
}

// ---

export async function runStaticChecks(extracted: Extracted): Promise<CheckResult[]> {
  return [
    checkH1(extracted.headingsList, extracted.title),
    checkHeadingStructure(extracted.headingsList),
    checkMetaField('meta-title', extracted.metas.metaTitle, 'meta title', 50, 60),
    checkMetaField('meta-desc', extracted.metas.metaDescription, 'meta description', 120, 160),
    checkKeywords(extracted.metas.keywords),
    checkWordCount(extracted.wordCount),
    checkImageCount(extracted.images, extracted.wordCount),
    checkImageAltText(extracted.images),
    ...await checkImagesReachable(extracted.images),
    checkDuplicateLinks(extracted.links),
    ...await checkBrokenLinks(extracted.links)
  ]
}

