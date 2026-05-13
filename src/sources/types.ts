import type * as AsyncResult from "effect/unstable/reactivity/AsyncResult"
import type * as Atom from "effect/unstable/reactivity/Atom"
import type { Schema } from "effect"
import type { SocialMetricsSnapshot } from "../api.ts"
import type { Selection } from "../selection.ts"

export type Snapshot = Schema.Schema.Type<typeof SocialMetricsSnapshot>

export type SnapshotAtom = Atom.Atom<AsyncResult.AsyncResult<Snapshot, unknown>>

/** A SnapshotSource produces an Atom that reads from a Selection and emits the snapshot. */
export type SnapshotSource = (selectionAtom: Atom.Atom<Selection>) => SnapshotAtom
