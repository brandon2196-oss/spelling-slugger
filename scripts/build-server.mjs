// Bundles the server and the owner CLI to plain ESM (server/dist/*.mjs) with Vite's SSR build, so
// Node runs them with no TypeScript loader. Dependencies stay external (installed by npm ci).
import { build } from 'vite'

await build({
  configFile: false,
  publicDir: false,
  logLevel: 'info',
  build: {
    ssr: true,
    target: 'node22',
    outDir: 'server/dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    rolldownOptions: {
      input: { index: 'server/src/index.ts', cli: 'server/src/cli.ts' },
      output: { entryFileNames: '[name].mjs', chunkFileNames: '[name]-[hash].mjs', format: 'es' },
    },
  },
})
