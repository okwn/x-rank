import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { initials } from "../Avatar.tsx"
import { catchphraseFor } from "../catchphrases.ts"
import type { LeaderboardEntry, MetricCardModel } from "../model.ts"
import { formatMetric, formatNumber } from "../model.ts"
import { AccountModal } from "./AccountModal.tsx"
import { AccountIdentity, Hint, HINTS, RankBadge, Sparkline } from "./parts.tsx"

export function OverallLeaderboard({
  card,
  scoreLabel,
  scoreUnitLabel,
  scoreDescription
}: {
  readonly card: MetricCardModel
  readonly scoreLabel: string
  readonly scoreUnitLabel: string
  readonly scoreDescription: string
}) {
  const winner = card.entries[0]
  if (!winner) return null

  const winnerBg = winner.account.profileImageUrl?.replace("_normal", "_400x400")
  const winnerStyle = winnerBg ? { ["--winner-bg" as string]: `url(${winnerBg})` } : undefined
  const catchphrase = catchphraseFor(winner.account.handle)

  return (
    <section className="overall-card">
      <AccountModal account={winner.account} entry={winner}>
        <button
          className={winnerBg ? "winner winner-button" : "winner winner-button no-bg"}
          style={winnerStyle}
          type="button"
        >
          <div className="winner-photo">
            {winnerBg ? (
              <img alt={winner.account.name} src={winnerBg} />
            ) : (
              <div className="winner-photo-fallback" style={{ background: winner.account.color }}>
                {initials(winner.account.name)}
              </div>
            )}
            <span className="winner-rank-overlay">#1</span>
          </div>
          <span className="winner-identity">
            <span className="eyebrow">Leading this week</span>
            <span className="winner-name">{winner.account.name}</span>
            <span className="winner-meta">@{winner.account.handle}</span>
            {catchphrase && <span className="winner-catchphrase">{catchphrase}</span>}
          </span>
          <span className="winner-score">
            <strong>{formatMetric(winner.value, card.definition.unit)}</strong>
            <span>{scoreUnitLabel}</span>
          </span>
        </button>
      </AccountModal>
      <VersusPanel entries={card.entries} scoreLabel={scoreLabel} />
      <LeaderboardTable card={card} scoreLabel={scoreLabel} scoreDescription={scoreDescription} />
    </section>
  )
}

function LeaderboardTable({
  card,
  scoreLabel,
  scoreDescription
}: {
  readonly card: MetricCardModel
  readonly scoreLabel: string
  readonly scoreDescription: string
}) {
  const maxValue = Math.max(1, ...card.entries.map((entry) => entry.value))

  return (
    <div className="leaderboard-table">
      <div className="table-row table-head">
        <span>
          <Hint label={HINTS.rank}>Rank</Hint>
        </span>
        <span>Account</span>
        <span className="num-cell">
          <Hint label={scoreDescription}>{scoreLabel}</Hint>
        </span>
        <span>
          <Hint label="Daily engagement shape across the week — Mon to Sun, scaled to that account's max day.">7d</Hint>
        </span>
        <span className="num-cell">
          <Hint label={HINTS.impressions}>Impressions</Hint>
        </span>
        <span className="num-cell">
          <Hint label={HINTS.posts}>Posts</Hint>
        </span>
        <span className="num-cell">
          <Hint label={HINTS.rate}>Rate</Hint>
        </span>
      </div>
      {card.entries.map((entry) => {
        const { performance } = entry
        const noActivity = performance.stats.posts === 0
        return (
          <AccountModal account={entry.account} entry={entry} key={entry.account.id}>
            <button className="table-row table-row-button" type="button">
              <RankBadge entry={entry} />
              <AccountIdentity account={entry.account} />
              {noActivity ? (
                <span className="empty-row">No posts this week</span>
              ) : (
                <>
                  <span
                    className="num-cell engagement-cell"
                    style={{ ["--bar" as string]: `${(entry.value / maxValue) * 100}%` }}
                  >
                    <strong>{formatMetric(entry.value, card.definition.unit)}</strong>
                  </span>
                  <Sparkline values={entry.account.dailyEngagement} />
                  <span className="num-cell muted">{formatNumber(performance.stats.impressions)}</span>
                  <span className="num-cell muted">{formatNumber(performance.stats.posts)}</span>
                  <span className="num-cell muted">{formatMetric(performance.engagementRate, "percent")}</span>
                </>
              )}
            </button>
          </AccountModal>
        )
      })}
    </div>
  )
}

function VersusPanel({
  entries,
  scoreLabel
}: {
  readonly entries: ReadonlyArray<LeaderboardEntry>
  readonly scoreLabel: string
}) {
  if (entries.length < 3) return null
  const goliath = entries[0]
  const runnerUp = entries[1]
  const field = entries.slice(1).filter((e) => e.value > 0)
  if (!goliath || !runnerUp) return null

  const goliathValue = goliath.value
  const runnerValue = runnerUp.value
  if (goliathValue < runnerValue * 1.5 || goliathValue === 0) return null

  const fieldValue = field.reduce((sum, e) => sum + e.value, 0)
  const max = Math.max(goliathValue, fieldValue)
  const ahead = goliathValue > fieldValue
  const gap = Math.abs(goliathValue - fieldValue)
  const fieldPct = goliathValue > 0 ? Math.round((fieldValue / goliathValue) * 100) : 0
  const unit = scoreLabel.toLowerCase()

  return (
    <div className="versus">
      <div className="versus-header">
        <span className="eyebrow">vs the field · {scoreLabel}</span>
        <span className="versus-tagline">
          {ahead
            ? `the field is at ${fieldPct}% of @${goliath.account.handle}`
            : `the field has overtaken @${goliath.account.handle} by ${formatNumber(gap)}`}
        </span>
      </div>
      <div className="versus-row">
        <span className="versus-label">@{goliath.account.handle}</span>
        <div className="versus-track">
          <div
            className="versus-bar versus-goliath"
            style={{ width: `${(goliathValue / max) * 100}%`, background: goliath.account.color }}
          />
        </div>
        <span className="versus-value">{formatNumber(goliathValue)}</span>
      </div>
      <div className="versus-row">
        <span className="versus-label">{field.length} challengers</span>
        <div className="versus-track">
          <div className="versus-bar versus-field" style={{ width: `${(fieldValue / max) * 100}%` }}>
            {field.map((e) => (
              <TooltipPrimitive.Root delayDuration={80} key={e.account.id}>
                <TooltipPrimitive.Trigger asChild>
                  <span
                    aria-label={`@${e.account.handle}: ${formatNumber(e.value)}`}
                    className="versus-segment"
                    style={{
                      width: `${(e.value / fieldValue) * 100}%`,
                      background: e.account.color
                    }}
                  />
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                  <TooltipPrimitive.Content className="hint-content" side="top" sideOffset={6}>
                    @{e.account.handle} · {formatNumber(e.value)} {unit}
                    <TooltipPrimitive.Arrow className="hint-arrow" />
                  </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
              </TooltipPrimitive.Root>
            ))}
          </div>
        </div>
        <span className="versus-value">{formatNumber(fieldValue)}</span>
      </div>
    </div>
  )
}
