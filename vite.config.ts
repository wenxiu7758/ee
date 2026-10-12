import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const require = createRequire(import.meta.url);

// 检测当前系统环境下 Rollup 原生二进制是否可用（在 Android/Termux 下因 npm bug #4828 常缺少 @rollup/rollup-android-arm64）
let isRollupNativeAvailable = true;
try {
  require('rollup');
} catch {
  isRollupNativeAvailable = false;
}

// 在 Termux 等缺少 Rollup 原生编译支持的环境下，提供轻量 PWA 资产兜底插件
function termuxPwaFallbackPlugin(): Plugin {
  const virtualId = 'virtual:pwa-register';
  const resolvedVirtualId = '\0' + virtualId;

  return {
    name: 'termux-pwa-fallback',
    resolveId(id) {
      if (id === virtualId) {
        return resolvedVirtualId;
      }
    },
    load(id) {
      if (id === resolvedVirtualId) {
        return 'export function registerSW() { return () => {}; }; export default registerSW;';
      }
    },
    closeBundle() {
      const distDir = path.resolve('dist');
      const webDir = path.resolve('web');
      if (fs.existsSync(distDir) && fs.existsSync(webDir)) {
        try {
          const files = fs.readdirSync(webDir);
          for (const file of files) {
            if (file.startsWith('sw.') || file.startsWith('workbox-') || file.endsWith('.webmanifest')) {
              const target = path.join(distDir, file);
              if (!fs.existsSync(target)) {
                fs.copyFileSync(path.join(webDir, file), target);
              }
            }
          }
        } catch (_) {}
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(isRollupNativeAvailable
        ? [
            VitePWA({
              registerType: 'autoUpdate',
              includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
              manifest: {
                id: '/',
                name: '锄大地',
                short_name: '锄大地',
                description: '经典 4 人锄大地与烟三 Web 横屏 PWA 独立版，黑桃 ♠️ 主题对局、真人语音对讲与离线单机畅玩。',
                theme_color: '#050b14',
                background_color: '#050b14',
                display: 'fullscreen',
                display_override: ['fullscreen', 'standalone'],
                orientation: 'landscape',
                categories: ['games', 'entertainment'],
                prefer_related_applications: false,
                start_url: '/',
                scope: '/',
                icons: [
                  {
                    src: '/pwa-192x192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any',
                  },
                  {
                    src: '/pwa-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any',
                  },
                  {
                    src: '/pwa-maskable-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'maskable',
                  },
                ],
              },
              workbox: {
                cleanupOutdatedCaches: true,
                skipWaiting: true,
                clientsClaim: true,
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
              },
              devOptions: {
                enabled: true,
                type: 'module',
              },
            }),
          ]
        : [termuxPwaFallbackPlugin()]),
    ],
    build: {
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      allowedHosts: true as const,
    },
    preview: {
      host: '0.0.0.0',
      port: 8080,
      allowedHosts: true as const,
    },
  };
});
