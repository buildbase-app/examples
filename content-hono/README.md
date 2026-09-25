# Content on Hono

A small public site whose words live in [BuildBase](https://buildbase.app): a blog, a help centre and a changelog, rendered on the server by [Hono](https://hono.dev). It is the example for **reading BuildBase content from your own backend**, on Node.js or Cloudflare Workers.

The pages are written in the BuildBase console. The server reads them with `@buildbase/sdk/server`, caches every read, and drops exactly what changed when BuildBase sends a content webhook. A visitor never talks to BuildBase, and the org API token never leaves the server.

> Needs `@buildbase/sdk` **0.0.72** or later, the release that ships `@buildbase/sdk/server`, and a BuildBase server with content delivery.

## What it shows

| Page | Content | Read with |
| --- | --- | --- |
| `/blog` | Published posts, newest first | `content.blogs.list()` |
| `/blog/<folder>/<slug>` | One post | `content.blogs.byPath()` |
| `/help` | The docs tree and pages, the FAQ collection `demo-help`, and the rich content block `refund-policy` | `docs.tree()`, `docs.list()`, `faqs.questions()`, `richContent.get()` |
| `/changelog` | Records of the collection `release-notes` | `collections.data()` |
| `POST /webhooks/buildbase` | Drops the cached reads a content event names | `createContentWebhookHandler()` |

## How it works

About 370 lines in `src`:

| File | What it does |
| --- | --- |
| [`content.ts`](src/content.ts) | Everything the app reads from BuildBase, behind a small interface. One server client, and so one cache, per token |
| [`app.tsx`](src/app.tsx) | The routes, and the pages in `hono/jsx` |
| `node.ts`, `worker.ts` | One per runtime. Each only hands `createApp()` to that runtime's server |

- **The token stays on the server.** `@buildbase/sdk/server` holds your org API token, so it refuses to run in a browser, and a bundler building for the browser resolves it to a module that throws. Nothing in the pages carries the token or calls BuildBase.
- **Every read is cached.** The first visit to `/help` makes four requests; the next ones make none while the cache is fresh (60 seconds, from BuildBase's `Cache-Control`). After that the client revalidates with `If-None-Match`, and an unchanged page costs one empty `304`, answered from BuildBase's own cache without touching its database.
- **Edits show up at once.** When you publish a post or change the refund policy, BuildBase sends a signed webhook naming what changed, for example `buildbase:rich_content:refund-policy`. The handler checks the signature against the exact bytes sent and drops those reads only. The docs and FAQs stay cached.
- **One cache per process on Node, shared on Workers.** On Node the cache lives in memory. On Workers each isolate has its own memory, so bind a KV namespace as `CONTENT_CACHE` (see [`wrangler.jsonc`](wrangler.jsonc)) and every isolate shares one cache.

## Set up BuildBase (about 10 minutes)

1. Create an organization at [console.buildbase.app](https://console.buildbase.app).
2. Write some content: a post under **Content, Blogs** (publish it), a page under **Content, Docs**, an FAQ collection with the slug `demo-help` and a few questions, a rich content block with the slug `refund-policy`, and a collection `release-notes` with fields `title`, `version`, `date` and `notes` plus a live version and a record or two.
3. Under **Settings, API tokens**, create a token with the **content-reader** role. It can read content and nothing else. It is shown once: `<orgId>:<secret>`.
4. Under **Settings, Webhooks**, add an endpoint for `<where the app runs>/webhooks/buildbase` and subscribe it to the content events (`blog.*`, `doc.*`, `faq.updated`, `faq_collection.updated`, `testimonial.*`, `rich_content.*`, `collection.*`). Copy its signing secret. BuildBase only delivers to HTTPS, so for local testing expose the app with a tunnel such as `cloudflared` or `ngrok`, or leave the webhook for the deployed site.

```bash
npm install
cp .env.example .env            # BUILDBASE_API_TOKEN and BUILDBASE_WEBHOOK_SECRET
npm run dev                     # Node.js, http://localhost:3000

cp .dev.vars.example .dev.vars  # the same values, for Workers
npm run dev:workers             # Cloudflare Workers in workerd, http://localhost:8787
```

| Variable | What it is |
| --- | --- |
| `BUILDBASE_API_TOKEN` | An org API token with the content-reader role, `<orgId>:<secret>`. Server only |
| `BUILDBASE_WEBHOOK_SECRET` | The webhook endpoint's signing secret |
| `BUILDBASE_SERVER_URL` | Optional; defaults to `https://api.console.buildbase.app` |
| `FAQ_COLLECTION`, `RICH_CONTENT`, `CHANGELOG_COLLECTION` | Optional slugs; default to `demo-help`, `refund-policy` and `release-notes` |

Until the token and the secret are set, every page lists the missing ones and the webhook answers 503.

## Deploy

- **Node.js**: `npm run build && npm start`, anywhere Node 22+ runs.
- **Cloudflare Workers**: `npx wrangler secret put BUILDBASE_API_TOKEN` and `BUILDBASE_WEBHOOK_SECRET`, optionally bind a KV namespace as `CONTENT_CACHE`, then `npm run deploy:workers`. The bundle is about 120 KiB, 32 KiB gzipped. Point the webhook endpoint at the `workers.dev` URL.

The same code runs on Bun and Deno; see the [hono](../hono) example for their entry files.

## Good to know

- **Tests.** `npm test` runs the pages against a fake BuildBase, and one test drives the real `@buildbase/sdk/server` over a stubbed `fetch`: the second visit makes no request, a forged webhook gets 401, and a signed `rich_content.updated` refetches the refund policy and nothing else.
- **Content is trusted HTML.** It is written by your own team in the console, so the pages render it as is. If editors you do not trust can write content, sanitise it in `app.tsx`.
- **Reads count.** BuildBase counts content reads that return a body toward your plan's content-read allowance; a `304` does not count. Caching, as this app does, keeps you well inside it.
- **Not JavaScript?** The same rules are plain HTTP: send the token as `Authorization: Bearer`, keep the `ETag`, send `If-None-Match`, and verify the webhook's HMAC. See the [content-static](../content-static) README for a `curl` version.

## License

MIT. Our own code.
