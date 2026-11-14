// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { blogCovers } from './src/integrations/blog-covers.mjs';

// User site (DebmalyaPal.github.io) is served from the root, so base is '/'.
// For a project-site repo, set `base: '/<repo-name>/'`.
export default defineConfig({
  site: 'https://debmalyapal.github.io',
  base: '/',
  trailingSlash: 'always',
  output: 'static',
  integrations: [
    react(),
    // Blog articles (.mdx) use the unified pipeline for math ($…$ / $$…$$ → KaTeX).
    // Other Markdown keeps Astro 7's default processor.
    mdx({ processor: unified({ remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] }) }),
    sitemap(),
  ],
  markdown: {
    // Code blocks carry both palettes; global.css picks one from <html data-theme>.
    // The GitHub *-default themes keep token colours at WCAG AA on the site's surfaces.
    shikiConfig: { themes: { light: 'github-light-default', dark: 'github-dark-default' }, defaultColor: false, wrap: false },
  },
  vite: { plugins: [tailwindcss(), blogCovers()] },
});
