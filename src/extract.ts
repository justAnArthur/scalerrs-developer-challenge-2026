import type { Document, ChildNode } from "@tkeron/html-parser/src/dom-types.ts"
import type { Extracted } from "./types.ts"

const supportedMetas = [
  { name: 'metaTitle', aliases: ['Meta Title'] },
  { name: 'metaDescription', aliases: ['Meta Description'] },
  { name: 'keywords', aliases: ['Meta Keywords'] }
]

// depth-first walk collecting elements whose tag matches the predicate - the querySelectorAll is not fully supported
function walkElements(node: ChildNode, match: (tag: string) => boolean, result: { tag: string; text: string }[] = []) {
  const tag = (node as any).tagName?.toLowerCase() as string | undefined
  if (tag && match(tag)) result.push({ tag, text: (node as any).textContent ?? '' })
  for (const child of (node as any).childNodes ?? []) walkElements(child, match, result)
  return result
}

export function extractFromDoc(doc: Document): Extracted {
  const allParagraphs = doc.querySelectorAll('p')

  // pull out meta fields from paragraphs that start with a known alias
  const metas: Record<string, string> = {}
  for (const p of allParagraphs) {
    const text = p.textContent.trim()
    for (const meta of supportedMetas) {
      for (const alias of meta.aliases) {
        if (text.startsWith(alias + ':')) {
          metas[meta.name] = text.slice(alias.length + 1).trim()
          p.parentNode?.removeChild(p)
        }
      }
    }
  }

  const title = doc.querySelector('h1')?.textContent.trim()

  // ordered headings in document — counts derived in checks as needed
  const headingsList = walkElements(doc as any, tag => /^h[1-6]$/.test(tag)).map(el => el.tag)

  // word count from content elements
  const wordCount = walkElements(doc as any, tag => /^(p|h[1-6]|li)$/.test(tag))
    .map(el => el.text.trim())
    .join(' ')
    .split(/\s+/)
    .filter(w => w).length

  // images embedded in the doc
  const images = doc.querySelectorAll('img').map(img => ({
    src: img.getAttribute('src') ?? '',
    alt: img.getAttribute('alt') ?? ''
  }))

  // images referenced as "IMAGE 1" paragraphs with a link and optional alt tag
  const textImages = allParagraphs
    .filter(p => p.textContent.trim().match(/IMAGE\s*\d+/i))
    .map(p => {
      const href = p.querySelector('a')?.getAttribute('href') ?? ''
      const src = new URL(href).searchParams.get('q') ?? href
      const text = p.textContent.trim()
      const alt = text.match(/alt\s*tag\s*:\s*[\u201C\u201D"]?(.+?)[\u201C\u201D"]?$/i)?.[1]?.trim() ?? ''
      return { src, alt }
    })

  images.push(...textImages)

  const links = doc.querySelectorAll('a').map(a => ({
    href: a.getAttribute('href') ?? '',
    text: a.textContent.trim()
  }))

  const bodyHtml = doc.body?.innerHTML ?? doc.querySelectorAll('body')[0]?.innerHTML ?? ''
  console.log('bodyHtml', bodyHtml)

  return { title, headingsList, wordCount, images, links, metas, bodyHtml }
}
