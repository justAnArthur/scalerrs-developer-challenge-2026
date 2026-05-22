const API = 'https://api.anthropic.com/v1/messages'

export async function callAnthropic(prompt: string, model = 'claude-haiku-4-5', maxTokens = 1024): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')

  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!res.ok) throw new Error(`anthropic api error: ${res.status} ${await res.text()}`)

  const data = await res.json() as { content: { type: string; text: string }[] }
  const text = data.content.find(b => b.type === 'text')?.text ?? ''

  // strip possible markdown code fences before returning
  return text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
}

