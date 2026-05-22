import { parse } from "node-html-parser"
import type { Extracted } from "./types"

const supportedMetas = [
  { name: 'metaTitle', aliases: ['Meta Title'] },
  { name: 'metaDescription', aliases: ['Meta Description'] },
  { name: 'keywords', aliases: ['Meta Keywords'] }
]

export function extractFromDoc(root: ReturnType<typeof parse>): Extracted {
  const allParagraphs = root.querySelectorAll('p')

  // pull out meta fields from paragraphs that start with a known alias
  const metas: Record<string, string> = {}
  for (const p of allParagraphs) {
    const text = p.textContent.trim()
    for (const meta of supportedMetas) {
      for (const alias of meta.aliases) {
        if (text.startsWith(alias + ':')) {
          metas[meta.name] = text.slice(alias.length + 1).trim()
          p.remove()
        }
      }
    }
  }

  const title = root.querySelector('h1')?.textContent.trim()

  const headingsList = root.querySelectorAll('h1, h2, h3, h4, h5, h6')
    .map(el => el.tagName.toLowerCase())

  const wordCount = root.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li')
    .map(el => el.textContent.trim())
    .join(' ')
    .split(/\s+/)
    .filter(w => w).length

  const images = root.querySelectorAll('img').map(img => ({
    src: img.getAttribute('src') ?? '',
    alt: img.getAttribute('alt') ?? ''
  }))

  // images referenced as "IMAGE 1" paragraphs - extract data and replace with <img> in the DOM
  const textImages = allParagraphs
    .filter(p => p.textContent.trim().match(/IMAGE\s*\d+/i))
    .map(p => {
      const href = p.querySelector('a')?.getAttribute('href') ?? ''
      const src = new URL(href).searchParams.get('q') ?? href
      const text = p.textContent.trim()
      const alt = text.match(/alt\s*tag\s*:\s*[\u201C\u201D"]?(.+?)[\u201C\u201D"]?$/i)?.[1]?.trim() ?? ''

      // swap the paragraph for an actual img so the preview renders it
      p.replaceWith(`<img src="${src}" alt="${alt}" />`)

      return { src, alt }
    })

  images.push(...textImages)

  const links = root.querySelectorAll('a').map(a => ({
    href: a.getAttribute('href') ?? '',
    text: a.textContent.trim()
  }))

  const bodyHtml = root.querySelector('body')?.innerHTML ?? root.innerHTML

  return { title, headingsList, wordCount, images, links, metas, bodyHtml }
}
