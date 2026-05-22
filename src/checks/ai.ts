import type { CheckResult } from "../types.ts"

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'

// shape the AI returns for each check
type AiCheck = {
  id: string
  label: string
  passed: boolean
  message: string
}

async function callAnthropic(prompt: string): Promise<AiCheck[]> {
  const apiKey = Bun.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error(`anthropic api error: ${res.status} ${await res.text()}`)

  const data = await res.json() as { content: { type: string; text: string }[] }
  const text = data.content.find(b => b.type === 'text')?.text ?? ''

  // strip possible Markdown code fences before parsing
  const json = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  const parsed = JSON.parse(json) as { checks: AiCheck[] }
  return parsed.checks
}

function toCheckResult(c: AiCheck): CheckResult {
  return {
    id: c.id,
    type: 'ai',
    status: c.passed ? 'pass' : 'warning',
    message: `${c.label}: ${c.message}`,
  }
}

// ---

export async function runAiChecks(markdown: string): Promise<CheckResult[]> {
  const prompt = `you are an seo content analyst. analyze this article and return quality check results as json.

rules:
- return ONLY valid json, no markdown, no backticks
- "passed" is true if the check is satisfied, false if there is an issue
- keep messages short and specific
- for "product-links": passed if the article has a reasonable number of product/shop links relative to its length (not zero, not excessive — e.g. every sentence); identify links by context (anchor text, surrounding copy, url patterns like /products/ /shop/ /buy/)

article (markdown):
${markdown.slice(0, 10000)}

return this exact structure:
{
  "checks": [
    { "id": "structure",        "label": "logical structure",         "passed": true,  "message": "..." },
    { "id": "lexical",          "label": "lexical quality",           "passed": true,  "message": "..." },
    { "id": "repetition",       "label": "no repetitive content",     "passed": true,  "message": "..." },
    { "id": "sentence-length",  "label": "sentence length",           "passed": true,  "message": "..." },
    { "id": "transitions",      "label": "section transitions",       "passed": true,  "message": "..." },
    { "id": "keyword-stuffing", "label": "no keyword stuffing",       "passed": true,  "message": "..." },
    { "id": "cta",              "label": "call to action present",    "passed": true,  "message": "..." },
    { "id": "tone",             "label": "consistent tone",           "passed": true,  "message": "..." },
    { "id": "product-links",    "label": "product link balance",      "passed": true,  "message": "..." }
  ]
}`

  const raw = await callAnthropic(prompt)
  return raw.map(toCheckResult)
}

