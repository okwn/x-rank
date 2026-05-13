import { DateTime } from "effect"
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult"
import * as Atom from "effect/unstable/reactivity/Atom"
import { accounts, trend } from "../data.ts"
import type { SnapshotSource } from "./types.ts"
import type { Snapshot } from "./types.ts"

const fakeSnapshot: Snapshot = {
  accounts,
  trend,
  source: "fake",
  capturedAt: DateTime.makeUnsafe("2026-05-01T13:42:00.000Z"),
  dataSince: DateTime.makeUnsafe("2026-01-01T13:42:00.000Z"),
  followerDataSince: DateTime.makeUnsafe("2026-04-29T13:42:00.000Z")
}

export const fakeSource: SnapshotSource = () => Atom.make(() => AsyncResult.success(fakeSnapshot))
