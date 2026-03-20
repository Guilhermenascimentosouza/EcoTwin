import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (
            id.includes('/react-dom/') ||
            id.includes('/react/') ||
            id.includes('/scheduler/')
          ) {
            return 'react';
          }
          if (id.includes('@tanstack/react-query')) return 'tanstack';
          if (id.includes('@supabase/supabase-js')) return 'supabase';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('html5-qrcode')) return 'scanner';
          if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n';
          if (id.includes('zod') || id.includes('zustand')) return 'state';

          return undefined;
        }
      }
    }
  }
});
