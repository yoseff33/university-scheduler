import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-vibes-pattern px-5">
      <section className="w-full max-w-lg rounded-[2rem] border border-white bg-white/90 p-8 text-center card-shadow">
        <div className="flex justify-center"><BrandMark /></div>
        <p className="mt-8 text-7xl font-black text-vibes-200">404</p>
        <h1 className="mt-3 text-2xl font-black text-vibes-900">الصفحة غير موجودة</h1>
        <p className="mt-3 text-sm leading-7 text-vibes-600">الرابط اللي فتحته غير متوفر في المرحلة الحالية.</p>
        <Link to="/" className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-vibes-800 px-5 py-3 font-black text-white">
          <ArrowRight className="size-5" />
          الرجوع للرئيسية
        </Link>
      </section>
    </main>
  )
}
