import { Effect, Schema } from "effect"
import * as Atom from "effect/unstable/reactivity/Atom"
import { type DateRange, SocialMetricsSnapshot } from "../api.ts"
import type { Selection } from "../selection.ts"
import type { SnapshotSource } from "./types.ts"

interface StaticManifest {
  readonly capturedAt: string
  readonly rolling: ReadonlyArray<DateRange>
  readonly weeks: ReadonlyArray<{ readonly iso: string; readonly inProgress: boolean }>
  readonly defaultWeekIso: string
}

const decodeSnapshot = Schema.decodeUnknownEffect(SocialMetricsSnapshot)

const fetchJson = (url: string) =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`${url} ${response.status}`)
      return await response.json()
    },
    catch: (cause) => new Error(`failed to load ${url}: ${cause}`)
  })

const fetchManifest: Effect.Effect<StaticManifest | undefined, never> = fetchJson("/snapshots/manifest.json").pipe(
  Effect.map((value) => value as StaticManifest),
  Effect.catch(() => Effect.succeed<StaticManifest | undefined>(undefined))
)

const snapshotUrl = (manifest: StaticManifest | undefined, selection: Selection): string => {
  if (!manifest) return "/snapshot.json"
  if (selection.mode === "weekly") {
    const iso = selection.weekOf ?? manifest.defaultWeekIso
    const known = manifest.weeks.find((w) => w.iso === iso) ?? manifest.weeks[1] ?? manifest.weeks[0]
    return `/snapshots/weekly-${known?.iso ?? manifest.defaultWeekIso}.json`
  }
  return `/snapshots/rolling-${selection.range}.json`
}

export const staticSource: SnapshotSource = (selectionAtom) =>
  Atom.make((get) => {
    const selection = get(selectionAtom)
    return Effect.flatMap(fetchManifest, (manifest) =>
      fetchJson(snapshotUrl(manifest, selection)).pipe(Effect.flatMap(decodeSnapshot))
    )
  })
