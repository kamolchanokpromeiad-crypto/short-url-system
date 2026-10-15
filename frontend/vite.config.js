import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // host: true ทำให้เปิดจากมือถือในวง Wi-Fi เดียวกันได้ (ใช้ทดสอบสแกน QR Code)
  server: { host: true, port: 5173 },
});
