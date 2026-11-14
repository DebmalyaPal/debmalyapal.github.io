declare module 'virtual:blog-covers' {
  /** Cover images of loadable posts (published in builds, all in dev), keyed by slug. */
  const covers: Record<string, import('astro').ImageMetadata>;
  export default covers;
}
