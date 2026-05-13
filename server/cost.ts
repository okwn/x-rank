import { Context, Effect, Layer, Ref } from "effect"
import { Db, recordApiReads, type RefreshSummary } from "./db.ts"

// X API pay-per-use estimate. Check console.x.com for the current rate card.
// 24-hour rolling dedup: re-reading the same id within the window is free.
export const PRICE_PER_USER_READ_USD = 0.01
export const PRICE_PER_POST_READ_USD = 0.005
export const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000

export interface CostMeter {
  readonly recordUsers: (ids: ReadonlyArray<string>) => Effect.Effect<void>
  readonly recordPosts: (ids: ReadonlyArray<string>) => Effect.Effect<void>
  readonly snapshot: () => Effect.Effect<RefreshSummary>
  readonly reset: () => Effect.Effect<void>
}

export class CostTracker extends Context.Service<CostTracker, CostMeter>()("@x-rank/CostTracker") {}

interface State {
  readonly userReadsCharged: number
  readonly userReadsTotal: number
  readonly postReadsCharged: number
  readonly postReadsTotal: number
}

const ZERO: State = {
  userReadsCharged: 0,
  userReadsTotal: 0,
  postReadsCharged: 0,
  postReadsTotal: 0
}

const stateToSummary = (s: State): RefreshSummary => ({
  userReadsCharged: s.userReadsCharged,
  postReadsCharged: s.postReadsCharged,
  userReadsTotal: s.userReadsTotal,
  postReadsTotal: s.postReadsTotal,
  estCostUsd: s.userReadsCharged * PRICE_PER_USER_READ_USD + s.postReadsCharged * PRICE_PER_POST_READ_USD
})

const make = Effect.gen(function* () {
  const db = yield* Db
  const ref = yield* Ref.make<State>(ZERO)

  const record = (kind: "user" | "post", ids: ReadonlyArray<string>) =>
    Effect.gen(function* () {
      const { charged, total } = yield* recordApiReads(db, kind, ids, Date.now(), DEDUP_WINDOW_MS)
      yield* Ref.update(ref, (s) =>
        kind === "user"
          ? {
              ...s,
              userReadsCharged: s.userReadsCharged + charged,
              userReadsTotal: s.userReadsTotal + total
            }
          : {
              ...s,
              postReadsCharged: s.postReadsCharged + charged,
              postReadsTotal: s.postReadsTotal + total
            }
      )
    })

  return CostTracker.of({
    recordUsers: (ids) => record("user", ids),
    recordPosts: (ids) => record("post", ids),
    snapshot: () => Ref.get(ref).pipe(Effect.map(stateToSummary)),
    reset: () => Ref.set(ref, ZERO)
  })
})

export const CostTrackerLive: Layer.Layer<CostTracker, never, Db> = Layer.effect(CostTracker, make)

export const formatUsd = (n: number) => `$${n.toFixed(n < 1 ? 3 : 2)}`
