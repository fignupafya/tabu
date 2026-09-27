/**
 * True in the static build (`npm run build:static`, e.g. GitHub Pages): there is no server, so the words and
 * the played list live in the browser. Inlined at build time.
 */
export const STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === '1';
