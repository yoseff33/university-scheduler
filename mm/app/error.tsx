"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("application-boundary", error);
  }, [error]);
  return (
    <main className="connection-page" dir="rtl">
      <section className="empty-state empty-state--error">
        <AlertTriangle size={36} />
        <h1>تعذر إكمال الصفحة</h1>
        <p>لم نفقد طلبك. تحقق من الاتصال ثم أعد المحاولة.</p>
        <button className="button button--primary" onClick={reset}>
          <RefreshCw size={18} /> إعادة المحاولة
        </button>
      </section>
    </main>
  );
}

