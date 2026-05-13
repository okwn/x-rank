import { Array as Arr, DateTime } from "effect"
import type { Account, EngagementStats, ScoreMetric, SocialMetricsSnapshot, TopPost, TrendPoint } from "./api.ts"
import { formatByUnit, formatNumber, formatPercent, formatSignedPoints, formatVsPrior, type Unit } from "./format.ts"
import type { WeekChoice, WindowSpec } from "./metrics.ts"
import { totalEngagements } from "./metrics.ts"
import { scoreFor } from "./score.ts"
import type { SelectionView } from "./selection.ts"

export { formatNumber } from "./format.ts"

export { totalEngagements }

export type MetricKey = "overall" | "growth" | "reach" | "rate" | "conversation" | "consistency" | "perPost"

export interface MetricDefinition {
  readonly key: MetricKey
  readonly label: string
  readonly description: string
  readonly unit: "count" | "percent" | "days"
  readonly value: (snapshot: MetricSnapshot, account: Account) => number
}

export interface MetricSnapshot {
  readonly stats: EngagementStats
  readonly engagements: number
  readonly engagementRate: number
  readonly growth: number
}

export interface AccountPerformance extends MetricSnapshot {
  readonly account: Account
  readonly previous: MetricSnapshot
}

export interface LeaderboardEntry {
  readonly account: Account
  readonly rank: number
  readonly previousRank: number | undefined
  readonly rankChange: number | "new"
  readonly value: number
  readonly performance: AccountPerformance
}

export interface MetricCardModel {
  readonly definition: MetricDefinition
  readonly entries: ReadonlyArray<LeaderboardEntry>
  readonly subnote: string | undefined
}

export interface SummaryStat {
  readonly label: string
  readonly value: string
  readonly delta: string
  readonly tone: "good" | "neutral"
}

export interface TopPostEntry {
  readonly account: Account
  readonly post: TopPost
}

export interface PostItem {
  readonly account: Account
  readonly post: TopPost
  readonly value: number
}

export const flattenPosts = (accounts: ReadonlyArray<Account>): ReadonlyArray<PostItem> =>
  Arr.flatMap(accounts, (account) =>
    account.posts.map((post) => ({ account, post, value: totalEngagements(post.stats) }))
  )

export interface DashboardModel {
  readonly sourceLabel: string
  readonly capturedAtLabel: string
  readonly coverageLabel: string
  readonly rangeLabel: string
  readonly inProgress: boolean
  readonly score: ScoreMetric
  readonly scoreLabel: string
  readonly scoreUnitLabel: string
  readonly scoreDescription: string
  readonly weekChoices: ReadonlyArray<WeekChoice>
  readonly currentWeekIso: string
  readonly selectedWeekIso: string
  readonly summary: ReadonlyArray<SummaryStat>
  readonly metrics: ReadonlyArray<MetricCardModel>
  readonly topPosts: ReadonlyArray<TopPostEntry>
  readonly trend: ReadonlyArray<TrendPoint>
  readonly accounts: ReadonlyArray<Account>
  readonly visibleAccounts: number
  readonly totalAccounts: number
}

const TOP_POSTS_LIMIT = 12
const ACTIVE_DAYS_MULTIPLIER_CAP = 4
const DAY_MS = 1000 * 60 * 60 * 24

const overallFor = (score: ScoreMetric): MetricDefinition => {
  const def = scoreFor(score)
  return {
    key: "overall",
    label: def.label,
    description: def.description,
    unit: "count",
    value: def.value
  }
}

export const metricDefinitions: ReadonlyArray<MetricDefinition> = [
  overallFor("engagements"),
  {
    key: "growth",
    label: "Growth",
    description: "Follower gain this period",
    unit: "count",
    value: ({ growth }) => growth
  },
  {
    key: "reach",
    label: "Reach",
    description: "Total impressions",
    unit: "count",
    value: ({ stats }) => stats.impressions
  },
  {
    key: "rate",
    label: "Rate",
    description: "Engagements divided by impressions",
    unit: "percent",
    value: ({ engagementRate }) => engagementRate
  },
  {
    key: "conversation",
    label: "Conversation",
    description: "Replies plus quotes",
    unit: "count",
    value: ({ stats }) => stats.replies + stats.quotes
  },
  {
    key: "consistency",
    label: "Consistency",
    description: "Days with at least one post",
    unit: "days",
    value: ({ stats }) => stats.activeDays
  },
  {
    key: "perPost",
    label: "Per post",
    description: "Average engagements per post — quality vs volume",
    unit: "count",
    value: ({ engagements, stats }) => (stats.posts > 0 ? Math.round(engagements / stats.posts) : 0)
  }
]

