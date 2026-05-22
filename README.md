# scalerrs article qa

article quality pipeline for an seo agency. paste a google doc url, get static and ai-powered checks, generated meta,
and a clean html preview.

**demo:** https://scalerrs-developer-challenge-2026.vercel.app
**walkthrough:** https://www.loom.com/share/b3c41211487d40c5b5289815d43401f0

## structure

```
packages/core   - parsing, checks, meta generation (framework-agnostic)
apps/demo       - next.js ui
```

## getting started

```sh
bun install
```

set up env vars in `apps/demo/.env`:

```
ANTHROPIC_API_KEY=...
```

run the ui:

```sh
cd apps/demo
bun dev
```

## how it works

1. fetches a google doc as html
2. extracts headings, images, links, meta fields
3. runs static checks (heading structure, meta length, broken links, image alt text, etc.)
4. runs ai checks via claude (structure, tone, keyword stuffing, cta, etc.)
5. generates missing meta with ai, respecting any fields already defined in the doc

## ideas for the future

- internal link suggestions**
  - generate embeddings of all published articles and find the closest matches for each new one. instead of guessing
    what to link to, the system tells you.
- image hosting
  - automatically compress and re-upload images to a permanent host (r2, s3, cloudinary, next.js) so you're not shipping
    google drive links to production.
- richer meta
  - extend beyond title/description/keywords to og image generation, json-ld schema (article, faq, how-to), and twitter
    card tags. most of this can be derived from what's already extracted.
- batch mode
  - process a list of google doc urls in one go, run all checks in parallel, and send a summary notification (slack,
    email) when everything's done or when something fails.
- cms integration
  - direct publish to wordpress or shopify with all meta prefilled. the html is already clean and the meta is already
    generated - it's mostly just a matter of hooking into the api.
