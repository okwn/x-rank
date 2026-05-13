import { useAtom } from "@effect/atom-react"
import type { DateRange, ScoreMetric } from "../api.ts"
import { modeAtom, rangeAtom, scoreAtom, weekOfAtom } from "../atoms.ts"
import { ranges } from "../metrics.ts"
import type { DashboardModel } from "../model.ts"

export function RangeControls({ dashboard }: { readonly dashboard: DashboardModel }) {
  const [mode, setMode] = useAtom(modeAtom)
  const [range, setRange] = useAtom(rangeAtom)
  const [, setWeekOf] = useAtom(weekOfAtom)
  const [score, setScore] = useAtom(scoreAtom)
  const { weekChoices, currentWeekIso, selectedWeekIso, inProgress } = dashboard

  return (
    <section className="range-controls">
      <div className="range-modes" role="tablist" aria-label="Range mode">
        <ModeButton active={mode === "rolling"} label="Rolling" onClick={() => setMode("rolling")} />
        <ModeButton active={mode === "weekly"} label="Weekly (Sun–Sun)" onClick={() => setMode("weekly")} />
      </div>
      {mode === "rolling" ? (
        <div className="range-chips" role="tablist" aria-label="Rolling window">
          {ranges.map((r) => (
            <ChipButton
              active={range === r.id}
              key={r.id}
              label={r.label}
              onClick={() => setRange(r.id as DateRange)}
            />
          ))}
        </div>
      ) : (
        <div className="range-chips weekly" role="tablist" aria-label="Week">
          {weekChoices.map((w) => {
            const selected = selectedWeekIso === w.iso
            const isCurrent = w.iso === currentWeekIso
            const label = isCurrent ? `${w.label} (in progress)` : `Week of ${w.label}`
            return isCurrent ? (
              <ChipButton active={selected} key={w.iso} label={label} onClick={() => setWeekOf(w.iso)} tone="partial" />
            ) : (
              <ChipButton active={selected} key={w.iso} label={label} onClick={() => setWeekOf(w.iso)} />
            )
          })}
        </div>
      )}
      {mode === "weekly" && inProgress && (
        <p className="range-note">This week is still in progress; comparisons against prior weeks are partial.</p>
      )}
      <div className="range-divider" aria-hidden="true" />
      <div className="range-modes" role="tablist" aria-label="Score">
        <ModeButton active={score === "engagements"} label="Engagements" onClick={() => setScore("engagements")} />
        <ModeButton active={score === "impressions"} label="Impressions" onClick={() => setScore("impressions")} />
        <ModeButton active={score === "jay"} label="JAY" onClick={() => setScore("jay" as ScoreMetric)} />
      </div>
    </section>
  )
}

export function JayDancer() {
  return (
    <div className="jay-dancer" aria-hidden="true">
      <div className="jay-face">
        <img
          alt=""
          src="/jay.png"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = "none"
          }}
        />
        <span className="jay-fallback">JAY</span>
      </div>
    </div>
  )
}

function ModeButton({
  active,
  label,
  onClick
}: {
  readonly active: boolean
  readonly label: string
  readonly onClick: () => void
}) {
  return (
    <button
      aria-pressed={active}
      className={active ? "mode-btn active" : "mode-btn"}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {label}
    </button>
  )
}

function ChipButton({
  active,
  label,
  onClick,
  tone
}: {
  readonly active: boolean
  readonly label: string
  readonly onClick: () => void
  readonly tone?: "partial"
}) {
  const cls = ["chip-btn", active ? "active" : "", tone ? `tone-${tone}` : ""].filter(Boolean).join(" ")
  return (
    <button aria-pressed={active} className={cls} onClick={onClick} role="tab" type="button">
      {label}
    </button>
  )
}
