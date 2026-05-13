import { Config, Context, Duration, Layer, Option } from "effect"
import userConfig from "../xrank.config.ts"
import type { RosterEntry, XRankConfig } from "../src/xrank-config.ts"
import { normalizeHandle } from "./handles.ts"

export interface AccountConfig {
  readonly handle: string
  readonly team: string
  readonly color: string
}

const palette = [
  "#34d399",
  "#7c3aed",
  "#111827",
  "#0f766e",
  "#0891b2",
  "#2563eb",
  "#4f46e5",
  "#9333ea",
  "#16a34a",
  "#db2777",
  "#ea580c",
  "#be123c",
  "#06b6d4",
  "#ca8a04",
  "#84cc16",
  "#f97316",
  "#6366f1",
  "#14b8a6",
  "#f43f5e",
  "#a855f7"
] as const

const colorForHandle = (handle: string) => {
  let hash = 0
  for (const char of normalizeHandle(handle)) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return palette[Math.abs(hash) % palette.length]
}

export const xrankConfig: XRankConfig = userConfig
export const roster: ReadonlyArray<RosterEntry> = xrankConfig.roster

const normalizeRoster = (entries: ReadonlyArray<RosterEntry>): ReadonlyArray<AccountConfig> => {
  const seen = new Set<string>()
  return entries.map((entry) => {
    const handle = normalizeHandle(entry.handle)
    if (!handle) throw new Error("x-rank roster contains an empty handle")
    if (seen.has(handle)) throw new Error(`x-rank roster contains duplicate handle: ${handle}`)
    seen.add(handle)
    if (entry.color && !/^#[0-9a-fA-F]{6}$/.test(entry.color)) {
      throw new Error(`x-rank roster color for ${handle} must be a 6-digit hex value like #7c3aed`)
    }
    return {
      handle,
      team: entry.team ?? "People",
      color: entry.color ?? colorForHandle(handle)
    }
  })
}

export const accountConfigs: ReadonlyArray<AccountConfig> = normalizeRoster(roster)

export interface ServerConfig {
  readonly port: number
  readonly bearerToken: string | undefined
  readonly dbPath: string
  readonly refreshInterval: Duration.Duration
  readonly enableRefreshDaemon: boolean
}

export class AppConfig extends Context.Service<AppConfig, ServerConfig>()("@x-rank/AppConfig") {}

export const loadConfig = Config.all({
  port: Config.port("PORT").pipe(Config.withDefault(3000)),
  bearerToken: Config.option(Config.nonEmptyString("X_BEARER_TOKEN")).pipe(Config.map(Option.getOrUndefined)),
  dbPath: Config.nonEmptyString("X_RANK_DB").pipe(Config.withDefault("./data/snapshots.db")),
  refreshInterval: Config.duration("REFRESH_INTERVAL").pipe(
    Config.orElse(() => Config.number("REFRESH_INTERVAL_MS").pipe(Config.map(Duration.millis))),
    Config.withDefault(Duration.hours(1))
  ),
  enableRefreshDaemon: Config.boolean("ENABLE_REFRESH_DAEMON").pipe(Config.withDefault(false))
})

export const AppConfigLive = Layer.effect(AppConfig, loadConfig.asEffect())

export const accountByHandle = new Map(accountConfigs.map((cfg) => [normalizeHandle(cfg.handle), cfg]))