const scaleStats = (stats: EngagementStats, multiplier: number, days: number): EngagementStats => ({
  posts: Math.round(stats.posts * multiplier),
  impressions: Math.round(stats.impressions * multiplier),
  likes: Math.round(stats.likes * multiplier),
  replies: Math.round(stats.replies * multiplier),
  reposts: Math.round(stats.reposts * multiplier),
  quotes: Math.round(stats.quotes * multiplier),
  bookmarks: Math.round(stats.bookmarks * multiplier),
  activeDays: Math.min(days, Math.round(stats.activeDays * Math.min(multiplier, ACTIVE_DAYS_MULTIPLIER_CAP)))
})

const sourceLabels: Record<SocialMetricsSnapshot["source"], string> = {
  fake: "Fake data prototype",
  x: "X API"
}

const capturedAtFormatter = new Intl.DateTimeFormat("en", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York"
})

const safeRate = (engagements: number, impressions: number) => (impressions === 0 ? 0 : engagements / impressions)

const buildSnapshot = (stats: EngagementStats, growth: number): MetricSnapshot => {
  const engagements = totalEngagements(stats)
  return {
    stats,
    engagements,
    engagementRate: safeRate(engagements, stats.impressions),
    growth
  }
}

const livePerformance = (account: Account): AccountPerformance => ({
  account,
  ...buildSnapshot(account.stats, account.followers - account.previousFollowers),
  previous: buildSnapshot(account.previousStats, account.previousGrowth)
})

const scaledPerformance = (account: Account, days: number): AccountPerformance => {
  const multiplier = days / 7
  return {
    account,
    ...buildSnapshot(
      scaleStats(account.stats, multiplier, days),
      Math.round((account.followers - account.previousFollowers) * multiplier)
    ),
    previous: buildSnapshot(
      scaleStats(account.previousStats, multiplier, days),
      Math.round(account.previousGrowth * multiplier)
    )
  }
}

const rankBy = (
  performances: ReadonlyArray<AccountPerformance>,
  getValue: (performance: AccountPerformance) => number
) => {
  const sorted = performances.toSorted((left, right) => {
    const valueDelta = getValue(right) - getValue(left)
    return valueDelta === 0 ? left.account.name.localeCompare(right.account.name) : valueDelta
  })
  const result: Array<{ readonly performance: AccountPerformance; readonly rank: number }> = []
  for (let i = 0; i < sorted.length; i++) {
    const tiedWithPrev = i > 0 && getValue(sorted[i - 1]) === getValue(sorted[i])
    const rank = tiedWithPrev ? result[i - 1].rank : i + 1
    result.push({ performance: sorted[i], rank })
  }
  return result
}

const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC"
})

const buildGrowthSubnote = (
  followerDataSinceMs: number,
  capturedAtMs: number,
  rangeDays: number
): string | undefined => {
  const days = Math.max(0, capturedAtMs - followerDataSinceMs) / DAY_MS
  if (days >= rangeDays) return undefined
  const dayLabel = days < 1 ? "<1d" : `${Math.floor(days)}d`
  return `tracked since ${monthDayFormatter.format(new Date(followerDataSinceMs))} · ${dayLabel} of data`
}

const buildMetricCards = (
  definitions: ReadonlyArray<MetricDefinition>,
  performances: ReadonlyArray<AccountPerformance>,
  growthSubnote: string | undefined
): ReadonlyArray<MetricCardModel> =>
  definitions.map((definition) => {
    const valueOf = (performance: AccountPerformance, snapshot: MetricSnapshot) =>
      definition.value(snapshot, performance.account)
    const priorValues = performances.map((p) => valueOf(p, p.previous))
    const allPriorZero = priorValues.every((v) => v === 0)
    const previousRanks = new Map(
      rankBy(performances, (p) => valueOf(p, p.previous)).map((entry) => [entry.performance.account.id, entry.rank])
    )
    const entries = rankBy(performances, (p) => valueOf(p, p)).map((entry): LeaderboardEntry => {
      const previousRank = previousRanks.get(entry.performance.account.id)
      const rankChange: number | "new" = allPriorZero || previousRank === undefined ? "new" : previousRank - entry.rank
      return {
        account: entry.performance.account,
        rank: entry.rank,
        previousRank,
        rankChange,
        value: valueOf(entry.performance, entry.performance),
        performance: entry.performance
      }
    })
    return {
      definition,
      entries,
      subnote: definition.key === "growth" ? growthSubnote : undefined
    }
  })

const TOP_POSTS_PER_AUTHOR = 3

