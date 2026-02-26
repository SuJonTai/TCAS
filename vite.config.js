import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 👈 1. นำเข้า Tailwind v4
import path from "path"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 👈 2. เปิดใช้งานปลั๊กอินตรงนี้
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})