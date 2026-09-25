import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.tsx';
import type { ContentSource, Env } from '../src/content.ts';

const BASE = 'http://localhost:3000';
const CONFIGURED: Env = {
  BUILDBASE_API_TOKEN: 'org_1:secret',
  BUILDBASE_WEBHOOK_SECRET: 'whsec_test',
};

// A stand-in for BuildBase with one post, one doc, one question, a refund
// policy and two release notes.
function fakeSource(): ContentSource {
  return {
    async posts() {
      return [
        {
          _id: 'p1',
          title: 'Hello from BuildBase',
          slug: 'hello',
          description: 'The first post',
          content: '<p>Written in the console.</p>',
          publishedAt: '2026-09-20T10:00:00.000Z',
          folder: { _id: 'f1', name: 'News', slug: 'news', path: 'news' },
        },
      ] as never;
    },
    async post(path) {
      return path === 'news/hello'
        ? ({
            title: 'Hello from BuildBase',
            content: '<p>Written in the console.</p>',
            publishedAt: null,
          } as never)
        : null;
    },
    async help() {
      return {
        docs: [
          { title: 'Getting started', content: '<p>Sign in first.</p>' },
        ] as never,
        tree: [{ name: 'Guides', children: [{ name: 'Basics' }] }],
        faqs: [
          { question: 'Can I self-host?', answer: '<p>Yes.</p>' },
        ] as never,
        refund: {
          title: 'Refund policy',
          content: '<p>Within 14 days.</p>',
        } as never,
      };
    },
    async changelog() {
      return [
        {
          data: {
            version: '0.1.0',
            title: 'First release',
            date: '2026-09-01',
          },
        },
        { data: { version: '0.2.0', title: 'The tour', date: '2026-09-24' } },
      ] as never;
    },
    async webhook() {
      return new Response('ok');
    },
  };
}

const get = (
  app: ReturnType<typeof createApp>,
  path: string,
  env: Env = CONFIGURED
) => app.request(`${BASE}${path}`, {}, env);

describe('pages', () => {
  const app = createApp(() => fakeSource());

  it('lists posts with a link by folder path', async () => {
    const res = await get(app, '/blog');
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.match(body, /href="\/blog\/news\/hello"/);
    assert.match(body, /The first post/);
  });

  it('renders a post by path, and 404s an unknown one', async () => {
    assert.match(
      await (await get(app, '/blog/news/hello')).text(),
      /Written in the console/
    );
    assert.equal((await get(app, '/blog/nope')).status, 404);
  });

  it('renders the help centre: tree, docs, questions and the refund policy', async () => {
    const body = await (await get(app, '/help')).text();
    for (const text of [
      'Guides',
      'Basics',
      'Getting started',
      'Can I self-host?',
      'Within 14 days',
    ]) {
      assert.ok(body.includes(text), `missing ${text}`);
    }
  });

  it('renders the changelog newest first', async () => {
    const body = await (await get(app, '/changelog')).text();
    assert.ok(body.indexOf('0.2.0') < body.indexOf('0.1.0'));
  });

  it('shows what is missing until it is configured, and refuses webhooks', async () => {
    const res = await get(app, '/blog', {});
    assert.equal(res.status, 503);
    assert.match(
      await res.text(),
      /BUILDBASE_API_TOKEN, BUILDBASE_WEBHOOK_SECRET/
    );
    const hook = await app.request(
      `${BASE}/webhooks/buildbase`,
      { method: 'POST', body: '{}' },
      {}
    );
    assert.equal(hook.status, 503);
  });

  it('turns a refused token into a page that says so', async () => {
    const refused = createApp(() => ({
      ...fakeSource(),
      async posts() {
        throw Object.assign(new Error('Forbidden'), { status: 403 });
      },
    }));
    const res = await get(refused, '/blog');
    assert.equal(res.status, 502);
    assert.match(await res.text(), /refused the API token/);
  });
});

// The real SDK against a fake BuildBase over fetch: a repeat visit is served
// from the cache, and a signed webhook drops exactly what it names.
describe('caching through @buildbase/sdk/server', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  async function sign(secret: string, body: string) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const mac = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`${timestamp}.${body}`)
    );
    const hex = [...new Uint8Array(mac)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return { timestamp, signature: `sha256=${hex}` };
  }

  it('reads once, serves the cache, and refetches after a webhook', async () => {
    let policy = 'Within 14 days.';
    const calls: string[] = [];
    globalThis.fetch = (async (
      input: RequestInfo | URL,
      init?: RequestInit
    ) => {
      const url = new URL(String(input instanceof Request ? input.url : input));
      calls.push(url.pathname);
      assert.equal(
        new Headers(init?.headers).get('Authorization'),
        'Bearer org_cache:secret'
      );
      const json = (data: unknown) =>
        new Response(JSON.stringify({ success: true, data }), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'private, max-age=60',
          },
        });
      if (url.pathname === '/api/rich-content/slug/refund-policy') {
        return json({
          _id: 'r1',
          slug: 'refund-policy',
          title: 'Refund policy',
          content: `<p>${policy}</p>`,
        });
      }
      if (url.pathname.startsWith('/api/faqs/collections/slug/'))
        return json([]);
      if (url.pathname === '/api/docs/folders/tree') return json([]);
      return json({
        docs: [],
        totalDocs: 0,
        limit: 50,
        page: 1,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
        nextPage: null,
        prevPage: null,
      });
    }) as typeof fetch;

    const env: Env = {
      BUILDBASE_API_TOKEN: 'org_cache:secret',
      BUILDBASE_WEBHOOK_SECRET: 'whsec_cache',
      BUILDBASE_SERVER_URL: 'https://buildbase.test',
    };
    const app = createApp();

    assert.match(await (await get(app, '/help', env)).text(), /Within 14 days/);
    const afterFirst = calls.length;
    assert.match(await (await get(app, '/help', env)).text(), /Within 14 days/);
    assert.equal(
      calls.length,
      afterFirst,
      'the second visit made no request to BuildBase'
    );

    policy = 'Within 30 days.';
    const body = JSON.stringify({
      event: 'rich_content.updated',
      timestamp: Date.now(),
      data: {
        module: 'rich_content',
        id: 'r1',
        slug: 'refund-policy',
        path: null,
        tags: [
          'buildbase:rich_content',
          'buildbase:rich_content:refund-policy',
          'buildbase:rich_content:id:r1',
        ],
      },
    });
    const { timestamp, signature } = await sign('whsec_cache', body);
    const forged = await app.request(
      `${BASE}/webhooks/buildbase`,
      {
        method: 'POST',
        body,
        headers: {
          'x-buildbase-signature': 'sha256=00',
          'x-buildbase-timestamp': timestamp,
        },
      },
      env
    );
    assert.equal(forged.status, 401);
    const hook = await app.request(
      `${BASE}/webhooks/buildbase`,
      {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/json',
          'x-buildbase-signature': signature,
          'x-buildbase-timestamp': timestamp,
          'x-buildbase-event': 'rich_content.updated',
        },
      },
      env
    );
    assert.equal(hook.status, 200);

    const beforeRefetch = calls.length;
    assert.match(await (await get(app, '/help', env)).text(), /Within 30 days/);
    assert.deepEqual(
      calls.slice(beforeRefetch),
      ['/api/rich-content/slug/refund-policy'],
      'only the refund policy was refetched'
    );
  });
});
