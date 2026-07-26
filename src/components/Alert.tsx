import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

interface AlertProps {
  type?: 'error' | 'success' | 'info'
  children: React.ReactNode
}

const styles = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  info: 'border-vibes-200 bg-vibes-50 text-vibes-800',
}

const icons = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
}

export function Alert({ type = 'info', children }: AlertProps) {
  const Icon = icons[type]
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 text-sm font-semibold leading-6 ${styles[type]}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}
