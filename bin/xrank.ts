#!/usr/bin/env bun
import { BunServices } from "@effect/platform-bun"
import { spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { Console, Effect, Layer, Redacted, Schema } from "effect"
import { CliOutput, Command, Flag } from "effect/unstable/cli"
import { SocialMetricsSnapshot } from "../src/api.ts"
import { buildWindow, DAY_MS, isoWeekOf, ranges, recentWeeks, weekStartUtc } from "../src/metrics.ts"
import type { DateRange, RangeMode } from "../src/api.ts"
import { buildSnapshot } from "../server/aggregate.ts"
import { AppConfig, AppConfigLive, accountConfigs } from "../server/config.ts"
import { CostTrackerLive, formatUsd, PRICE_PER_POST_READ_USD, PRICE_PER_USER_READ_USD } from "../server/cost.ts"
import { Db, DbLive, costByDay, costSince, lastRefresh } from "../server/db.ts"
import { refreshAll } from "../server/refresh.ts"
import { layerLive, XApiError } from "../server/x/XApi.ts"

const OUTPUT_PATH = "public/snapshot.json"
const SNAPSHOT_DIR = "public/snapshots"
const ROLLING_RANGES: ReadonlyArray<DateRange> = ranges.map((range) => range.id)
const WEEKLY_LOOKBACK = 8

const formatRelative = (capturedAt: number, now: number) => {
  const ageMs = Math.max(0, now - capturedAt)
  if (ageMs < 60_000) return "just now"
  if (ageMs < 60 * 60_000) return `${Math.round(ageMs / 60_000)}m ago`
  if (ageMs < 24 * 60 * 60_000) return `${Math.round(ageMs / 60 / 60_000)}h ago`
  return `${Math.round(ageMs / DAY_MS)}d ago`
}

const requireToken = Effect.gen(function* () {
  const config = yield* AppConfig
  if (!config.bearerToken) {
    return yield* Effect.die(new Error("X_BEARER_TOKEN is not set in .env"))
  }
  return config.bearerToken
})

const runRefresh = Effect.gen(function* () {
  const db = yield* Db
  const token = yield* requireToken
  return yield* refreshAll(db).pipe(
    Effect.provide(layerLive(Redacted.make(token)).pipe(Layer.provideMerge(CostTrackerLive))),
    Effect.catch((cause: XApiError) => {
      const detail = cause.cause === undefined ? "" : `\n  cause: ${JSON.stringify(cause.cause, null, 2)}`
      return Effect.die(new Error(`refresh failed: ${cause.message}${detail}`))
    })
  )
})

const writeOneSnapshot = (
  db: Db,
  capturedAt: number,
  mode: RangeMode,
  range: DateRange,
  weekOf: string | undefined,
  filePath: string
) =>
  Effect.gen(function* () {
    const window = buildWindow(mode, range, weekOf, capturedAt)
    const snapshot = yield* buildSnapshot(db, window, capturedAt)
    const encoded = Schema.encodeSync(SocialMetricsSnapshot)(snapshot)
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, JSON.stringify(encoded))
    return snapshot
  })

const writeSnapshot = Effect.gen(function* () {
  const db = yield* Db
  const last = yield* lastRefresh(db)
  if (!last) return yield* Effect.die(new Error("no data in DB; run `xrank refresh` first"))
  const capturedAt = last.captured_at

  // Default snapshot.json keeps the existing single-file contract (rolling 7d).
  const defaultSnapshot = yield* writeOneSnapshot(db, capturedAt, "rolling", "7d", undefined, OUTPUT_PATH)
  yield* Console.log(
    `wrote ${OUTPUT_PATH} · ${defaultSnapshot.accounts.length} accounts · captured ${defaultSnapshot.capturedAt}`
  )

  mkdirSync(SNAPSHOT_DIR, { recursive: true })
  // Per-window snapshots. Static-mode client picks one based on the URL state.
  for (const range of ROLLING_RANGES) {
    const path = `${SNAPSHOT_DIR}/rolling-${range}.json`
    yield* writeOneSnapshot(db, capturedAt, "rolling", range, undefined, path)
    yield* Console.log(`  · ${path}`)
  }
  const weeks = recentWeeks(capturedAt, WEEKLY_LOOKBACK)
  for (const week of weeks) {
    const path = `${SNAPSHOT_DIR}/weekly-${week.iso}.json`
    yield* writeOneSnapshot(db, capturedAt, "weekly", "7d", week.iso, path)
    yield* Console.log(`  · ${path}`)
  }
  // Manifest so the client knows which weeks are pre-rendered.
  const manifest = {
    capturedAt: defaultSnapshot.capturedAt,
    rolling: ROLLING_RANGES,
    weeks: weeks.map((w) => ({ iso: w.iso, inProgress: w.inProgress })),
    defaultWeekIso: weeks[1]?.iso ?? weeks[0]?.iso ?? isoWeekOf(weekStartUtc(capturedAt))
  }
  writeFileSync(`${SNAPSHOT_DIR}/manifest.json`, JSON.stringify(manifest))
  yield* Console.log(`  · ${SNAPSHOT_DIR}/manifest.json`)
})

