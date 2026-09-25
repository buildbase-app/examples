import type { PulledContent } from '@buildbase/sdk/server';

/**
 * What `npm run content` wrote: the pulled content, or a marker saying no
 * token was set. Types only come from the SDK; nothing of it runs in the page.
 */
export type ContentFile =
  | (PulledContent & { configured?: true })
  | { configured: false; generatedAt: string };

const escape = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (ch) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        ch
      ]!
  );

// Content is HTML your own team wrote in the console, so it is inserted as is.
// If editors you do not trust can write it, sanitise it here.
const trusted = (value: unknown) => String(value ?? '');

const date = (value: unknown) => {
  const d = new Date(String(value ?? ''));
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

function section(title: string, body: string, empty: string) {
  return `<section><h2>${escape(title)}</h2>${body || `<p class="muted">${escape(empty)}</p>`}</section>`;
}

/**
 * The whole page body, rendered once at build time. The built site is plain
 * HTML and CSS: no script, no token, and no request to BuildBase when a
 * visitor opens it.
 */
export function renderContent(content: ContentFile): string {
  if (content.configured === false) {
    return `<section class="setup"><h2>No content yet</h2><p>Set <code>BUILDBASE_API_TOKEN</code> for the build and run <code>npm run build</code> again. The README lists the console steps.</p></section>`;
  }

  const posts = (content.blogs ?? [])
    .slice()
    .sort((a, b) =>
      String(b.publishedAt ?? '').localeCompare(String(a.publishedAt ?? ''))
    )
    .map(
      (post) =>
        `<article><h3>${escape(post.title)}</h3><p class="muted">${date(post.publishedAt)}</p>${trusted(post.content)}</article>`
    )
    .join('');

  const docs = (content.docs ?? [])
    .map(
      (doc) =>
        `<details><summary>${escape(doc.title)}</summary>${trusted(doc.content)}</details>`
    )
    .join('');

  const faqs = (content.faqs ?? [])
    .filter((collection) => collection.questions.length)
    .map(
      (collection) =>
        `<h3>${escape(collection.title)}</h3>` +
        collection.questions
          .map(
            (faq) =>
              `<details><summary>${escape(faq.question)}</summary>${trusted(faq.answer)}</details>`
          )
          .join('')
    )
    .join('');

  const blocks = (content.richContent ?? [])
    .map((block) => `<h3>${escape(block.title)}</h3>${trusted(block.content)}`)
    .join('');

  const quotes = (content.testimonials ?? [])
    .map(
      (quote) =>
        `<blockquote>${trusted(quote.content)}<footer>${escape(quote.name)}${quote.position ? `, ${escape(quote.position)}` : ''}</footer></blockquote>`
    )
    .join('');

  const collections = Object.entries(content.collections ?? {})
    .map(
      ([slug, records]) =>
        `<h3>${escape(slug)}</h3><ul>` +
        records
          .map((record) => {
            const data = record.data as Record<string, unknown>;
            const label = [data.version, data.title ?? data.name]
              .filter(Boolean)
              .map(escape)
              .join(': ');
            return `<li>${label || escape(record.recordId)}${data.date ? ` <span class="muted">${date(data.date)}</span>` : ''}</li>`;
          })
          .join('') +
        `</ul>`
    )
    .join('');

  return [
    section('Blog', posts, 'No published posts.'),
    section('Docs', docs, 'No published docs.'),
    section('Questions', faqs, 'No FAQ collections with questions.'),
    section('Policies', blocks, 'No rich content blocks.'),
    section('What customers say', quotes, 'No published testimonials.'),
    section('Collections', collections, 'No collection records.'),
    `<p class="muted">Content pulled ${escape(content.generatedAt)}.</p>`,
  ].join('\n');
}
