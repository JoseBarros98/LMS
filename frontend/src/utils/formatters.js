export const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return 'N/A'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`
}

export const formatCurrencyBs = (value) => {
  const amount = Number(value || 0)
  return `Bs. ${amount.toFixed(2)}`
}
