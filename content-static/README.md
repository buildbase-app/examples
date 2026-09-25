# Content, built in

A static site whose content comes from [BuildBase](https://buildbase.app), pulled once when the site is built. It is the example for **sites with no backend of their own**: a [Vite](https://vite.dev) build, a single-page app, or any static site generator.

The build runs `buildbase content pull`, which writes every published post, doc, FAQ, testimonial, rich content block and collection record to `src/content.json`. Vite renders that into `index.html`. What ships is plain HTML and CSS: no script, no token, and no request to BuildBase when someone opens the page.

> Needs `@buildbase/sdk` **0.0.72** or later, the release that ships the `buildbase` CLI and `@buildbase/sdk/server`.

## How it works

| File | What it does |
| --- | --- |
| [`scripts/pull-content.mjs`](scripts/pull-content.mjs) | Runs before every build. With a token, calls `buildbase content pull`; without one, writes an empty file so the site still builds |
| [`src/render.ts`](src/render.ts) | Turns the pulled content into the page's HTML, once, at build time |
| [`vite.config.ts`](vite.config.ts) | A small plugin that puts that HTML into `index.html` |
| [`.github/workflows/content.yml`](.github/workflows/content.yml) | A GitHub Actions workflow that rebuilds the site when content changes |

- **The token lives in CI only.** `BUILDBASE_API_TOKEN` is a build-time secret: in `.env` on your machine, in the CI secrets on the build server. It is never in the site's files. The test run below checks that.
- **Content is fetched once per build**, not once per visitor. A thousand page views cost BuildBase nothing.
- **Rebuild on change.** BuildBase sends a signed webhook when content changes. A small relay turns that into a `repository_dispatch`, and the workflow rebuilds and deploys. Or skip the relay: BuildBase's own deploy hooks (**Settings, Deployments**) can call your host's build hook directly.

## Set up BuildBase (about 5 minutes)

1. Create an organization at [console.buildbase.app](https://console.buildbase.app), and write some content: a published blog post, a docs page, an FAQ collection, a rich content block, a testimonial, a collection with a live version.
2. Under **Settings, API tokens**, create a token with the **content-reader** role. It can read content and nothing else. It is shown once: `<orgId>:<secret>`.

```bash
npm install
cp .env.example .env    # BUILDBASE_API_TOKEN
set -a; . ./.env; set +a
npm run build           # pulls the content, then builds dist/
npm run preview         # http://localhost:4173
```

| Variable | Used by | What it is |
| --- | --- | --- |
| `BUILDBASE_API_TOKEN` | the build only | An org API token with the content-reader role, `<orgId>:<secret>` |
| `BUILDBASE_SERVER_URL` | the build only | Optional; defaults to `https://api.console.buildbase.app` |
| `CONTENT_COLLECTIONS` | the build only | Optional; which collections to pull, e.g. `release-notes`. Default: every live collection |

Without a token, `npm run build` still succeeds and the page says what to set.

## Rebuild when content changes

1. Copy [`.github/workflows/content.yml`](.github/workflows/content.yml) to `.github/workflows/` in the site's repository, and add `BUILDBASE_API_TOKEN` to its Actions secrets. Add your host's deploy step at the end.
2. Deploy a relay that turns BuildBase's webhook into a `repository_dispatch`. For example, a Cloudflare Worker:

   ```ts
   import { handleContentWebhook } from '@buildbase/sdk/server';

   type Env = { BUILDBASE_WEBHOOK_SECRET: string; GITHUB_TOKEN: string; GITHUB_REPO: string };

   export default {
     fetch: (request: Request, env: Env) =>
       handleContentWebhook(request, {
         secret: env.BUILDBASE_WEBHOOK_SECRET,
         // Runs only for a verified content event.
         onEvent: async (event) => {
           await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/dispatches`, {
             method: 'POST',
             headers: {
               Authorization: `Bearer ${env.GITHUB_TOKEN}`,
               Accept: 'application/vnd.github+json',
               'User-Agent': 'buildbase-content-relay',
             },
             body: JSON.stringify({ event_type: 'buildbase-content', client_payload: { event: event.event } }),
           });
         },
       }),
   };
   ```

   `GITHUB_TOKEN` is a fine-grained token with **Contents: read and write** on the site's repository, which is what `repository_dispatch` needs.
3. In the console, under **Settings, Webhooks**, add an endpoint for the relay's URL, subscribe it to the content events, and give the relay its signing secret as `BUILDBASE_WEBHOOK_SECRET`.

The workflow's `concurrency` setting folds a burst of edits into one rebuild.

## Not JavaScript

Any static site generator can do the same with `curl`. The token goes in the header, from the build only, and BuildBase's `ETag` lets a rebuild skip unchanged content:

```bash
# First pull: keep the body and its ETag.
curl -s -D headers.txt -o blogs.json \
  -H "Authorization: Bearer $BUILDBASE_API_TOKEN" \
  "https://api.console.buildbase.app/api/blogs?filter[published]=true&\$limit=100"
grep -i '^etag:' headers.txt | cut -d' ' -f2- | tr -d '\r' > blogs.etag

# Next build: an unchanged list answers 304 with no body, and blogs.json stays as it is.
curl -s -o blogs.new -w '%{http_code}\n' \
  -H "Authorization: Bearer $BUILDBASE_API_TOKEN" \
  -H "If-None-Match: $(cat blogs.etag)" \
  "https://api.console.buildbase.app/api/blogs?filter[published]=true&\$limit=100"
```

A `200` means new content: move `blogs.new` over `blogs.json` and save the new ETag. A `304` does not count toward your plan's content-read allowance. The same applies to `/api/docs`, `/api/faqs/collections/slug/<slug>/faqs`, `/api/rich-content/slug/<slug>`, `/api/testimonials` and `/api/collections/data/<slug>?latest=true`.

## Good to know

- **Tests.** `npm test` renders a sample of every module and checks titles are escaped and posts come newest first. The pull and build were also run for real against a local BuildBase, and neither `dist/` nor `src/content.json` contains the token.
- **Content is trusted HTML.** It is written by your own team in the console, so it is inserted as is. If editors you do not trust can write it, sanitise it in `src/render.ts`.
- **`src/content.json` is not committed.** It is generated on every build; commit it only if you want the site to build without a token.

## License

MIT. Our own code.
