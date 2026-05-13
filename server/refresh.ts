import { DateTime, Duration, Effect } from "effect"
import type { RefreshResult } from "../src/api.ts"
import { accountByHandle, accountConfigs } from "./config.ts"
import { CostTracker, formatUsd } from "./cost.ts"
import {
  getCursor,
  insertFollowerSample,
  recordRefresh,
  setCursor,
  tweetsNeedingMetricRefresh,
  updateTweetMetrics,
  upsertAccount,
  upsertTweet,
  type DbClient
} from "./db.ts"
import { normalizeHandle, searchCursorKey } from "./handles.ts"
import { XApi, XApiError, type XTweet, type XUser } from "./x/XApi.ts"

const BACKFILL_WINDOW = Duration.days(7)
const SEARCH_RECENT_HORIZON_MS = 7 * 24 * 60 * 60 * 1000
const TWITTER_SNOWFLAKE_EPOCH_MS = 1288834974657n

const tweetIdToTimestampMs = (id: string): number | undefined => {
  try {
    const big = BigInt(id)
    return Number((big >> 22n) + TWITTER_SNOWFLAKE_EPOCH_MS)
  } catch {
    return undefined
  }
}

export type { RefreshResult } from "../src/api.ts"

const persistInTransaction = <A>(
  db: DbClient,
  items: ReadonlyArray<A>,
  fn: (item: A) => Effect.Effect<void>
): Effect.Effect<void> => db.withTransaction(Effect.forEach(items, fn, { discard: true })).pipe(Effect.orDie)

const persistInTransactionCounted = <A>(
  db: DbClient,
  items: ReadonlyArray<A>,
  fn: (item: A) => Effect.Effect<boolean>
): Effect.Effect<number> =>
  db
    .withTransaction(
      Effect.gen(function* () {
        let written = 0
        for (const item of items) {
          if (yield* fn(item)) written += 1
        }
        return written
      })
    )
    .pipe(Effect.orDie)

const persistUsers = (db: DbClient, users: ReadonlyArray<XUser>, capturedAt: number) =>
  persistInTransaction(db, users, (user) =>
    Effect.gen(function* () {
      const cfg = accountByHandle.get(normalizeHandle(user.username))
      if (!cfg) return
      yield* upsertAccount(db, {
        id: user.id,
        handle: user.username,
        name: user.name,
        team: cfg.team,
        color: cfg.color,
        profile_image_url: user.profileImageUrl ?? null,
        fetched_at: capturedAt
      })
      yield* insertFollowerSample(db, {
        account_id: user.id,
        captured_at: capturedAt,
        followers: user.followers
      })
    })
  )

const persistTweets = (
  db: DbClient,
  tweets: ReadonlyArray<XTweet>,
  handlesById: ReadonlyMap<string, string>,
  capturedAt: number
): Effect.Effect<number> =>
  persistInTransactionCounted(db, tweets, (tweet) =>
    Effect.gen(function* () {
      const handle = handlesById.get(tweet.authorId)
      if (!handle) return false
      yield* upsertTweet(db, {
        id: tweet.id,
        account_id: tweet.authorId,
        created_at: DateTime.toEpochMillis(tweet.createdAt),
        text: tweet.text,
        url: `https://x.com/${handle}/status/${tweet.id}`,
        likes: tweet.likes,
        replies: tweet.replies,
        reposts: tweet.reposts,
        quotes: tweet.quotes,
        bookmarks: tweet.bookmarks,
        impressions: tweet.impressions,
        last_refreshed_at: capturedAt
      })
      return true
    })
  )

const persistMetricUpdates = (
  db: DbClient,
  tweets: ReadonlyArray<XTweet>,
  refreshedAt: number
): Effect.Effect<number> =>
  persistInTransactionCounted(db, tweets, (tweet) =>
    Effect.gen(function* () {
      yield* updateTweetMetrics(db, {
        id: tweet.id,
        likes: tweet.likes,
        replies: tweet.replies,
        reposts: tweet.reposts,
        quotes: tweet.quotes,
        bookmarks: tweet.bookmarks,
        impressions: tweet.impressions,
        last_refreshed_at: refreshedAt
      })
      return true
    })
  )

