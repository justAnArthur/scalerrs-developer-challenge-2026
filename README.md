# scalerrs article qa

article quality pipeline for an seo agency. paste a google doc url, get static and ai-powered checks, generated meta, and a clean html preview.

## structure

```
packages/core   — parsing, checks, meta generation (framework-agnostic)
apps/demo       — next.js ui
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
