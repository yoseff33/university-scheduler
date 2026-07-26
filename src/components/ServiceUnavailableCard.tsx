import { LockKeyhole } from 'lucide-react'

interface ServiceUnavailableCardProps {
  title: string
  phase: string
}

export function ServiceUnavailableCard({ title, phase }: ServiceUnavailableCardProps) {
  return (
    <article className="rounded-3xl border border-dashed border-vibes-200 bg-white/70 p-5">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-vibes-100 text-vibes-700">
          <LockKeyhole className="size-5" />
        </div>
        <div>
          <h3 className="font-black text-vibes-900">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-vibes-600">الخدمة غير مفعلة حالياً. تُربط فعلياً في {phase}.</p>
        </div>
      </div>
    </article>
  )
}
