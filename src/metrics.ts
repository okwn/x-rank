import type { DateRange, EngagementBreakdown, RangeMode } from "./api.ts"

export interface DateRangeConfig {
  readonly id: DateRange
  readonly label: string
  readonly days: number
  readonly multiplier: number
}

export const ranges: ReadonlyArray<DateRangeConfig> = [
  { id: "7d", label: "Last 7 days", days: 7, multiplier: 1 },
  { id: "30d", label: "Last 30 days", days: 30, multiplier: 3.7 },
  { id: "90d", label: "Last 90 days", days: 90, multiplier: 10.2 }
]

export const rangeDays: Record<DateRange, number> = { "7d": 7, "30d": 30, "90d": 90 }

export const fallbackRange: DateRangeConfig = {
  id: "7d",
  label: "Last 7 days",
  days: 7,
  multiplier: 1
}

export const rangeFor = (range: DateRange) => ranges.find((item) => item.id === range) ?? fallbackRange

export const totalEngagements = (stats: EngagementBreakdown) =>
  stats.likes + stats.replies + stats.reposts + stats.quotes + stats.bookmarks

export const DAY_MS = 1000 * 60 * 60 * 24

/** Sunday 00:00 UTC at or before `ms`. */
export const weekStartUtc = (ms: number): number => {
  const date = new Date(ms)
  const dayOfWeek = date.getUTCDay() // Sun=0
  const startOfDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  return startOfDay - dayOfWeek * DAY_MS
}

/** Format a Sunday-start ms as "YYYY-MM-DD" (UTC). */
export const isoWeekOf = (sundayMs: number): string => {
  const d = new Date(sundayMs)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Parse "YYYY-MM-DD" to UTC midnight ms. Returns NaN on bad input. */
export const parseIsoDateUtc = (iso: string): number => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return NaN
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export interface WindowSpec {
  readonly mode: RangeMode
  /** ms inclusive start of the window */
  readonly start: number
  /** ms exclusive end of the window */
  readonly end: number
  /** ms inclusive start of the prior window of equal length */
  readonly previousStart: number
  /** number of days the window covers */
  readonly days: number
  /** label for the eyebrow + summary heading */
  readonly label: string
  /** true when end > now — the window is still accumulating */
  readonly inProgress: boolean
}

const weekLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC"
})

/**
 * Build a window spec.
 *  - rolling: ends at `now`, length = `range` days
 *  - weekly: Sun→Sun starting at `weekOf` (UTC). Defaults to the most recent
 *    completed week (the Sunday strictly before `now`'s week start).
 */
export const buildWindow = (mode: RangeMode, range: DateRange, weekOf: string | undefined, now: number): WindowSpec => {
  if (mode === "weekly") {
    const currentWeekStart = weekStartUtc(now)
    const requested = weekOf ? parseIsoDateUtc(weekOf) : NaN
    const start = Number.isFinite(requested) ? weekStartUtc(requested) : currentWeekStart - 7 * DAY_MS
    const end = start + 7 * DAY_MS
    const startLabel = weekLabelFormatter.format(new Date(start))
    const endLabel = weekLabelFormatter.format(new Date(end - DAY_MS))
    const inProgress = start === currentWeekStart
    return {
      mode,
      start,
      end,
      previousStart: start - 7 * DAY_MS,
      days: 7,
      label: inProgress ? `Week of ${startLabel} (in progress)` : `Week of ${startLabel} → ${endLabel}`,
      inProgress
    }
  }
  const days = rangeDays[range]
  const start = now - days * DAY_MS
  return {
    mode,
    start,
    end: now,
    previousStart: start - days * DAY_MS,
    days,
    label: rangeFor(range).label,
    inProgress: false
  }
}

export interface WeekChoice {
  readonly iso: string
  readonly label: string
  readonly start: number
  readonly inProgress: boolean
}

export interface WindowQuery {
  readonly range: DateRange
  readonly mode?: RangeMode | undefined
  readonly weekOf?: string | undefined
}

/** Build a WindowSpec from the wire query, defaulting mode to "rolling". */
export const windowFromQuery = (query: WindowQuery, capturedAt: number): WindowSpec =>
  buildWindow(query.mode ?? "rolling", query.range, query.weekOf, capturedAt)

/** N most recent weeks (Sunday-start), newest first, including the in-progress one. */
export const recentWeeks = (now: number, count: number): ReadonlyArray<WeekChoice> => {
  const current = weekStartUtc(now)
  const out: Array<WeekChoice> = []
  for (let i = 0; i < count; i++) {
    const start = current - i * 7 * DAY_MS
    out.push({
      iso: isoWeekOf(start),
      label: weekLabelFormatter.format(new Date(start)),
      start,
      inProgress: i === 0
    })
  }
  return out
}
