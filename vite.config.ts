import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
// Alias resuelto con fileURLToPath/URL (patrón oficial de Vite para proyectos ESM),
// en vez de path.resolve(__dirname, ...) -- __dirname no existe en módulos ESM nativos.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
