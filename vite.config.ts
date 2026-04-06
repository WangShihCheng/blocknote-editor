import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // 讓 esbuild 預打包 @blocknote，由 esbuild 在打包時解決其內部 ESM 循環依賴，
    // 避免瀏覽器原生 ESM 的 TDZ 問題導致 defaultBlockSpecs.implementation = undefined
    include: [
      'extend',           // CJS，unified 內部使用
      'fast-deep-equal',  // CJS，@blocknote/core 內部使用
      'debug',            // CJS，micromark 內部使用
      'ms',               // CJS，debug 的依賴
      'use-sync-external-store/shim/with-selector.js',  // CJS，@tanstack/react-store 使用
      'use-sync-external-store/shim/index.js',           // CJS，雙重保險
    ],
  },
  build: {
    // 精確列出需要轉換的 CJS 套件，避免掃描整個 node_modules
    commonjsOptions: {
      include: [/extend/, /fast-deep-equal/, /debug/, /ms/, /use-sync-external-store/],
    },
  },
})
