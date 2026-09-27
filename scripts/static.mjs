// Static build for GitHub Pages: `npm run build:static` writes the site to out/, `npm run dev:static` runs it in
// development. Sets NEXT_PUBLIC_STATIC_EXPORT for Next.js on any OS; set PAGES_BASE_PATH (e.g. /tabu) when the
// site is served from a sub-path.
import { spawnSync } from 'node:child_process';

const command = process.argv[2] === 'dev' ? 'dev' : 'build';
const { status } = spawnSync('npx', ['next', command], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NEXT_PUBLIC_STATIC_EXPORT: '1' },
});
process.exit(status ?? 1);
