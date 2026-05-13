import { FetchHttpClient } from "effect/unstable/http"
import * as Atom from "effect/unstable/reactivity/Atom"
import * as AtomHttpApi from "effect/unstable/reactivity/AtomHttpApi"
import { SnapshotApi } from "../api.ts"
import type { Selection } from "../selection.ts"
import type { SnapshotSource } from "./types.ts"

export class SnapshotApiClient extends AtomHttpApi.Service<SnapshotApiClient>()("SnapshotApiClient", {
  api: SnapshotApi,
  httpClient: FetchHttpClient.layer
}) {}

const queryKey = (selection: Selection): string =>
  selection.mode === "weekly" ? `weekly:${selection.weekOf ?? "latest"}` : `rolling:${selection.range}`

export const liveSource: SnapshotSource = (selectionAtom) =>
  Atom.make((get) => {
    const selection = get(selectionAtom)
    return get(
      SnapshotApiClient.query("snapshot", "getSnapshot", {
        query: { range: selection.range, mode: selection.mode, weekOf: selection.weekOf },
        serializationKey: queryKey(selection)
      })
    )
  })
