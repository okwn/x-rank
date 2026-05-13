import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { Context, Duration, Effect, Layer, Redacted, Schedule } from "effect"
import { HttpRouter } from "effect/unstable/http"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { ApiNoData, ApiUpstream, SnapshotApi } from "../src/api.ts"
import { windowFromQuery } from "../src/metrics.ts"
import { buildSnapshot } from "./aggregate.ts"
import { AppConfig, AppConfigLive } from "./config.ts"
import { CostTrackerLive } from "./cost.ts"
import { Db, DbLive, lastRefresh } from "./db.ts"
import { refreshAll, type RefreshResult } from "./refresh.ts"
import { layerLive, XApiError } from "./x/XApi.ts"

interface RefreshCacheService {
  readonly hasToken: boolean
  readonly run: (force: boolean) => Effect.Effect<RefreshResult, XApiError>
}
class RefreshCache extends Context.Service<RefreshCache, RefreshCacheService>()("RefreshCache") {}

const RefreshCacheLive = Layer.effect(
  RefreshCache,
  Effect.gen(function* () {
    const config = yield* AppConfig
    const db = yield* Db
    if (!config.bearerToken) {
      return RefreshCache.of({
        hasToken: false,
        run: () => Effect.fail(new XApiError({ message: "X_BEARER_TOKEN is not set" }))
      })
    }
    const [run, invalidate] = yield* Effect.cachedInvalidateWithTTL(refreshAll(db), config.refreshInterval)
    const provided = (force: boolean) =>
      Effect.provide(
        force ? Effect.andThen(invalidate, run) : run,
        layerLive(Redacted.make(config.bearerToken!)).pipe(
          Layer.provideMerge(CostTrackerLive),
          Layer.provide(Layer.succeed(Db, db))
        )
      )
    return RefreshCache.of({ hasToken: true, run: provided })
  })
)

const RefreshDaemon = Layer.effectDiscard(
  Effect.gen(function* () {
    const config = yield* AppConfig
    const ctrl = yield* RefreshCache
    if (!config.enableRefreshDaemon) return
    if (!ctrl.hasToken) {
      yield* Effect.logWarning("X_BEARER_TOKEN not set; refresh daemon disabled")
      return
    }
    const cadence = config.refreshInterval
    yield* Effect.forkScoped(
      Effect.repeat(
        ctrl.run(false).pipe(Effect.catch((cause) => Effect.logError(`scheduled refresh failed: ${cause.message}`))),
        Schedule.fixed(cadence)
      )
    )
    yield* Effect.logInfo(`refresh daemon started (every ${Duration.format(cadence)})`)
  })
).pipe(Layer.provide(RefreshCacheLive))

const SnapshotGroup = HttpApiBuilder.group(SnapshotApi, "snapshot", (handlers) =>
  handlers
    .handle("getSnapshot", ({ query }) =>
      Effect.gen(function* () {
        const ctrl = yield* RefreshCache
        const db = yield* Db
        let last = yield* lastRefresh(db)
        if (!last) {
          if (!ctrl.hasToken) {
            return yield* new ApiNoData({
              message: "no data yet — POST /api/refresh once with X_BEARER_TOKEN set"
            })
          }
          yield* ctrl.run(false).pipe(Effect.mapError((cause) => new ApiUpstream({ message: cause.message })))
          last = yield* lastRefresh(db)
          if (!last) return yield* new ApiNoData({ message: "refresh produced no data" })
        }
        const window = windowFromQuery(query, last.captured_at)
        return yield* buildSnapshot(db, window, last.captured_at)
      })
    )
    .handle("refresh", () =>
      Effect.gen(function* () {
        const ctrl = yield* RefreshCache
        return yield* ctrl.run(true).pipe(Effect.mapError((cause) => new ApiUpstream({ message: cause.message })))
      })
    )
    .handle("health", () => Effect.succeed({ ok: true }))
)

const HttpServerLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* AppConfig
    if (!config.bearerToken) yield* Effect.logWarning("X_BEARER_TOKEN not set; /api/refresh will fail until it is")
    return BunHttpServer.layer({ port: config.port })
  })
)

const RuntimeLive = Layer.mergeAll(
  AppConfigLive,
  DbLive.pipe(Layer.provide(AppConfigLive)),
  HttpServerLive.pipe(Layer.provide(AppConfigLive))
)

const ApiLive = HttpRouter.serve(
  HttpApiBuilder.layer(SnapshotApi).pipe(Layer.provide(SnapshotGroup), HttpRouter.provideRequest(RefreshCacheLive))
).pipe(Layer.provideMerge(RefreshDaemon), Layer.provide(RuntimeLive))

BunRuntime.runMain(Layer.launch(ApiLive))
