import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Ділимо вендорів на стабільні чанки:
        //  - vendor-three: three + @react-three (найважче, тягнеться ЛІНИВО
        //    лише на кроці 3D-планувальника, кешується між релізами,
        //    бо код застосунку його хеш не змінює);
        //  - vendor: react та решта дрібних залежностей.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('three') || id.includes('@react-three')) return 'vendor-three';
          return 'vendor';
        },
      },
    },
  },
})
