import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/unstable/httpapi"

export const DateRange = Schema.Literals(["7d", "30d", "90d"])
export type DateRange = Schema.Schema.Type<typeof DateRange>

export const RangeMode = Schema.Literals(["rolling", "weekly"])
export type RangeMode = Schema.Schema.Type<typeof RangeMode>

export const ScoreMetric = Schema.Literals(["engagements", "impressions", "jay"])
export type ScoreMetric = Schema.Schema.Type<typeof ScoreMetric>

export const Source = Schema.Literals(["fake", "x"])

export const ENGAGEMENT_KEYS = ["likes", "replies", "reposts", "quotes", "bookmarks"] as const

export const EngagementBreakdown = Schema.Struct({
  likes: Schema.Number,
  replies: Schema.Number,
  reposts: Schema.Number,
  quotes: Schema.Number,
  bookmarks: Schema.Number
})
export type EngagementBreakdown = Schema.Schema.Type<typeof EngagementBreakdown>

export const EngagementStats = Schema.Struct({
  ...EngagementBreakdown.fields,
  posts: Schema.Number,
  impressions: Schema.Number,
  activeDays: Schema.Number
})
export type EngagementStats = Schema.Schema.Type<typeof EngagementStats>

export const TopPostStats = Schema.Struct({
  ...EngagementBreakdown.fields,
  impressions: Schema.Number
})
export type TopPostStats = Schema.Schema.Type<typeof TopPostStats>

export const TopPost = Schema.Struct({
  text: Schema.String,
  createdAt: Schema.String,
  createdAtMs: Schema.Number,
  url: Schema.String,
  stats: TopPostStats
})
export type TopPost = Schema.Schema.Type<typeof TopPost>

export const FollowerSample = Schema.Struct({
  date: Schema.String,
  followers: Schema.Number
})
export type FollowerSample = Schema.Schema.Type<typeof FollowerSample>

export const Account = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  handle: Schema.String,
  team: Schema.String,
  color: Schema.String,
  profileImageUrl: Schema.optional(Schema.String),
  followers: Schema.Number,
  previousFollowers: Schema.Number,
  previousGrowth: Schema.Number,
  stats: EngagementStats,
  previousStats: EngagementStats,
  posts: Schema.Array(TopPost),
  dailyEngagement: Schema.Array(Schema.Number),
  hourlyEngagement: Schema.Array(Schema.Number),
  followerHistory: Schema.Array(FollowerSample)
})
export type Account = Schema.Schema.Type<typeof Account>

export const TrendPoint = Schema.Struct({
  label: Schema.String,
  posts: Schema.Number,
  engagements: Schema.Number,
  impressions: Schema.Number
})
export type TrendPoint = Schema.Schema.Type<typeof TrendPoint>

export const SocialMetricsSnapshot = Schema.Struct({
  accounts: Schema.Array(Account),
  trend: Schema.Array(TrendPoint),
  source: Source,
  capturedAt: Schema.DateTimeUtcFromString,
  dataSince: Schema.DateTimeUtcFromString,
  followerDataSince: Schema.DateTimeUtcFromString
})
export type SocialMetricsSnapshot = Schema.Schema.Type<typeof SocialMetricsSnapshot>

export const RefreshResult = Schema.Struct({
  capturedAt: Schema.DateTimeUtcFromString,
  accountsRefreshed: Schema.Number,
  tweetsWritten: Schema.Number
})
export type RefreshResult = Schema.Schema.Type<typeof RefreshResult>

export const Health = Schema.Struct({ ok: Schema.Boolean })

export class ApiNoData extends Schema.TaggedErrorClass<ApiNoData>()("ApiNoData", {
  message: Schema.String
}) {}

export class ApiUpstream extends Schema.TaggedErrorClass<ApiUpstream>()("ApiUpstream", {
  message: Schema.String
}) {}

const NoData = ApiNoData.pipe(HttpApiSchema.status(503))
const Upstream = ApiUpstream.pipe(HttpApiSchema.status(502))

export const SnapshotApi = HttpApi.make("SnapshotApi").add(
  HttpApiGroup.make("snapshot")
    .add(
      HttpApiEndpoint.get("getSnapshot", "/api/snapshot", {
        query: {
          range: DateRange,
          mode: Schema.optional(RangeMode),
          weekOf: Schema.optional(Schema.String)
        },
        success: SocialMetricsSnapshot,
        error: [NoData, Upstream]
      })
    )
    .add(
      HttpApiEndpoint.post("refresh", "/api/refresh", {
        success: RefreshResult,
        error: [Upstream]
      })
    )
    .add(HttpApiEndpoint.get("health", "/api/health", { success: Health }))
)
export type SnapshotApi = typeof SnapshotApi
