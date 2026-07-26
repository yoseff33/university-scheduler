export function normalizeSaudiPhone(rawPhone: string): string | null {
  const compact = rawPhone.replace(/[\s()-]/g, '')

  if (/^\+9665\d{8}$/.test(compact)) return compact
  if (/^009665\d{8}$/.test(compact)) return `+${compact.slice(2)}`
  if (/^05\d{8}$/.test(compact)) return `+966${compact.slice(1)}`
  if (/^5\d{8}$/.test(compact)) return `+966${compact}`

  return null
}

export function maskPhone(phone: string | null): string {
  if (!phone) return 'غير متوفر'
  if (phone.length < 8) return phone
  return `${phone.slice(0, 6)}•••${phone.slice(-3)}`
}
