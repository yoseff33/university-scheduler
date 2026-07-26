// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { AuthProvider } from './features/auth/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles/index.css'

/**
 * تسجيل Service Worker الخاص بـ PWA.
 * يتم التسجيل فورياً عند تحميل التطبيق،
 * مع تحديث الصفحة تلقائياً عند توفر إصدار جديد.
 * 
 * ملاحظة: يُنصح بتعطيل التسجيل في بيئة التطوير لتجنب مشاكل الكاش،
 * لكننا نتركه مفعلاً لضمان اختبار كامل لتجربة PWA.
 */
registerSW({ immediate: true })

/**
 * الحصول على العنصر الجذري الذي سيتم تصيير التطبيق داخله.
 * في حال عدم وجوده، نرمي خطأ واضحاً لمنع تصيير التطبيق في حالة غير مستقرة.
 */
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error(
    'لم يتم العثور على عنصر الجذر (#root) في ملف HTML. تأكد من أن index.html يحتوي على <div id="root"></div>'
  )
}

/**
 * تصيير التطبيق بالكامل داخل:
 * - StrictMode: لمساعدة المطورين في اكتشاف المشاكل المحتملة.
 * - ErrorBoundary: لالتقاط الأخطاء غير المتوقعة وعرض واجهة بديلة.
 * - HashRouter: لتوفير نظام توجيه يعتمد على الهاش (مناسب للاستضافة الثابتة).
 * - AuthProvider: لتوفير سياق المصادقة لجميع المكونات.
 */
createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>
)