const refreshCommand = Command.make(
  "refresh",
  {
    skipIfFresh: Flag.boolean("skip-if-fresh").pipe(
      Flag.withDescription("Skip refresh if last sync was within the last hour"),
      Flag.withDefault(false)
    )
  },
  ({ skipIfFresh }) =>
    Effect.gen(function* () {
      const db = yield* Db
      const last = yield* lastRefresh(db)
      if (skipIfFresh && last && Date.now() - last.captured_at < 60 * 60_000) {
        yield* Console.log(`skipping; last refresh was ${formatRelative(last.captured_at, Date.now())}`)
        return
      }
      yield* Console.log("running refresh against X API…")
      const result = yield* runRefresh
      yield* Console.log(
        `refreshed ${result.accountsRefreshed} accounts · +${result.tweetsWritten} tweets · ${result.capturedAt}`
      )
    })
).pipe(Command.withDescription("Refresh tweet + user data from the X API"))

const exportCommand = Command.make(
  "export",
  {
    refresh: Flag.boolean("refresh").pipe(
      Flag.withAlias("r"),
      Flag.withDescription("Run a refresh first; otherwise use existing DB"),
      Flag.withDefault(false)
    )
  },
  ({ refresh }) =>
    Effect.gen(function* () {
      if (refresh) {
        yield* Console.log("running refresh against X API…")
        yield* runRefresh
      }
      yield* writeSnapshot
    })
).pipe(Command.withDescription("Build public/snapshot.json from latest data"))

const publishCommand = Command.make(
  "publish",
  {
    skipIfFresh: Flag.boolean("skip-if-fresh").pipe(
      Flag.withDescription("Skip refresh if last sync was within the last hour"),
      Flag.withDefault(false)
    )
  },
  ({ skipIfFresh }) =>
    Effect.gen(function* () {
      const db = yield* Db
      const last = yield* lastRefresh(db)
      if (skipIfFresh && last && Date.now() - last.captured_at < 60 * 60_000) {
        yield* Console.log(`skipping refresh; last sync was ${formatRelative(last.captured_at, Date.now())}`)
      } else {
        yield* Console.log("running refresh against X API…")
        yield* runRefresh
      }
      yield* writeSnapshot
      yield* Console.log("building Vercel artifact…")
      const build = yield* Effect.sync(() => spawnSync("bunx", ["vercel", "build", "--prod"], { stdio: "inherit" }))
      if (build.status !== 0) return yield* Effect.die(new Error(`vercel build failed (${build.status})`))
      yield* Console.log("deploying to production…")
      const deploy = yield* Effect.sync(() =>
        spawnSync("bunx", ["vercel", "deploy", "--prebuilt", "--prod"], { stdio: "inherit" })
      )
      if (deploy.status !== 0) return yield* Effect.die(new Error(`vercel deploy failed (${deploy.status})`))
      yield* Console.log("done.")
    })
).pipe(Command.withDescription("Refresh, export, build, and deploy to production"))

const parseSince = (arg: string): number => {
  const m = arg.match(/^(\d+)([dhwmy])$/)
  if (!m) {
    if (arg === "all") return 0
    if (arg === "today") {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      return start.getTime()
    }
    throw new Error(`unrecognized --since value: ${arg}`)
  }
  const n = Number(m[1])
  const unit = m[2]
  const ms =
    unit === "h"
      ? 60 * 60_000
      : unit === "d"
        ? DAY_MS
        : unit === "w"
          ? 7 * DAY_MS
          : unit === "m"
            ? 30 * DAY_MS
            : unit === "y"
              ? 365 * DAY_MS
              : DAY_MS
  return Date.now() - n * ms
}

