import { Array as Arr, Context, Data, DateTime, Effect, Layer, Option, Redacted, Stream } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"
import { RateLimiter } from "effect/unstable/persistence"
import { CostTracker } from "../cost.ts"
import { normalizeHandle } from "../handles.ts"
import { SearchResponse, type Tweet, TweetsResponse, UsersByResponse } from "./Schemas.ts"

const API_ROOT = "https://api.x.com/2"
const BASIC_SAFE_REQUESTS_PER_WINDOW = 60
const QUERY_LENGTH_LIMIT = 480

export class XApiError extends Data.TaggedError("XApiError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export interface XUser {
  readonly id: string
  readonly username: string
  readonly name: string
  readonly followers: number
  readonly profileImageUrl: string | undefined
}

export interface XTweet {
  readonly id: string
  readonly authorId: string
  readonly text: string
  readonly createdAt: DateTime.Utc
  readonly likes: number
  readonly replies: number
  readonly reposts: number
  readonly quotes: number
  readonly bookmarks: number
  readonly impressions: number
}

export interface SearchOptions {
  readonly sinceId?: string
  readonly startTime?: DateTime.Utc
  readonly maxPages?: number
}

export interface SearchResult {
  readonly tweets: ReadonlyArray<XTweet>
  readonly newestId: string | undefined
  readonly complete: boolean
}

export namespace XApi {
  export interface Service {
    readonly lookupUsers: (handles: ReadonlyArray<string>) => Effect.Effect<ReadonlyArray<XUser>, XApiError>
    readonly searchRecent: (
      handles: ReadonlyArray<string>,
      options: SearchOptions
    ) => Effect.Effect<SearchResult, XApiError>
    readonly lookupTweets: (ids: ReadonlyArray<string>) => Effect.Effect<ReadonlyArray<XTweet>, XApiError>
  }
}

export class XApi extends Context.Service<XApi, XApi.Service>()("@x-rank/XApi") {}

const decodeUsers = HttpClientResponse.schemaBodyJson(UsersByResponse)
const decodeSearch = HttpClientResponse.schemaBodyJson(SearchResponse)
const decodeTweets = HttpClientResponse.schemaBodyJson(TweetsResponse)
const TWEETS_LOOKUP_BATCH = 100

const wrapError =
  (label: string) =>
  (cause: unknown): XApiError =>
    new XApiError({ message: label, cause })

const buildQuery = (handles: ReadonlyArray<string>): Effect.Effect<string, XApiError> => {
  const clauses = handles.map((handle) => `from:${normalizeHandle(handle)}`)
  const fromClause = clauses.length === 1 ? clauses[0] : `(${clauses.join(" OR ")})`
  const query = `${fromClause} -is:retweet -is:reply`
  if (query.length > QUERY_LENGTH_LIMIT) {
    return Effect.fail(
      new XApiError({
        message: `search query is ${query.length} chars, exceeds safe limit ${QUERY_LENGTH_LIMIT}; reduce roster or implement batching`
      })
    )
  }
  return Effect.succeed(query)
}

const RATE_LIMIT_KEYS: ReadonlyArray<readonly [pattern: string, key: string]> = [
  ["/tweets/search/recent", "x-api:recent-search"],
  ["/users/by", "x-api:users-by"],
  ["/tweets", "x-api:tweets"]
]

const rateLimitKey = (request: HttpClientRequest.HttpClientRequest): string => {
  const url = new URL(request.url)
  for (const [pattern, key] of RATE_LIMIT_KEYS) {
    if (url.pathname.endsWith(pattern)) return key
  }
  return "x-api"
}

const buildClient = (token: Redacted.Redacted<string>) =>
  Effect.gen(function* () {
    const baseClient = yield* HttpClient.HttpClient
    const limiter = yield* RateLimiter.RateLimiter

    return baseClient.pipe(
      HttpClient.mapRequest((request) =>
        request.pipe(
          HttpClientRequest.prependUrl(API_ROOT),
          HttpClientRequest.bearerToken(token),
          HttpClientRequest.acceptJson
        )
      ),
      HttpClient.withRateLimiter({
        limiter,
        algorithm: "token-bucket",
        key: rateLimitKey,
        window: "15 minutes",
        limit: BASIC_SAFE_REQUESTS_PER_WINDOW
      }),
      HttpClient.retryTransient({ times: 3 }),
      HttpClient.filterStatusOk
    )
  })

const decodeRow = (tweet: Tweet): XTweet => ({
  id: tweet.id,
  authorId: tweet.author_id ?? "",
  text: tweet.text,
  createdAt: tweet.created_at,
  likes: tweet.public_metrics.like_count,
  replies: tweet.public_metrics.reply_count,
  reposts: tweet.public_metrics.retweet_count,
  quotes: tweet.public_metrics.quote_count,
  bookmarks: tweet.public_metrics.bookmark_count,
  impressions: tweet.public_metrics.impression_count
})

