// Runs before every build (`prebuild`). With a token, it pulls every published
// piece of content into src/content.json with the SDK's CLI. Without one it
// writes an empty file marked unconfigured, so the site still builds and says
// what to set. Either way the token is used here, in the build, and never
// reaches the site.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const out = 'src/content.json';

if (!process.env.BUILDBASE_API_TOKEN) {
  writeFileSync(
    out,
    JSON.stringify(
      { configured: false, generatedAt: new Date().toISOString() },
      null,
      2
    ) + '\n'
  );
  console.log(
    `BUILDBASE_API_TOKEN is not set: wrote an empty ${out}. See the README.`
  );
  process.exit(0);
}

const args = ['buildbase', 'content', 'pull', '--out', out];
if (process.env.CONTENT_COLLECTIONS)
  args.push('--collections', process.env.CONTENT_COLLECTIONS);

// The CLI reads BUILDBASE_API_TOKEN and BUILDBASE_SERVER_URL from the
// environment. It exits non-zero on a refused token, and so does the build.
const result = spawnSync('npx', args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    BUILDBASE_SERVER_URL:
      process.env.BUILDBASE_SERVER_URL || 'https://api.console.buildbase.app',
  },
});
process.exit(result.status ?? 1);
