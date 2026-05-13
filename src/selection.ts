import { Option, Schema } from "effect"
import * as Atom from "effect/unstable/reactivity/Atom"
import { DateRange, RangeMode, ScoreMetric } from "./api.ts"
import { buildWindow, isoWeekOf, recentWeeks, weekStartUtc, type WeekChoice, type WindowSpec } from "./metrics.ts"

const rangeParam = Atom.searchParam("range", { schema: DateRange })
const modeParam = Atom.searchParam("mode", { schema: RangeMode })
const weekOfParam = Atom.searchParam("weekOf", { schema: Schema.String })
const scoreParam = Atom.searchParam("score", { schema: ScoreMetric })

export const rangeAtom = Atom.writable(
  (get) => Option.getOrElse(get(rangeParam), () => "7d" as const),
  (ctx, range: DateRange) => {
    ctx.set(modeParam, Option.some("rolling"))
    ctx.set(rangeParam, Option.some(range))
  }
)

export const modeAtom = Atom.writable(
  (get) => Option.getOrElse(get(modeParam), () => "rolling" as const),
  (ctx, mode: RangeMode) => ctx.set(modeParam, Option.some(mode))
)

export const weekOfAtom = Atom.writable(
  (get) => Option.getOrUndefined(get(weekOfParam)),
  (ctx, weekOf: string | undefined) => {
    ctx.set(modeParam, Option.some("weekly"))
    ctx.set(weekOfParam, weekOf ? Option.some(weekOf) : Option.none())
  }
)

export const scoreAtom = Atom.writable(
  (get) => Option.getOrElse(get(scoreParam), () => "engagements" as const),
  (ctx, score: ScoreMetric) => ctx.set(scoreParam, Option.some(score))
)

export interface Selection {
  readonly mode: RangeMode
  readonly range: DateRange
  readonly weekOf: string | undefined
  readonly score: ScoreMetric
}

export const selectionAtom: Atom.Atom<Selection> = Atom.make((get) => ({
  mode: get(modeAtom),
  range: get(rangeAtom),
  weekOf: get(weekOfAtom),
  score: get(scoreAtom)
}))

export interface SelectionView extends Selection {
  readonly window: WindowSpec
  readonly weekChoices: ReadonlyArray<WeekChoice>
  readonly currentWeekIso: string
  readonly defaultWeekIso: string
  readonly selectedWeekIso: string
}

const WEEKLY_LOOKBACK = 6

export const selectionViewFor = (selection: Selection, capturedAtMs: number): SelectionView => {
  const weekChoices = recentWeeks(capturedAtMs, WEEKLY_LOOKBACK)
  const currentWeekIso = isoWeekOf(weekStartUtc(capturedAtMs))
  const defaultWeekIso = weekChoices[1]?.iso ?? weekChoices[0]?.iso ?? currentWeekIso
  const window = buildWindow(selection.mode, selection.range, selection.weekOf, capturedAtMs)
  return {
    ...selection,
    window,
    weekChoices,
    currentWeekIso,
    defaultWeekIso,
    selectedWeekIso: selection.weekOf ?? defaultWeekIso
  }
}