const costCommand = Command.make(
  "cost",
  {
    since: Flag.string("since").pipe(
      Flag.withDescription("Window: today, 1d, 7d, 30d, all (default: today)"),
      Flag.withDefault("today")
    ),
    daily: Flag.boolean("daily").pipe(
      Flag.withAlias("d"),
      Flag.withDescription("Show day-by-day breakdown within the window"),
      Flag.withDefault(false)
    )
  },
  ({ since, daily }) =>
    Effect.gen(function* () {
      const db = yield* Db
      const sinceMs = parseSince(since)
      const totals = yield* costSince(db, sinceMs)
      const label = since === "all" ? "all time" : since
      yield* Console.log(`x-rank cost · ${label}`)
      yield* Console.log(`  refreshes:        ${totals.refreshes}`)
      yield* Console.log(
        `  user-reads (chg): ${totals.userReadsCharged}  · $${(totals.userReadsCharged * PRICE_PER_USER_READ_USD).toFixed(3)}`
      )
      yield* Console.log(
        `  post-reads (chg): ${totals.postReadsCharged}  · $${(totals.postReadsCharged * PRICE_PER_POST_READ_USD).toFixed(3)}`
      )
      yield* Console.log(`  total (estimate): ${formatUsd(totals.estCostUsd)}`)
      if (totals.refreshes > 0) {
        yield* Console.log(`  per-refresh avg:  ${formatUsd(totals.estCostUsd / totals.refreshes)}`)
      }
      const last7 = yield* costSince(db, Date.now() - 7 * DAY_MS)
      if (last7.estCostUsd > 0) {
        const perDay = last7.estCostUsd / 7
        yield* Console.log(
          `  projected (7d avg ${formatUsd(perDay)}/day): ${formatUsd(perDay * 30)}/mo · ${formatUsd(perDay * 365)}/yr`
        )
      }
      if (daily) {
        const rows = yield* costByDay(db, sinceMs)
        yield* Console.log("")
        yield* Console.log(`  by day:`)
        yield* Console.log(`    date         refreshes   user/post   spend`)
        for (const r of rows) {
          const counts = `${String(r.userReadsCharged).padStart(4)}u + ${String(r.postReadsCharged).padStart(4)}p`
          yield* Console.log(
            `    ${r.date}   ${String(r.refreshes).padStart(4)}        ${counts}   ${formatUsd(r.estCostUsd).padStart(7)}`
          )
        }
      }
    })
).pipe(Command.withDescription("Show estimated X API spend over a time window"))

const statusCommand = Command.make("status", {}, () =>
  Effect.gen(function* () {
    const db = yield* Db
    const last = yield* lastRefresh(db)
    yield* Console.log(`x-rank · ${accountConfigs.length} tracked accounts`)
    if (!last) {
      yield* Console.log("  no refreshes yet — run `xrank refresh`")
      return
    }
    const now = Date.now()
    yield* Console.log(
      `  last refresh: ${new Date(last.captured_at).toISOString()} (${formatRelative(last.captured_at, now)})`
    )
    yield* Console.log(
      `  last cost:    ${formatUsd(last.est_cost_usd)} (${last.user_reads_charged}u + ${last.post_reads_charged}p)`
    )
    const today = yield* costSince(db, new Date().setHours(0, 0, 0, 0))
    yield* Console.log(`  today total:  ${formatUsd(today.estCostUsd)} across ${today.refreshes} refreshes`)
  })
).pipe(Command.withDescription("Show pipeline health + cost summary"))

const root = Command.make("xrank").pipe(
  Command.withDescription("x-rank ops CLI"),
  Command.withSubcommands([refreshCommand, exportCommand, publishCommand, costCommand, statusCommand])
)

const RuntimeLayer = Layer.mergeAll(
  AppConfigLive,
  DbLive.pipe(Layer.provide(AppConfigLive)),
  BunServices.layer,
  CliOutput.layer(CliOutput.defaultFormatter({ colors: true }))
)

await Effect.runPromise(Command.run(root, { version: "0.1.0" }).pipe(Effect.provide(RuntimeLayer))).catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
