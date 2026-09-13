import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // Pre-bundle everything up front. Discovering a dependency at runtime makes
    // Vite re-optimize mid-session, which duplicates React and breaks the lazily
    // loaded <jeep-sqlite> web component until the cache is cleared.
    include: [
      'react', 'react-dom', 'react-dom/client', 'recharts', 'react-icons/lu', 'canvas-confetti',
      '@capacitor/core', '@capacitor/app', '@capacitor-community/sqlite', 'jeep-sqlite/loader',
      '@aparajita/capacitor-biometric-auth', '@supabase/supabase-js',
    ],
  },
})
