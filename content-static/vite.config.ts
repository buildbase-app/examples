import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { renderContent, type ContentFile } from './src/render.ts';

// Renders src/content.json into index.html when the site is built (and on
// every dev reload). The page ships as static HTML: there is no client-side
// fetch to BuildBase, and so no token to leak.
function buildbaseContent(): Plugin {
  return {
    name: 'buildbase-content',
    transformIndexHtml(html) {
      const content = JSON.parse(
        readFileSync('src/content.json', 'utf8')
      ) as ContentFile;
      return html.replace('<!--buildbase-content-->', renderContent(content));
    },
  };
}

export default defineConfig({ plugins: [buildbaseContent()] });