const make = (token: Redacted.Redacted<string>) =>
  Effect.gen(function* () {
    const client = yield* buildClient(token)
    const tracker = yield* CostTracker

    const lookupUsers: XApi.Service["lookupUsers"] = (handles) =>
      Effect.gen(function* () {
        if (handles.length === 0) return [] as ReadonlyArray<XUser>
        const usernames = handles.map(normalizeHandle).join(",")
        const response = yield* client.get("/users/by", {
          urlParams: { usernames, "user.fields": "public_metrics,profile_image_url" }
        })
        const decoded = yield* decodeUsers(response)
        const users = decoded.data.map(
          (user): XUser => ({
            id: user.id,
            username: user.username,
            name: user.name,
            followers: user.public_metrics.followers_count,
            profileImageUrl: user.profile_image_url
          })
        )
        yield* tracker.recordUsers(users.map((u) => u.id))
        return users
      }).pipe(Effect.mapError(wrapError(`lookupUsers failed for ${handles.length} handles`)))

    const searchRecent: XApi.Service["searchRecent"] = (handles, options) => {
      if (handles.length === 0) {
        return Effect.succeed({ tweets: [], newestId: undefined, complete: true })
      }
      return Effect.gen(function* () {
        const query = yield* buildQuery(handles)
        const baseParams: Record<string, string> = {
          query,
          "tweet.fields": "public_metrics,created_at,author_id",
          max_results: "100"
        }
        if (options.sinceId) baseParams.since_id = options.sinceId
        else if (options.startTime) baseParams.start_time = DateTime.formatIso(options.startTime)

        const maxPages = options.maxPages ?? 10

        const fetchPage = (paginationToken: string | undefined) =>
          client
            .get("/tweets/search/recent", {
              urlParams: paginationToken ? { ...baseParams, next_token: paginationToken } : baseParams
            })
            .pipe(Effect.flatMap(decodeSearch))

        interface PageState {
          readonly token: string | undefined
          readonly page: number
          readonly newestId: string | undefined
        }

        interface Slice {
          readonly tweets: ReadonlyArray<XTweet>
          readonly newestId: string | undefined
          readonly complete: boolean
        }

        const initialState: PageState = { token: undefined, page: 0, newestId: undefined }
        return yield* Stream.paginate(initialState, (state) =>
          fetchPage(state.token).pipe(
            Effect.map((response): readonly [ReadonlyArray<Slice>, Option.Option<PageState>] => {
              const tweets = response.data.map(decodeRow)
              const next = response.meta?.next_token
              const nextPage = state.page + 1
              const complete = !next
              const exhausted = complete || nextPage >= maxPages
              const newestId = state.page === 0 ? response.meta?.newest_id : state.newestId
              const slice: Slice = { tweets, newestId, complete }
              return [
                [slice],
                exhausted ? Option.none() : Option.some<PageState>({ token: next, page: nextPage, newestId })
              ]
            })
          )
        ).pipe(
          Stream.runCollect,
          Effect.flatMap((slices) =>
            Effect.gen(function* () {
              const tweets = Arr.flatten(slices.map((s) => s.tweets))
              yield* tracker.recordPosts(tweets.map((t) => t.id))
              return {
                tweets,
                newestId: slices[0]?.newestId,
                complete: slices.at(-1)?.complete ?? true
              }
            })
          )
        )
      }).pipe(Effect.mapError(wrapError(`searchRecent failed for ${handles.length} handles`)))
    }

    const lookupTweets: XApi.Service["lookupTweets"] = (ids) => {
      if (ids.length === 0) return Effect.succeed([] as ReadonlyArray<XTweet>)
      return Effect.forEach(
        Arr.chunksOf(ids, TWEETS_LOOKUP_BATCH),
        (batch) =>
          client
            .get("/tweets", {
              urlParams: {
                ids: batch.join(","),
                "tweet.fields": "public_metrics,created_at,author_id"
              }
            })
            .pipe(
              Effect.flatMap(decodeTweets),
              Effect.map((response) => response.data.map(decodeRow))
            ),
        { concurrency: 4 }
      ).pipe(
        Effect.map(Arr.flatten),
        Effect.tap((tweets) => tracker.recordPosts(tweets.map((t) => t.id))),
        Effect.mapError(wrapError(`lookupTweets failed for ${ids.length} ids`))
      )
    }

    return XApi.of({ lookupUsers, searchRecent, lookupTweets })
  })

export const layer = (
  token: Redacted.Redacted<string>
): Layer.Layer<XApi, never, HttpClient.HttpClient | RateLimiter.RateLimiter | CostTracker> =>
  Layer.effect(XApi, make(token))

export const layerLive = (token: Redacted.Redacted<string>): Layer.Layer<XApi, never, CostTracker> =>
  layer(token).pipe(
    Layer.provide(FetchHttpClient.layer),
    Layer.provide(Layer.effect(RateLimiter.RateLimiter, RateLimiter.make)),
    Layer.provide(RateLimiter.layerStoreMemory)
  )
