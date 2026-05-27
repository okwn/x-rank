import { SqliteClient } from "@effect/sql-sqlite-bun"
import { Context, Effect, Layer } from "effect"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { AppConfig } from "./config.ts"

export type DbClient = SqliteClient.SqliteClient

export interface AccountRow {
  readonly id: string
  readonly handle: string
  readonly name: string
  readonly team: string
  readonly color: string
  readonly profile_image_url: string | null
  readonly fetched_at: number
}

export interface TweetRow {
  readonly id: string
  readonly account_id: string
  readonly created_at: number
  readonly text: string
  readonly url: string
  readonly likes: number
  readonly replies: number
  readonly reposts: number
  readonly quotes: number
  readonly bookmarks: number
  readonly impressions: number
}

export interface TweetWrite extends TweetRow {
  readonly last_refreshed_at: number
}

export interface FollowerRow {
  readonly account_id: string
  readonly captured_at: number
  readonly followers: number
}

export interface RefreshRow {
  readonly id: number
  readonly captured_at: number
  readonly user_reads_charged: number
  readonly post_reads_charged: number
  readonly user_reads_total: number
  readonly post_reads_total: number
  readonly est_cost_usd: number
}

export class Db extends Context.Service<Db, DbClient>()("@x-rank/Db") {}

const initializeDb = (db: DbClient) =>
  Effect.gen(function* () {
    yield* db`PRAGMA foreign_keys = ON`.pipe(Effect.orDie)
    yield* db`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        handle TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        team TEXT NOT NULL,
        color TEXT NOT NULL,
        profile_image_url TEXT,
        fetched_at INTEGER NOT NULL
      )
    `.pipe(Effect.orDie)

    yield* db`
      CREATE TABLE IF NOT EXISTS tweets (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL,
        text TEXT NOT NULL,
        url TEXT NOT NULL,
        likes INTEGER NOT NULL,
        replies INTEGER NOT NULL,
        reposts INTEGER NOT NULL,
        quotes INTEGER NOT NULL,
        bookmarks INTEGER NOT NULL,
        impressions INTEGER NOT NULL,
        last_refreshed_at INTEGER NOT NULL DEFAULT 0
      )
    `.pipe(Effect.orDie)
    yield* db`CREATE INDEX IF NOT EXISTS tweets_account_created_idx ON tweets(account_id, created_at DESC)`.pipe(
      Effect.orDie
    )
    yield* db`CREATE INDEX IF NOT EXISTS tweets_created_at_idx ON tweets(created_at DESC)`.pipe(Effect.orDie)

    yield* db`
      CREATE TABLE IF NOT EXISTS follower_history (
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        captured_at INTEGER NOT NULL,
        followers INTEGER NOT NULL,
        PRIMARY KEY (account_id, captured_at)
      )
    `.pipe(Effect.orDie)

    yield* db`
      CREATE TABLE IF NOT EXISTS refreshes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        captured_at INTEGER NOT NULL,
        user_reads_charged INTEGER NOT NULL DEFAULT 0,
        post_reads_charged INTEGER NOT NULL DEFAULT 0,
        user_reads_total INTEGER NOT NULL DEFAULT 0,
        post_reads_total INTEGER NOT NULL DEFAULT 0,
        est_cost_usd REAL NOT NULL DEFAULT 0
      )
    `.pipe(Effect.orDie)

    yield* db`
      CREATE TABLE IF NOT EXISTS api_reads (
        id TEXT NOT NULL,
        kind TEXT NOT NULL,
        last_read_at INTEGER NOT NULL,
        PRIMARY KEY (kind, id)
      )
    `.pipe(Effect.orDie)
    yield* db`CREATE INDEX IF NOT EXISTS api_reads_last_idx ON api_reads(last_read_at DESC)`.pipe(Effect.orDie)

    yield* db`
      CREATE TABLE IF NOT EXISTS cursors (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `.pipe(Effect.orDie)

    yield* addColumnIfMissing(db, "tweets", "last_refreshed_at", "INTEGER NOT NULL DEFAULT 0")
    yield* db`DROP INDEX IF EXISTS tweets_refresh_idx`.pipe(Effect.orDie)
    yield* addColumnIfMissing(db, "accounts", "profile_image_url", "TEXT")
    yield* addColumnIfMissing(db, "refreshes", "user_reads_charged", "INTEGER NOT NULL DEFAULT 0")
    yield* addColumnIfMissing(db, "refreshes", "post_reads_charged", "INTEGER NOT NULL DEFAULT 0")
    yield* addColumnIfMissing(db, "refreshes", "user_reads_total", "INTEGER NOT NULL DEFAULT 0")
    yield* addColumnIfMissing(db, "refreshes", "post_reads_total", "INTEGER NOT NULL DEFAULT 0")
    yield* addColumnIfMissing(db, "refreshes", "est_cost_usd", "REAL NOT NULL DEFAULT 0")
  })

