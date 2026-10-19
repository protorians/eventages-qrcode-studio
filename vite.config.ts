import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// @ts-expect-error type error without @types/node package
import process from "node:process";
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  // Resolve `@/` imports to `src/` (shadcn/ui convention)
  resolve: {
    alias: {
      "@": "/src",
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  // 4. env variables starting with one of these prefixes will be exposed to the client
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: {
    // 5. target the webviews bundled with Tauri: Chrome (WebView2) on Windows, Safari (WKWebView) elsewhere.
    //    Note: Tailwind CSS v4 (oklch colors) requires Safari 16.4+, so `safari16` is the floor worth targeting.
    target:
      process.env.TAURI_ENV_PLATFORM == "windows" ? "chrome105" : "safari16",
    // 6. minify only for release builds, keep debug builds fast
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    // 7. produce sourcemaps only for debug builds (smaller release bundle)
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
}));
