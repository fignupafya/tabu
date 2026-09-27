import type { NextConfig } from 'next';

/**
 * Static build for GitHub Pages (`npm run build:static`): plain files in out/, no server. The UI then keeps
 * the words and the played list in the browser. Only `.tsx` files become routes, which leaves the API route
 * handlers (`route.ts`, server-only) out of the build. PAGES_BASE_PATH is the sub-path the site is served
 * from, e.g. /tabu for https://<user>.github.io/tabu/.
 */
const staticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === '1';

const nextConfig: NextConfig = {
  // Always defined, so the flag is a build-time constant in both modes and the bundler can drop the
  // browser-side backend (zod, bundled words) from server-mode bundles.
  env: { NEXT_PUBLIC_STATIC_EXPORT: staticExport ? '1' : '0' },
  // Lets phones on the same Wi-Fi use the dev server via the computer's LAN IP (e.g. http://192.168.1.20:3000).
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*'],
  ...(staticExport && {
    output: 'export',
    trailingSlash: true,
    basePath: process.env.PAGES_BASE_PATH ?? '',
    pageExtensions: ['tsx'],
  }),
};

export default nextConfig;
