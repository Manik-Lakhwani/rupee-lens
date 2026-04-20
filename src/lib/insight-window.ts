import { format, subDays } from 'date-fns'

export function getRollingWindow(days: number) {
  const end = new Date()
  const endDate = format(end, 'yyyy-MM-dd')
  const startDate = format(subDays(end, days - 1), 'yyyy-MM-dd')
  return { startDate, endDate, days }
}

export function getPreviousRollingWindow(days: number) {
  const prevEnd = subDays(new Date(), days)
  const endDate = format(prevEnd, 'yyyy-MM-dd')
  const startDate = format(subDays(prevEnd, days - 1), 'yyyy-MM-dd')
  return { startDate, endDate, days }
}

export function getRollingLabel(days: number) {
  return `last ${days} days`
}
