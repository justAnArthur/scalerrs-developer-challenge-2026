const googleDocId = Bun.env.GOOGLE_DOC_ID!

async function fetchGoogleDoc(docId: string) {
  const url = `https://docs.google.com/document/d/${docId}/export?format=html`
  const response = await fetch(url, {
    headers: new Headers({ 'Content-Type': 'application/json' })
  })
  if (!response.ok) throw new Error(`Failed to fetch doc: ${response.status}`)
  return response.text()
}

const googleDoc = await fetchGoogleDoc(googleDocId)

console.log('googleDoc', googleDoc)

await Bun.write('./index.html', googleDoc)