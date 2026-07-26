import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('Vibes application error', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="grid min-h-screen place-items-center bg-vibes-pattern px-5">
        <section className="w-full max-w-lg rounded-3xl border border-vibes-100 bg-white p-8 text-center card-shadow">
          <p className="text-4xl">☕</p>
          <h1 className="mt-4 text-2xl font-black text-vibes-900">صار خطأ غير متوقع</h1>
          <p className="mt-3 text-sm leading-7 text-vibes-600">ما تم تسجيل نجاح وهمي. حدّث الصفحة، وإذا استمر الخطأ راجع إعدادات المشروع والسجل التقني.</p>
          <button className="mt-6 rounded-2xl bg-vibes-800 px-6 py-3 font-bold text-white" onClick={() => window.location.reload()}>
            تحديث الصفحة
          </button>
        </section>
      </main>
    )
  }
}