interface UserSearchResult {
  readonly tweets: ReadonlyArray<XTweet>
  readonly sinceId: string | undefined
}

const searchTweetsForUser = (
  db: DbClient,
  api: XApi.Service,
  handle: string,
  startedAt: number
): Effect.Effect<UserSearchResult, XApiError> =>
  Effect.gen(function* () {
    const cursorKey = searchCursorKey(handle)
    const storedSinceId = yield* getCursor(db, cursorKey)
    // /tweets/search/recent rejects since_id older than ~7 days; fall back to start_time when stale.
    const cursorTimestamp = storedSinceId ? tweetIdToTimestampMs(storedSinceId) : undefined
    const cursorIsFresh = cursorTimestamp !== undefined && startedAt - cursorTimestamp < SEARCH_RECENT_HORIZON_MS
    const sinceId = storedSinceId && cursorIsFresh ? storedSinceId : undefined
    const searchOptions = sinceId
      ? { sinceId }
      : { startTime: DateTime.subtractDuration(DateTime.makeUnsafe(startedAt), BACKFILL_WINDOW) }
    const { tweets, newestId, complete } = yield* api.searchRecent([handle], searchOptions)

    if (newestId && complete) yield* setCursor(db, cursorKey, newestId)
    else if (newestId)
      yield* Effect.logWarning(`${handle} search pagination stopped before completion; cursor not advanced`)

    return { tweets, sinceId }
  })

export const refreshAll = (db: DbClient): Effect.Effect<RefreshResult, XApiError, XApi | CostTracker> =>
  Effect.gen(function* () {
    if (accountConfigs.length === 0) {
      return yield* Effect.fail(
        new XApiError({ message: "x-rank roster is empty. Add X handles to `roster` in xrank.config.ts." })
      )
    }
    const api = yield* XApi
    const tracker = yield* CostTracker
    yield* tracker.reset()
    const handles = accountConfigs.map((cfg) => cfg.handle)
    const startedAt = Date.now()

    const users = yield* api.lookupUsers(handles)
    yield* persistUsers(db, users, startedAt)

    const handlesById = new Map(users.map((u) => [u.id, u.username]))
    const searchResults = yield* Effect.forEach(
      users,
      (user) => searchTweetsForUser(db, api, user.username, startedAt),
      { concurrency: 3 }
    )
    const tweets = searchResults.flatMap((result) => result.tweets)
    const tweetsWritten = yield* persistTweets(db, tweets, handlesById, startedAt)
    const backfills = searchResults.filter((result) => !result.sinceId).length

    const staleIds = yield* tweetsNeedingMetricRefresh(db, startedAt)
    let metricsUpdated = 0
    if (staleIds.length > 0) {
      const refreshed = yield* api.lookupTweets(staleIds)
      metricsUpdated = yield* persistMetricUpdates(db, refreshed, startedAt)
    }

    const completedAt = Date.now()
    const summary = yield* tracker.snapshot()
    yield* recordRefresh(db, completedAt, summary)

    yield* Effect.logInfo(
      `refresh: ${users.length} users, +${tweetsWritten} tweets, ${metricsUpdated} metric updates` +
        `${backfills > 0 ? `, ${backfills} initial backfills` : ""}` +
        ` · charged ${summary.userReadsCharged}u + ${summary.postReadsCharged}p = ${formatUsd(summary.estCostUsd)}`
    )
    return {
      capturedAt: DateTime.makeUnsafe(completedAt),
      accountsRefreshed: users.length,
      tweetsWritten
    }
  }).pipe(Effect.withLogSpan("refresh.all"))

export { XApiError }
