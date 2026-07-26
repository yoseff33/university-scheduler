interface PageLoaderProps {
  label?: string
}

export function PageLoader({ label = 'جاري التحميل...' }: PageLoaderProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-vibes-pattern px-5">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="size-11 animate-spin rounded-full border-4 border-vibes-200 border-t-vibes-700" />
        <p className="text-sm font-bold text-vibes-700">{label}</p>
      </div>
    </main>
  )
}