const addColumnIfMissing = (db: DbClient, table: string, columnn: string, ddl: string): Effect.Effect<void> =>
  Effect.gen(function* () {
    const cols = yield* db<{ name: string }>`PRAGMA table_info(${db.literal(table)})`.pipe(Effect.orDie)
    if (cols.some((c) => c.name === columnn)) return
    yield* db`ALTER TABLE ${db.literal(table)} ADD COLUMN ${db.literal(columnn)} ${db.literal(ddl)}`.pipe(Effect.orDie)
  })

export const DbLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* AppConfig
    yield* Effect.sync(() => mkdirSync(dirname(config.dbPath), { recursive: true }))
    return Layer.effect(
      Db,
      Effect.gen(function* () {
        const db = yield* SqliteClient.SqliteClient
        yield* initializeDb(db)
        return db
      })
    ).pipe(Layer.provide(SqliteClient.layer({ filename: config.dbPath })))
  })
)

export const getCursor = (db: DbClient, key: string): Effect.Effect<string | undefined> =>
  Effect.gen(function* () {
    const rows = yield* db<{ value: string }>`SELECT value FROM cursors WHERE key = ${key}`.pipe(Effect.orDie)
    return rows[0]?.value
  })

export const setCursor = (db: DbClient, key: string, value: string): Effect.Effect<void> =>
  db`
    INSERT INTO cursors (key, value, updated_at)
    VALUES (${key}, ${value}, ${Date.now()})
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `.pipe(Effect.asVoid, Effect.orDie)

export const upsertAccount = (db: DbClient, row: AccountRow): Effect.Effect<void> =>
  db`
    INSERT INTO accounts (id, handle, name, team, color, profile_image_url, fetched_at)
    VALUES (${row.id}, ${row.handle}, ${row.name}, ${row.team}, ${row.color}, ${row.profile_image_url}, ${row.fetched_at})
    ON CONFLICT(id) DO UPDATE SET
      handle = excluded.handle,
      name = excluded.name,
      team = excluded.team,
      color = excluded.color,
      profile_image_url = excluded.profile_image_url,
      fetched_at = excluded.fetched_at
  `.pipe(Effect.asVoid, Effect.orDie)

export const upsertTweet = (db: DbClient, row: TweetWrite): Effect.Effect<void> =>
  db`
    INSERT INTO tweets (id, account_id, created_at, text, url, likes, replies, reposts, quotes, bookmarks, impressions, last_refreshed_at)
    VALUES (${row.id}, ${row.account_id}, ${row.created_at}, ${row.text}, ${row.url}, ${row.likes}, ${row.replies}, ${row.reposts}, ${row.quotes}, ${row.bookmarks}, ${row.impressions}, ${row.last_refreshed_at})
    ON CONFLICT(id) DO UPDATE SET
      likes = excluded.likes,
      replies = excluded.replies,
      reposts = excluded.reposts,
      quotes = excluded.quotes,
      bookmarks = excluded.bookmarks,
      impressions = excluded.impressions,
      last_refreshed_at = excluded.last_refreshed_at
  `.pipe(Effect.asVoid, Effect.orDie)

export type MetricUpdate = Pick<
  TweetRow,
  "id" | "likes" | "replies" | "reposts" | "quotes" | "bookmarks" | "impressions"
> & { readonly last_refreshed_at: number }

export const updateTweetMetrics = (db: DbClient, row: MetricUpdate): Effect.Effect<void> =>
  db`
    UPDATE tweets SET
      likes = ${row.likes},
      replies = ${row.replies},
      reposts = ${row.reposts},
      quotes = ${row.quotes},
      bookmarks = ${row.bookmarks},
      impressions = ${row.impressions},
      last_refreshed_at = ${row.last_refreshed_at}
    WHERE id = ${row.id}
  `.pipe(Effect.asVoid, Effect.orDie)

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

