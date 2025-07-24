import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        guide: resolve(__dirname, 'src/guide.html'),
        about: resolve(__dirname, 'src/about.html'),
        faq: resolve(__dirname, 'src/faq.html')
      },
      output: {
        // 코드 분할 최적화
        manualChunks(id) {
          // Supabase를 별도 청크로 분리
          if (id.includes('@supabase')) {
            return 'supabase';
          }
          // node_modules의 다른 패키지들
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // 파일명 패턴 설정
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // 압축 설정
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // 개발자 도구 메시지 유지
        drop_debugger: true,
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    // 청크 크기 경고 임계값
    chunkSizeWarningLimit: 500,
    // 소스맵 설정 (프로덕션에서는 비활성화)
    sourcemap: false,
    // CSS 코드 분할
    cssCodeSplit: true,
    // 압축 최적화
    reportCompressedSize: true
  },
  // 최적화 설정
  optimizeDeps: {
    include: ['@supabase/supabase-js']
  }
});