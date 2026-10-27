
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Microservicio de demandas
  const demandTarget =
    env.VITE_DEMAND_API_TARGET || 'http://localhost:8080'

  // Microservicio de aplicaciones
  const applicationTarget =
    env.VITE_APPLICATION_API_TARGET || 'http://localhost:8081'

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    server: {
      port: 5173,

      proxy: {
        '/api/demands': {
          target: demandTarget,
          changeOrigin: true,
        },

        '/api/applications': {
          target: applicationTarget,
          changeOrigin: true,
        },
      },
    },

    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