// Pick tweets due for metric refresh. Tier rules:
//   age < 24h         -> refresh if last_refreshed_at older than 1h
//   24h <= age < 7d   -> refresh if last_refreshed_at older than 24h
//   7d  <= age < 30d  -> refresh if last_refreshed_at older than 7d
//   age >= 30d        -> frozen, never refreshed
// Newest-first, so the active window (which dedups against search) is prioritized.
export const tweetsNeedingMetricRefresh = (
  db: DbClient,
  now: number,
  limit = 100
): Effect.Effect<ReadonlyArray<string>> =>
  Effect.gen(function* () {
    const rows = yield* db<{ id: string }>`
      SELECT id FROM tweets
      WHERE
        (created_at > ${now} - ${DAY_MS} AND last_refreshed_at < ${now} - ${HOUR_MS}) OR
        (created_at <= ${now} - ${DAY_MS} AND created_at > ${now} - 7 * ${DAY_MS} AND last_refreshed_at < ${now} - ${DAY_MS}) OR
        (created_at <= ${now} - 7 * ${DAY_MS} AND created_at > ${now} - 30 * ${DAY_MS} AND last_refreshed_at < ${now} - 7 * ${DAY_MS})
      ORDER BY created_at DESC
      LIMIT ${limit}
    `.pipe(Effect.orDie)
    return rows.map((row) => row.id)
  })

export const insertFollowerSample = (db: DbClient, row: FollowerRow): Effect.Effect<void> =>
  db`
    INSERT OR REPLACE INTO follower_history (account_id, captured_at, followers)
    VALUES (${row.account_id}, ${row.captured_at}, ${row.followers})
  `.pipe(Effect.asVoid, Effect.orDie)

export interface RefreshSummary {
  readonly userReadsCharged: number
  readonly postReadsCharged: number
  readonly userReadsTotal: number
  readonly postReadsTotal: number
  readonly estCostUsd: number
}

export const recordRefresh = (
  db: DbClient,
  capturedAt: number,
  summary: RefreshSummary = {
    userReadsCharged: 0,
    postReadsCharged: 0,
    userReadsTotal: 0,
    postReadsTotal: 0,
    estCostUsd: 0
  }
): Effect.Effect<void> =>
  db`
    INSERT INTO refreshes (
      captured_at,
      user_reads_charged, post_reads_charged,
      user_reads_total, post_reads_total,
      est_cost_usd
    ) VALUES (
      ${capturedAt},
      ${summary.userReadsCharged}, ${summary.postReadsCharged},
      ${summary.userReadsTotal}, ${summary.postReadsTotal},
      ${summary.estCostUsd}
    )
  `.pipe(Effect.asVoid, Effect.orDie)

export const lastRefresh = (db: DbClient): Effect.Effect<RefreshRow | undefined> =>
  Effect.gen(function* () {
    const rows = yield* db<RefreshRow>`
      SELECT id, captured_at, user_reads_charged, post_reads_charged,
             user_reads_total, post_reads_total, est_cost_usd
      FROM refreshes ORDER BY captured_at DESC LIMIT 1
    `.pipe(Effect.orDie)
    return rows[0]
  })

export interface CostBucket {
  readonly userReadsCharged: number
  readonly postReadsCharged: number
  readonly estCostUsd: number
  readonly refreshes: number
}

export const costSince = (db: DbClient, sinceMs: number): Effect.Effect<CostBucket> =>
  Effect.gen(function* () {
    const rows = yield* db<{
      n: number
      ur: number | null
      pr: number | null
      cost: number | null
    }>`
      SELECT
        COUNT(*) as n,
        SUM(user_reads_charged) as ur,
        SUM(post_reads_charged) as pr,
        SUM(est_cost_usd) as cost
      FROM refreshes
      WHERE captured_at >= ${sinceMs}
    `.pipe(Effect.orDie)
    const row = rows[0]
    return {
      refreshes: row?.n ?? 0,
      userReadsCharged: row?.ur ?? 0,
      postReadsCharged: row?.pr ?? 0,
      estCostUsd: row?.cost ?? 0
    }
  })

export interface DailyCostRow {
  readonly date: string
  readonly refreshes: number
  readonly userReadsCharged: number
  readonly postReadsCharged: number
  readonly estCostUsd: number
}

