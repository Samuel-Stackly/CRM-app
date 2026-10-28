/**
 * Day and month boundaries.
 *
 * All computed in the server's timezone — UTC in production. See docs/API.md
 * Q12: the brief does not specify whose day "due today" means, so a user in a
 * different timezone may see a boundary that differs from their local midnight.
 */

export function startOfDay(reference: Date = new Date()): Date {
  const date = new Date(reference)
  date.setHours(0, 0, 0, 0)
  return date
}

export function startOfNextDay(reference: Date = new Date()): Date {
  const date = startOfDay(reference)
  date.setDate(date.getDate() + 1)
  return date
}

export function startOfMonth(reference: Date = new Date()): Date {
  const date = new Date(reference)
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date
}

export function startOfNextMonth(reference: Date = new Date()): Date {
  const date = startOfMonth(reference)
  // setMonth rolls the year over automatically.
  date.setMonth(date.getMonth() + 1)
  return date
}
