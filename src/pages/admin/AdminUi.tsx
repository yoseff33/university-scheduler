import type { ReactNode } from 'react'
import { Alert } from '../../components/Alert'

export function AdminHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-black text-vibes-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-vibes-600">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function AdminNotice({ error, success }: { error: string | null; success?: string | null }) {
  return (
    <>
      {error && <Alert type="error" className="mt-4">{error}</Alert>}
      {success && <Alert type="success" className="mt-4">{success}</Alert>}
    </>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-3xl border border-dashed border-vibes-200 bg-white p-10 text-center text-vibes-600">{children}</div>
}

export const inputClass = 'w-full rounded-xl border border-vibes-200 bg-white px-3 py-2.5 text-sm text-vibes-900 outline-none transition focus:border-vibes-500'
export const labelClass = 'mb-1 block text-sm font-bold text-vibes-800'
export const primaryButtonClass = 'rounded-xl bg-vibes-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-vibes-700 disabled:cursor-not-allowed disabled:opacity-50'
export const secondaryButtonClass = 'rounded-xl border border-vibes-200 bg-white px-4 py-2.5 text-sm font-bold text-vibes-700 transition hover:bg-vibes-50'
export const dangerButtonClass = 'rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50'