const buildTopPosts = (visible: ReadonlyArray<AccountPerformance>): ReadonlyArray<TopPostEntry> => {
  const candidates = flattenPosts(visible.map((p) => p.account))
    .filter((item) => item.value > 0)
    .toSorted((a, b) => b.value - a.value)
  const seen = new Map<string, number>()
  const out: Array<TopPostEntry> = []
  for (const { account, post } of candidates) {
    const used = seen.get(account.id) ?? 0
    if (used >= TOP_POSTS_PER_AUTHOR) continue
    seen.set(account.id, used + 1)
    out.push({ account, post })
    if (out.length >= TOP_POSTS_LIMIT) break
  }
  return out
}

const buildSummary = (visible: ReadonlyArray<AccountPerformance>): ReadonlyArray<SummaryStat> => {
  const totals = { posts: 0, impressions: 0, engagements: 0, growth: 0, active: 0 }
  const previousTotals = { posts: 0, impressions: 0, engagements: 0 }
  for (const item of visible) {
    totals.posts += item.stats.posts
    totals.impressions += item.stats.impressions
    totals.engagements += item.engagements
    totals.growth += item.growth
    if (item.stats.posts > 0) totals.active += 1
    previousTotals.posts += item.previous.stats.posts
    previousTotals.impressions += item.previous.stats.impressions
    previousTotals.engagements += item.previous.engagements
  }
  const rate = safeRate(totals.engagements, totals.impressions)
  const previousRate = safeRate(previousTotals.engagements, previousTotals.impressions)
  return [
    {
      label: "Total posts",
      value: formatNumber(totals.posts),
      delta: formatVsPrior(totals.posts, previousTotals.posts),
      tone: "good"
    },
    {
      label: "Impressions",
      value: formatNumber(totals.impressions),
      delta: formatVsPrior(totals.impressions, previousTotals.impressions),
      tone: "good"
    },
    {
      label: "Engagements",
      value: formatNumber(totals.engagements),
      delta: formatVsPrior(totals.engagements, previousTotals.engagements),
      tone: "good"
    },
    {
      label: "Avg engagement rate",
      value: formatPercent(rate),
      delta: formatSignedPoints(rate - previousRate),
      tone: "neutral"
    },
    {
      label: "Active accounts",
      value: `${totals.active}/${visible.length}`,
      delta: `+${formatNumber(totals.growth)} followers`,
      tone: "good"
    }
  ]
}

const buildCoverageLabel = (snapshot: SocialMetricsSnapshot, window: WindowSpec): string => {
  const capturedAtMs = DateTime.toEpochMillis(snapshot.capturedAt)
  const start = new Date(window.start)
  const end = new Date(window.end - DAY_MS)
  const rangeLabel = `${monthDayFormatter.format(start)} → ${monthDayFormatter.format(end)}`
  if (snapshot.source !== "x") return rangeLabel
  const dataSince = DateTime.toEpochMillis(snapshot.dataSince)
  const days = Math.ceil(Math.max(0, capturedAtMs - dataSince) / DAY_MS)
  if (days >= window.days) return rangeLabel
  return `${rangeLabel} · ${Math.max(1, days)}d collected`
}

export const buildDashboard = (snapshot: SocialMetricsSnapshot, view: SelectionView): DashboardModel => {
  const { window, score } = view
  const performance =
    snapshot.source === "x" ? livePerformance : (account: Account) => scaledPerformance(account, window.days)
  const performances = snapshot.accounts.map(performance)
  const growthSubnote = buildGrowthSubnote(
    DateTime.toEpochMillis(snapshot.followerDataSince),
    DateTime.toEpochMillis(snapshot.capturedAt),
    window.days
  )
  const scoreDef = scoreFor(score)
  const activeDefinitions = metricDefinitions.map((d) => (d.key === "overall" ? overallFor(score) : d))

  return {
    sourceLabel: sourceLabels[snapshot.source],
    capturedAtLabel: `Last updated ${capturedAtFormatter.format(DateTime.toEpochMillis(snapshot.capturedAt))}`,
    coverageLabel: buildCoverageLabel(snapshot, window),
    rangeLabel: window.label,
    inProgress: window.inProgress,
    score,
    scoreLabel: scoreDef.label,
    scoreUnitLabel: scoreDef.unit,
    scoreDescription: scoreDef.description,
    weekChoices: view.weekChoices,
    currentWeekIso: view.currentWeekIso,
    selectedWeekIso: view.selectedWeekIso,
    accounts: snapshot.accounts,
    visibleAccounts: performances.length,
    totalAccounts: snapshot.accounts.length,
    summary: buildSummary(performances),
    metrics: buildMetricCards(activeDefinitions, performances, growthSubnote),
    topPosts: buildTopPosts(performances),
    trend: snapshot.trend
  }
}

export const formatMetric = (value: number, unit: MetricDefinition["unit"]): string => formatByUnit(value, unit as Unit)
