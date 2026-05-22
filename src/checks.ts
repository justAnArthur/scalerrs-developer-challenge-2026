import type { CheckResult, ChecksReport, Extracted } from "./types.ts"

// factories
const pass = (message: string): CheckResult => ({ status: 'pass', message })
const warn = (message: string, suggestion?: string): CheckResult => ({ status: 'warning', message, suggestion })
const err = (message: string, suggestion?: string): CheckResult => ({ status: 'error', message, suggestion })

// individual checkers

function checkTitle(title?: string): CheckResult {
  if (!title) return err('Missing h1 title', 'Add a main heading (h1) to your document')
  if (title.length < 10) return warn(`Title too short (${title.length} chars)`, 'Aim for 10–60 characters')
  if (title.length > 60) return warn(`Title too long (${title.length} chars)`, 'Keep it under 60 characters')
  return pass(`Title looks good (${title.length} chars)`)
}

function checkMetaField(value: string | undefined, name: string, min: number, max: number): CheckResult {
  if (!value) return warn(`Missing ${name}`, `Add "${name}:" to your document`)
  if (value.length < min) return warn(`${name} too short (${value.length} chars)`, `Aim for ${min}–${max} characters`)
  if (value.length > max) return warn(`${name} too long (${value.length} chars)`, `Keep it under ${max} characters`)
  return pass(`${name} looks good (${value.length} chars)`)
}

function checkKeywords(keywords?: string): CheckResult {
  if (!keywords) return warn('Missing Meta Keywords', 'Add "Meta Keywords:" to your document')
  const count = keywords.split(',').filter(k => k.trim()).length
  if (count < 3) return warn(`Too few keywords (${count})`, 'Aim for 5–10')
  if (count > 10) return warn(`Too many keywords (${count})`, 'Keep it to 10 max')
  return pass(`Keywords look good (${count})`)
}

function checkImages(images: Extracted['images']): CheckResult[] {
  if (images.length === 0) return [warn('No images found', 'Consider adding images to engage readers')]

  const missingSrc = images.filter(img => !img.src).length
  const missingAlt = images.filter(img => !img.alt).length

  return [
    missingSrc > 0
      ? err(`${missingSrc} image(s) have no URL`, 'Make sure every image has a valid source URL')
      : pass(`All ${images.length} image(s) have URLs`),
    missingAlt > 0
      ? err(`${missingAlt} image(s) have no alt text`, 'Add descriptive alt text to every image for SEO and accessibility')
      : pass(`All ${images.length} image(s) have alt text`)
  ]
}

async function checkImagesAccessible(images: Extracted['images']): Promise<CheckResult[]> {
  const withSrc = images.filter(img => img.src)
  if (withSrc.length === 0) return []

  return Promise.all(withSrc.map(async ({ src }): Promise<CheckResult> => {
    try {
      const res = await fetch(src, { method: 'HEAD' })
      if (res.ok) return pass(`Image is publicly accessible: ${src}`)
      return err(`Image not publicly accessible (HTTP ${res.status}): ${src}`, 'Upload to a public host or fix sharing permissions')
    } catch {
      return err(`Image unreachable: ${src}`, 'Check the URL is correct and publicly hosted')
    }
  }))
}

function checkLinks(links: Extracted['links']): CheckResult[] {
  if (links.length === 0) return [warn('No links found', 'Add relevant links to improve SEO and engagement')]

  const brokenHref = links.filter(l => !l.href).length
  const emptyText = links.filter(l => !l.text).length

  return [
    brokenHref > 0
      ? err(`${brokenHref} link(s) have no URL`, 'Every link needs a valid href')
      : pass(`All ${links.length} link(s) have URLs`),
    emptyText > 0
      ? warn(`${emptyText} link(s) have no text`, 'Add descriptive text to every link')
      : pass(`All ${links.length} link(s) have text`)
  ]
}

// main runner

export async function runChecks(extracted: Extracted): Promise<ChecksReport> {
  const checks: CheckResult[] = [
    checkTitle(extracted.title),
    checkMetaField(extracted.metas.metaTitle, 'Meta Title', 10, 60),
    checkMetaField(extracted.metas.metaDescription, 'Meta Description', 120, 160),
    checkKeywords(extracted.metas.keywords),
    ...checkImages(extracted.images),
    ...await checkImagesAccessible(extracted.images),
    ...checkLinks(extracted.links)
  ]

  const summary = {
    passed: checks.filter(c => c.status === 'pass').length,
    warnings: checks.filter(c => c.status === 'warning').length,
    errors: checks.filter(c => c.status === 'error').length
  }

  return { checks, summary }
}

