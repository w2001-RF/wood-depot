import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `--mode single` produces one self-contained index.html (used for the hosted preview).
export default defineConfig(({ mode }) => ({
  // GitHub Pages serves from /<repo>/ — the workflow sets VITE_BASE.
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 1600,
    rollupOptions:
      mode === 'single'
        ? undefined
        : {
            output: {
              // three.js and R3F in their own long-cached chunks
              manualChunks: (id: string) =>
                id.includes('node_modules/three/') ? 'three' : /node_modules\/(@react-three|three-stdlib)/.test(id) ? 'r3f' : undefined,
            },
          },
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
}));
