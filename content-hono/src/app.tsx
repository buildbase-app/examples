import { Hono, type Context } from 'hono';
import { env } from 'hono/adapter';
import { raw } from 'hono/html';
import type { Child } from 'hono/jsx';
import type { BlogPost, ContentFolderTreeNode } from '@buildbase/sdk/server';
import {
  contentSource,
  missingConfig,
  type ContentSource,
  type Env,
} from './content.ts';

type App = { Bindings: Env };

/**
 * A small public site whose content lives in BuildBase: a blog, a help centre
 * and a changelog. Every page is rendered on the server from cached reads; a
 * content webhook drops what changed, so the next visit shows the edit.
 *
 * `sourceFor` is the seam the tests use to hand the app a fake BuildBase.
 */
export function createApp(
  sourceFor: (env: Env) => ContentSource = contentSource
) {
  const app = new Hono<App>();
  // `env()` reads process.env, Bun.env, Deno.env or the Worker's bindings,
  // whichever applies. Bindings passed to `app.request()` (the tests) win.
  const config = (c: Context<App>): Env => ({
    ...env<Env>(c),
    ...(c.env ?? {}),
  });

  // Content is HTML written by your own team in the console, so it is trusted
  // and rendered as is. If editors you do not trust can write it, sanitise it
  // here before rendering.
  const html = (value: string | undefined) => raw(value ?? '');

  // Until the token and webhook secret are set, every page says what is missing.
  app.use('*', async (c, next) => {
    if (c.req.path === '/health') return next();
    const missing = missingConfig(config(c));
    if (!missing.length) return next();
    if (c.req.method !== 'GET')
      return c.text(
        `Content is not configured. Set ${missing.join(', ')}.`,
        503
      );
    return c.html(
      <Page title="Set up">
        <h1>Almost there</h1>
        <p>
          Set <code>{missing.join(', ')}</code> in <code>.env</code> (or the
          Worker's secrets). The README lists the console steps.
        </p>
      </Page>,
      503
    );
  });

  app.get('/health', (c) => c.json({ ok: true }));

  app.get('/', (c) => c.redirect('/blog'));

  app.get('/blog', async (c) => {
    const posts = await sourceFor(config(c)).posts();
    return c.html(
      <Page title="Blog">
        <h1>Blog</h1>
        {posts.length ? (
          <ul class="list">
            {posts.map((post) => (
              <li>
                <a href={`/blog/${postPath(post)}`}>{post.title}</a>
                {post.description ? <p>{post.description}</p> : null}
                <Published at={post.publishedAt} />
              </li>
            ))}
          </ul>
        ) : (
          <p class="muted">
            No published posts yet. Publish one under Content, Blogs in the
            console.
          </p>
        )}
      </Page>
    );
  });

  // `/blog/<folder>/<slug>`, or `/blog/<slug>` for a post outside any folder.
  app.get('/blog/*', async (c) => {
    const path = decodeURIComponent(c.req.path.replace(/^\/blog\//, ''));
    const post = await sourceFor(config(c)).post(path);
    if (!post) {
      return c.html(
        <Page title="Not found">
          <h1>Not found</h1>
          <p>
            <a href="/blog">All posts</a>
          </p>
        </Page>,
        404
      );
    }
    return c.html(
      <Page title={post.title}>
        <p>
          <a href="/blog">All posts</a>
        </p>
        <h1>{post.title}</h1>
        <Published at={post.publishedAt} />
        <article>{html(post.content)}</article>
      </Page>
    );
  });

  app.get('/help', async (c) => {
    const { docs, tree, faqs, refund } = await sourceFor(config(c)).help();
    return c.html(
      <Page title="Help">
        <h1>Help</h1>
        <section>
          <h2>Docs</h2>
          {tree.length ? <Tree nodes={tree} /> : null}
          {docs.length ? (
            docs.map((doc) => (
              <details>
                <summary>{doc.title}</summary>
                <div>{html(doc.content)}</div>
              </details>
            ))
          ) : (
            <p class="muted">No published docs yet.</p>
          )}
        </section>
        <section>
          <h2>Questions</h2>
          {faqs.length ? (
            faqs.map((faq) => (
              <details>
                <summary>{faq.question}</summary>
                <div>{html(faq.answer)}</div>
              </details>
            ))
          ) : (
            <p class="muted">No questions in this FAQ collection yet.</p>
          )}
        </section>
        {refund ? (
          <section>
            <h2>{refund.title}</h2>
            <div>{html(refund.content)}</div>
          </section>
        ) : null}
      </Page>
    );
  });

  app.get('/changelog', async (c) => {
    const records = await sourceFor(config(c)).changelog();
    const notes = records
      .map((record) => record.data)
      .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
    return c.html(
      <Page title="Changelog">
        <h1>Changelog</h1>
        {notes.length ? (
          <ul class="list">
            {notes.map((note) => (
              <li>
                <strong>{note.version ? `${note.version}: ` : ''}</strong>
                {note.title}
                {note.date ? (
                  <span class="muted"> {formatDate(note.date)}</span>
                ) : null}
                {note.notes ? <div>{html(note.notes)}</div> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p class="muted">No records in this collection yet.</p>
        )}
      </Page>
    );
  });

  // BuildBase posts here when content changes. The handler checks the
  // signature against the exact bytes sent, then drops the cached reads the
  // event names, so the next request fetches the new version.
  app.post('/webhooks/buildbase', (c) =>
    sourceFor(config(c)).webhook(c.req.raw)
  );

  app.onError((err, c) => {
    const status = (err as { status?: number }).status;
    console.error(err);
    const message =
      status === 401 || status === 403
        ? 'BuildBase refused the API token. Check it, and that its role can read content.'
        : 'BuildBase could not be reached.';
    return c.html(
      <Page title="Error">
        <h1>Something went wrong</h1>
        <p>{message}</p>
      </Page>,
      502
    );
  });

  return app;
}

/** The path a post is read by: `<folder path>/<slug>`, or just the slug. */
function postPath(post: BlogPost): string {
  const folder =
    typeof post.folder === 'object' && post.folder ? post.folder.path : '';
  return [folder, post.slug].filter(Boolean).join('/');
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
}

function Published({ at }: { at: string | null }) {
  return at ? <p class="muted">{formatDate(at)}</p> : null;
}

function Tree({ nodes }: { nodes: ContentFolderTreeNode[] }) {
  return (
    <ul class="tree">
      {nodes.map((node) => {
        const children = (node.children ?? node.subFolders ?? []).filter(
          (child): child is ContentFolderTreeNode => typeof child === 'object'
        );
        return (
          <li>
            {node.name ?? node.slug}
            {children.length ? <Tree nodes={children} /> : null}
          </li>
        );
      })}
    </ul>
  );
}

function Page({ title, children }: { title: string; children: Child }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`${title} · Content on Hono`}</title>
        <style>{`
          body { font: 16px/1.6 system-ui, sans-serif; max-width: 44rem; margin: 2rem auto; padding: 0 1rem; color: #1f2328; }
          nav a { margin-right: 1rem; }
          .muted { color: #6e7781; font-size: 0.9rem; }
          .list { padding-left: 1.2rem; } .list li { margin-bottom: 1rem; }
          details { border: 1px solid #d0d7de; border-radius: 6px; padding: 0.5rem 0.8rem; margin: 0.5rem 0; }
          code { background: #f6f8fa; padding: 0 0.3rem; border-radius: 4px; }
        `}</style>
      </head>
      <body>
        <nav>
          <a href="/blog">Blog</a>
          <a href="/help">Help</a>
          <a href="/changelog">Changelog</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
