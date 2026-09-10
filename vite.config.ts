import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: '/bank-al-hazz/' يجب أن يطابق اسم الـ repo على GitHub Pages
// إذا كان اسم الـ repo مختلفاً، غيّر القيمة هنا لتطابقه بالضبط
export default defineConfig({
  base: '/bank-al-hazz/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
