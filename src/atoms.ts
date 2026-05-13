import { DateTime } from "effect"
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult"
import * as Atom from "effect/unstable/reactivity/Atom"
import { selectionAtom, selectionViewFor } from "./selection.ts"
import { buildDashboard, type MetricKey } from "./model.ts"
import { resolveSourceMode, sourceFor, type SnapshotAtom } from "./sources/index.ts"

export { modeAtom, rangeAtom, scoreAtom, selectionAtom, weekOfAtom } from "./selection.ts"
export type { Selection, SelectionView } from "./selection.ts"
export { SnapshotApiClient } from "./sources/index.ts"

export const expandedCardsAtom = Atom.make<ReadonlySet<MetricKey>>(new Set<MetricKey>())

const sourceMode = resolveSourceMode(import.meta.env.VITE_MODE, import.meta.env.VITE_USE_LIVE)

export const snapshotAtom: SnapshotAtom = sourceFor(sourceMode)(selectionAtom)

export const dashboardAtom = Atom.make((get) =>
  AsyncResult.map(get(snapshotAtom), (snapshot) => {
    const view = selectionViewFor(get(selectionAtom), DateTime.toEpochMillis(snapshot.capturedAt))
    return buildDashboard(snapshot, view)
  })
)
