import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/CartevsHuman/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'CAH Italia',
        short_name: 'CAH ITA',
        description: 'Cards Against Humanity in italiano',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/CartevsHuman/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/CartevsHuman/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
