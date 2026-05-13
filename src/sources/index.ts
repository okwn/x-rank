import { fakeSource } from "./fake.ts"
import { liveSource } from "./live.ts"
import { staticSource } from "./static.ts"
import type { SnapshotSource } from "./types.ts"

export type { Snapshot, SnapshotAtom, SnapshotSource } from "./types.ts"
export { SnapshotApiClient } from "./live.ts"

export type SourceMode = "live" | "static" | "fake"

const sources: Record<SourceMode, SnapshotSource> = {
  live: liveSource,
  static: staticSource,
  fake: fakeSource
}

export const sourceFor = (mode: SourceMode): SnapshotSource => sources[mode]

export const resolveSourceMode = (envValue: string | undefined, useLive: string | undefined): SourceMode => {
  if (envValue === "live" || envValue === "static" || envValue === "fake") return envValue
  return useLive === "true" ? "live" : "fake"
}
