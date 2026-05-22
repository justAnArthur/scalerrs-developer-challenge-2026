import type { Meta } from "../types.ts"
import { callAnthropic } from "../anthropic.ts"

type GeneratedFields = {
  metaTitle: string
  metaDescription: string
  keywords: string[]
}

async function generateFromAi(markdown: string): Promise<GeneratedFields> {
  const text = await callAnthropic(`generate seo meta for this article. return ONLY valid json, no markdown, no backticks.

rules:
- metaTitle: 50-60 characters, compelling, includes main keyword
- metaDescription: 120-160 characters, summarises the article with a soft cta
- keywords: array of 5-8 relevant keywords

article (markdown):
${markdown.slice(0, 3000)}

return:
{
  "metaTitle": "...",
  "metaDescription": "...",
  "keywords": ["...", "..."]
}`, 'claude-haiku-4-5', 512)

  return JSON.parse(text) as GeneratedFields
}

// merge: doc-defined fields take priority over ai-generated ones
export async function buildMeta(markdown: string, docMetas: Record<string, string>): Promise<Meta> {
  const generated = await generateFromAi(markdown)

  const sources: Meta['sources'] = {}

  const resolve = (key: keyof GeneratedFields, docKey = key as string): string => {
    if (docMetas[docKey]) {
      sources[key] = 'doc'
      return docMetas[docKey]!
    }
    sources[key] = 'generated'
    const val = generated[key]
    return Array.isArray(val) ? val.join(', ') : val
  }

  // keywords: doc stores as comma-separated string, we return as array
  const keywordsRaw = docMetas['keywords']
  const keywords = keywordsRaw
    ? keywordsRaw.split(',').map(k => k.trim()).filter(Boolean)
    : generated.keywords
  if (keywordsRaw) sources['keywords'] = 'doc'
  else sources['keywords'] = 'generated'

  return {
    metaTitle: resolve('metaTitle'),
    metaDescription: resolve('metaDescription'),
    keywords,
    sources
  }
}