export const costByDay = (db: DbClient, sinceMs: number): Effect.Effect<ReadonlyArray<DailyCostRow>> =>
  Effect.gen(function* () {
    const rows = yield* db<{
      date: string
      n: number
      ur: number | null
      pr: number | null
      cost: number | null
    }>`
      SELECT
        date(captured_at / 1000, 'unixepoch', 'localtime') as date,
        COUNT(*) as n,
        SUM(user_reads_charged) as ur,
        SUM(post_reads_charged) as pr,
        SUM(est_cost_usd) as cost
      FROM refreshes
      WHERE captured_at >= ${sinceMs}
      GROUP BY date
      ORDER BY date DESC
    `.pipe(Effect.orDie)
    return rows.map((r) => ({
      date: r.date,
      refreshes: r.n,
      userReadsCharged: r.ur ?? 0,
      postReadsCharged: r.pr ?? 0,
      estCostUsd: r.cost ?? 0
    }))
  })

export const recordApiReads = (
  db: DbClient,
  kind: "user" | "post",
  ids: ReadonlyArray<string>,
  now: number,
  dedupWindowMs: number
): Effect.Effect<{ readonly charged: number; readonly total: number }> =>
  Effect.gen(function* () {
    if (ids.length === 0) return { charged: 0, total: 0 }
    const cutoff = now - dedupWindowMs
    const existingRows = yield* db<{ id: string }>`
      SELECT id FROM api_reads
      WHERE kind = ${kind}
        AND last_read_at >= ${cutoff}
        AND id IN ${db.in(ids as Array<string>)}
    `.pipe(Effect.orDie)
    const inWindow = new Set(existingRows.map((r) => r.id))
    yield* db
      .withTransaction(
        Effect.forEach(
          ids,
          (id) =>
            db`
            INSERT INTO api_reads (id, kind, last_read_at) VALUES (${id}, ${kind}, ${now})
            ON CONFLICT(kind, id) DO UPDATE SET last_read_at = excluded.last_read_at
          `.pipe(Effect.asVoid),
          { discard: true }
        )
      )
      .pipe(Effect.orDie)
    return { charged: ids.length - inWindow.size, total: ids.length }
  })

export const firstRefresh = (db: DbClient): Effect.Effect<RefreshRow | undefined> =>
  Effect.gen(function* () {
    const rows = yield* db<RefreshRow>`SELECT id, captured_at FROM refreshes ORDER BY captured_at ASC LIMIT 1`.pipe(
      Effect.orDie
    )
    return rows[0]
  })

export const listAccounts = (db: DbClient): Effect.Effect<ReadonlyArray<AccountRow>> =>
  db<AccountRow>`SELECT * FROM accounts`.pipe(Effect.orDie)

export const tweetsAcrossAccountsBetween = (
  db: DbClient,
  startMs: number,
  endMs: number
): Effect.Effect<ReadonlyArray<TweetRow>> =>
  db<TweetRow>`
    SELECT * FROM tweets
    WHERE created_at >= ${startMs} AND created_at < ${endMs}
    ORDER BY created_at DESC
  `.pipe(Effect.orDie)

export interface FollowerSampleRow {
  readonly captured_at: number
  readonly followers: number
}

/**
 * Bulk-fetch follower history for ALL accounts since `sinceMs`, returning a
 * Map keyed by account_id. Replaces N per-account queries with one SELECT.
 * Rows are sorted ascending by captured_at within each account.
 */
export const allFollowerHistorySince = (
  db: DbClient,
  sinceMs: number
): Effect.Effect<ReadonlyMap<string, ReadonlyArray<FollowerSampleRow>>> =>
  Effect.gen(function* () {
    const rows = yield* db<{ account_id: string; captured_at: number; followers: number }>`
      SELECT account_id, captured_at, followers FROM follower_history
      WHERE captured_at >= ${sinceMs}
      ORDER BY account_id ASC, captured_at ASC
    `.pipe(Effect.orDie)
    const map = new Map<string, Array<FollowerSampleRow>>()
    for (const row of rows) {
      let arr = map.get(row.account_id)
      if (!arr) {
        arr = []
        map.set(row.account_id, arr)
      }
      arr.push({ captured_at: row.captured_at, followers: row.followers })
    }
    return map
  })

/**
 * Bulk-fetch the earliest follower sample for each account (across all time).
 * Used to backfill `previousFollowers` when the lookback window pre-dates
 * the first captured sample.
 */
export const earliestFollowersAll = (db: DbClient): Effect.Effect<ReadonlyMap<string, number>> =>
  Effect.gen(function* () {
    const rows = yield* db<{ account_id: string; followers: number }>`
      SELECT account_id, followers FROM (
        SELECT account_id, followers, captured_at,
               ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY captured_at ASC) AS rn
        FROM follower_history
      ) WHERE rn = 1
    `.pipe(Effect.orDie)
    return new Map(rows.map((r) => [r.account_id, r.followers]))
  })
