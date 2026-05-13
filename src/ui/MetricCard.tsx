import type { MetricCardModel } from "../model.ts"
import { formatMetric } from "../model.ts"
import { AccountModal } from "./AccountModal.tsx"
import { AccountIdentity, Hint, RankBadge } from "./parts.tsx"

export function MetricCard({
  card,
  expanded,
  onToggle
}: {
  readonly card: MetricCardModel
  readonly expanded: boolean
  readonly onToggle: () => void
}) {
  const entries = expanded ? card.entries : card.entries.slice(0, 5)

  return (
    <article className="metric-card">
      <header>
        <h3>
          <Hint label={card.definition.description}>{card.definition.label}</Hint>
        </h3>
        <button type="button" onClick={onToggle}>
          {expanded ? "Less" : "All"}
        </button>
      </header>
      {card.subnote && <p className="metric-subnote">{card.subnote}</p>}
      <div className="mini-list">
        {entries.map((entry) => (
          <AccountModal account={entry.account} entry={entry} key={entry.account.id}>
            <button className="mini-row mini-row-button" type="button">
              <RankBadge entry={entry} />
              <AccountIdentity account={entry.account} compact />
              <strong>{formatMetric(entry.value, card.definition.unit)}</strong>
            </button>
          </AccountModal>
        ))}
      </div>
    </article>
  )
}
