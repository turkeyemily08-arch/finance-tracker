import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'auto-version',
      buildStart() {
        // 빌드할 때마다 새 버전 타임스탬프 생성 → 브라우저 캐시 강제 갱신용
        const v = Date.now().toString();
        const dest = path.resolve('public/data/version.json');
        fs.writeFileSync(dest, JSON.stringify({ v }));
        console.log(`[auto-version] version.json updated → ${v}`);
      },
    },
  ],
  base: '/finance-tracker/',
})
