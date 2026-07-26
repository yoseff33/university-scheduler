// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { AuthProvider } from './features/auth/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles/index.css'

// تسجيل Service Worker الخاص بـ PWA (يتيح التثبيت والتحديثات الفورية)
registerSW({ immediate: true })

// التأكد من وجود العنصر الجذري قبل محاولة التصيير
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Failed to find the root element. Ensure your index.html contains <div id="root"></div>')
}

// تصيير التطبيق داخل StrictMode و ErrorBoundary لتوفير بيئة تطوير آمنة
createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
)
