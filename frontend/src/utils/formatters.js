const padDurationUnit = (value) => String(value).padStart(2, '0')

export const durationToSeconds = (value) => {
  if (!value) return 0

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value))
  }

  if (typeof value !== 'string') return 0

  const trimmed = value.trim()
  if (!trimmed) return 0

  const [daysPart, timePart] = trimmed.includes(' ') ? trimmed.split(' ') : [null, trimmed]
  const timeSegments = timePart.split(':').map((segment) => Number.parseInt(segment, 10))

  if (timeSegments.some((segment) => Number.isNaN(segment))) {
    return 0
  }

  const [hours = 0, minutes = 0, seconds = 0] = timeSegments
  const days = daysPart ? Number.parseInt(daysPart, 10) || 0 : 0

  return (((days * 24) + hours) * 60 * 60) + (minutes * 60) + seconds
}

export const secondsToDuration = (totalSeconds) => {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  return `${padDurationUnit(hours)}:${padDurationUnit(minutes)}:${padDurationUnit(seconds)}`
}

export const sumDurations = (values) => {
  return values.reduce((total, value) => total + durationToSeconds(value), 0)
}

export const formatDuration = (value) => {
  return secondsToDuration(durationToSeconds(value))
}

export const formatCurrencyBs = (value) => {
  const amount = Number(value || 0)
  return `Bs. ${amount.toFixed(2)}`
}
