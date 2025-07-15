// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// โหลด env
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      // vercel(), // ❌ อย่าใช้จนกว่าจะแก้ bug ทางฝั่ง Vercel
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    define: {
      'import.meta.env': {
        VITE_FIREBASE_API_KEY: JSON.stringify(env.VITE_FIREBASE_API_KEY),
        VITE_FIREBASE_AUTH_DOMAIN: JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
        VITE_FIREBASE_PROJECT_ID: JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
        VITE_FIREBASE_STORAGE_BUCKET: JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
        VITE_FIREBASE_MESSAGING_SENDER_ID: JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
        VITE_FIREBASE_APP_ID: JSON.stringify(env.VITE_FIREBASE_APP_ID),
        VITE_FIREBASE_MEASUREMENT_ID: JSON.stringify(env.VITE_FIREBASE_MEASUREMENT_ID),
        VITE_GOOGLE_MAPS_API_KEY: JSON.stringify(env.VITE_GOOGLE_MAPS_API_KEY),
        VITE_TELEGRAM_BOT_TOKEN: JSON.stringify(env.VITE_TELEGRAM_BOT_TOKEN),
        VITE_TELEGRAM_CHAT_ID: JSON.stringify(env.VITE_TELEGRAM_CHAT_ID),
        VITE_LINE_NOTIFY_TOKEN: JSON.stringify(env.VITE_LINE_NOTIFY_TOKEN),
        vi: 'undefined',
      },
    },
  };
});