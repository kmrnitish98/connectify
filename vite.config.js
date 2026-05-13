import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      protocolImports: true,
    }),
  ],
  server: {
    port: 5173,
    open: false,
  },
  build: {
    // FIX #8 (Performance): Code-split vendor chunks to reduce initial load
    rollupOptions: {
      output: {
        manualChunks: {
          // Heavy UI vendors — loaded on first interaction
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-emoji': ['emoji-picker-react'],
          // WebRTC / socket — lazy-loadable
          'vendor-webrtc': ['simple-peer'],
          'vendor-socket': ['socket.io-client'],
        },
      },
    },
    // Raise warning threshold since we're intentionally splitting
    chunkSizeWarningLimit: 600,
  },
})
