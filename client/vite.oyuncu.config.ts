import { defineConfig } from 'vite';
// Kullanıcının kendi oynadığı "sabit sürüm": geliştirme sunucusundan bağımsız derlenir (npm run oyuncu-derle), oyun dosyaları kopyalanmaz.
export default defineConfig({ publicDir: false, base: './', build: { outDir: 'dist-oyun', emptyOutDir: true, chunkSizeWarningLimit: 2000 } });
