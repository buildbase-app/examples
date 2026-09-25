import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderContent } from '../src/render.ts';

describe('renderContent', () => {
  it('says what to set when the build had no token', () => {
    const html = renderContent({
      configured: false,
      generatedAt: '2026-09-25T00:00:00.000Z',
    });
    assert.match(html, /BUILDBASE_API_TOKEN/);
  });

  it('renders every module, newest post first, and escapes titles', () => {
    const html = renderContent({
      generatedAt: '2026-09-25T00:00:00.000Z',
      blogs: [
        {
          title: 'Older',
          publishedAt: '2026-09-01T00:00:00.000Z',
          content: '<p>old</p>',
        },
        {
          title: 'Newer <3',
          publishedAt: '2026-09-20T00:00:00.000Z',
          content: '<p>new</p>',
        },
      ] as never,
      docs: [{ title: 'Getting started', content: '<p>Sign in.</p>' }] as never,
      faqs: [
        {
          title: 'Help',
          questions: [{ question: 'Self-host?', answer: '<p>Yes.</p>' }],
        },
      ] as never,
      richContent: [
        { title: 'Refund policy', content: '<p>14 days.</p>' },
      ] as never,
      testimonials: [
        { name: 'Priya', position: 'CTO', content: '<p>Great.</p>' },
      ] as never,
      collections: {
        'release-notes': [
          { recordId: 'r1', data: { version: '0.2.0', title: 'The tour' } },
        ],
      } as never,
    });
    assert.ok(html.indexOf('Newer') < html.indexOf('Older'));
    assert.match(html, /Newer &lt;3/);
    for (const text of [
      'Sign in.',
      'Self-host?',
      '14 days.',
      'Priya, CTO',
      '0.2.0: The tour',
    ]) {
      assert.ok(html.includes(text), `missing ${text}`);
    }
  });
});
