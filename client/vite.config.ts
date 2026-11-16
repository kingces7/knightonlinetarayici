import { defineConfig } from 'vite';
import path from 'node:path';

// Dönüştürülmüş oyun verileri (git'e girmez) web sunucusunun kökünden servis edilir:
//   donusturulmus/web/harita/<ad>/...  ->  http://localhost:5173/harita/<ad>/...
export default defineConfig({
  publicDir: path.resolve(__dirname, '../donusturulmus/web'),
  server: { port: 5173, open: false, fs: { allow: [path.resolve(__dirname, '..')] } }, // kopru/protokol (depo kökü) de servis edilsin
  build: { outDir: 'dist', chunkSizeWarningLimit: 2000 },
});
