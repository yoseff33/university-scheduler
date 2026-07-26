import Link from "next/link";

export default function NotFound() {
  return (
    <main className="connection-page" dir="rtl">
      <section className="empty-state">
        <h1>الصفحة غير موجودة</h1>
        <p>يمكنك الرجوع للمنيو أو متابعة طلباتك من الصفحة الرئيسية.</p>
        <Link className="button button--primary" href="/">الصفحة الرئيسية</Link>
      </section>
    </main>
  );
}

