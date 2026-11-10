import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { execSync } from 'node:child_process'

// 앱 버전 = 커밋 번호 앞 7자리(Render는 RENDER_GIT_COMMIT로도 준다). 오류 보고·새 버전 확인(/version.json)에 쓴다
let version = 'dev'
try {
  version = (process.env.RENDER_GIT_COMMIT || execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString()).trim().slice(0, 7) || 'dev'
} catch {
  /* git 없는 환경 — "dev" */
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    { name: 'version-json', apply: 'build', generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ v: version }) }) } },
  ],
  define: { __APP_VERSION__: JSON.stringify(version) },
})
