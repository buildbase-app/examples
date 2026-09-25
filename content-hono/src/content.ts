import {
  createContentWebhookHandler,
  createServerClient,
  kvCache,
  memoryCache,
  type BlogPost,
  type CacheStore,
  type CollectionRecord,
  type ContentFolderTreeNode,
  type DocPage,
  type Faq,
  type KvLikeStore,
  type RichContent,
  type ServerClient,
} from '@buildbase/sdk/server';

/**
 * Everything this app reads from BuildBase, in one place. Routes use this
 * interface rather than the SDK directly, so the tests can hand the app a fake.
 *
 * `@buildbase/sdk/server` holds the org API token, so it only ever runs here,
 * on the server. Bundling it for a browser fails at build time.
 */
export type Env = {
  /** An org API token, `<orgId>:<secret>`. Give it the content-reader role. */
  BUILDBASE_API_TOKEN?: string;
  /** The signing secret of the webhook endpoint for /webhooks/buildbase. */
  BUILDBASE_WEBHOOK_SECRET?: string;
  BUILDBASE_SERVER_URL?: string;
  /** Slugs of the content the pages show. The defaults match the README. */
  FAQ_COLLECTION?: string;
  RICH_CONTENT?: string;
  CHANGELOG_COLLECTION?: string;
  /** Cloudflare Workers only: a KV namespace, shared by every isolate. */
  CONTENT_CACHE?: KvLikeStore;
};

export type ReleaseNote = {
  title?: string;
  version?: string;
  date?: string;
  notes?: string;
};

export interface HelpPage {
  docs: DocPage[];
  tree: ContentFolderTreeNode[];
  faqs: Faq[];
  refund: RichContent | null;
}

export interface ContentSource {
  posts(): Promise<BlogPost[]>;
  post(path: string): Promise<BlogPost | null>;
  help(): Promise<HelpPage>;
  changelog(): Promise<CollectionRecord<ReleaseNote>[]>;
  /** Verifies a BuildBase content webhook and drops what it names from the cache. */
  webhook(request: Request): Promise<Response>;
}

export const DEFAULT_SERVER_URL = 'https://api.console.buildbase.app';

/** The variables the app cannot work without, if any are unset. */
export function missingConfig(env: Env): string[] {
  return (['BUILDBASE_API_TOKEN', 'BUILDBASE_WEBHOOK_SECRET'] as const).filter(
    (key) => !env[key]
  );
}

// One client, and so one cache, per token. A Worker only sees its env inside
// a request, so the client is made on first use rather than at import time.
const clients = new Map<string, ServerClient>();

function clientFor(env: Env): ServerClient {
  const serverUrl = env.BUILDBASE_SERVER_URL || DEFAULT_SERVER_URL;
  const key = `${serverUrl}::${env.BUILDBASE_API_TOKEN}`;
  let client = clients.get(key);
  if (!client) {
    const cache: CacheStore = env.CONTENT_CACHE
      ? kvCache(env.CONTENT_CACHE)
      : memoryCache({ maxEntries: 500 });
    client = createServerClient({
      serverUrl,
      apiToken: env.BUILDBASE_API_TOKEN!,
      cache,
    });
    clients.set(key, client);
  }
  return client;
}

export function contentSource(env: Env): ContentSource {
  const content = clientFor(env);
  const faqCollection = env.FAQ_COLLECTION || 'demo-help';
  const richContent = env.RICH_CONTENT || 'refund-policy';
  const changelogCollection = env.CHANGELOG_COLLECTION || 'release-notes';
  const onWebhook = createContentWebhookHandler({
    secret: env.BUILDBASE_WEBHOOK_SECRET!,
    cache: content.cache,
  });

  return {
    async posts() {
      const page = await content.blogs.list({
        limit: 20,
        sort: { publishedAt: -1 },
      });
      return page.docs;
    },
    post: (path) => content.blogs.byPath(path),
    async help() {
      // Four independent reads. Each is cached on its own, and each is dropped
      // by the webhook that names it: editing the refund policy leaves the
      // docs and FAQs cached.
      const [docs, tree, faqs, refund] = await Promise.all([
        content.docs.list({ limit: 50 }),
        content.docs.tree(),
        content.faqs.questions(faqCollection),
        content.richContent.get(richContent),
      ]);
      return { docs: docs.docs, tree, faqs, refund };
    },
    changelog: () => content.collections.data<ReleaseNote>(changelogCollection),
    webhook: onWebhook,
  };
}
