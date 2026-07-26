interface BrandMarkProps {
  compact?: boolean
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-3" aria-label="فايبز">
      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-vibes-800 text-xl font-black text-vibes-50 shadow-lg shadow-vibes-800/20">
        V
      </div>
      {!compact && (
        <div>
          <p className="text-xl font-black tracking-tight text-vibes-900">فايبز</p>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-vibes-600">Vibes</p>
        </div>
      )}
    </div>
  )
}
