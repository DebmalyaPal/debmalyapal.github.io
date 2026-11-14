// @ts-check
/**
 * Vite plugin exposing `virtual:blog-covers`: { [slug]: ImageMetadata } for article covers.
 *
 * It generates import statements only for posts whose status is "published" (every post in
 * the dev server). A draft's images are therefore never part of a production build's module
 * graph, so they cannot be emitted into dist/. A plain import.meta.glob over the image folders
 * would pull in every draft's images too; tests/blog-build.test.mjs guards against that.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ID = 'virtual:blog-covers';
const RESOLVED = `\0${ID}`;

/** @returns {import('vite').Plugin} */
export function blogCovers() {
  let dev = false;
  let root = process.cwd();
  return {
    name: 'blog-covers',
    configResolved(config) {
      dev = config.command === 'serve';
      root = config.root;
    },
    resolveId(id) {
      return id === ID ? RESOLVED : undefined;
    },
    load(id) {
      if (id !== RESOLVED) return undefined;
      const registry = resolve(root, 'src/data/blogs.json');
      this.addWatchFile(registry);
      /** @type {{ slug: string; status: string; coverImage?: string | null }[]} */
      const posts = JSON.parse(readFileSync(registry, 'utf8'));
      const covers = posts.filter((p) => p.coverImage && (dev || p.status === 'published'));
      const imports = covers.map((p, i) => `import cover${i} from ${JSON.stringify(`/src/content/blog/${p.slug}/${p.coverImage}`)};`);
      const entries = covers.map((p, i) => `${JSON.stringify(p.slug)}: cover${i}`);
      return `${imports.join('\n')}\nexport default { ${entries.join(', ')} };\n`;
    },
  };
}
