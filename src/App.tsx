import { useAtom, useAtomSuspense } from "@effect/atom-react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { dashboardAtom, expandedCardsAtom } from "./atoms.ts"
import { FunZone } from "./FunZone.tsx"
import type { MetricKey } from "./model.ts"
import { OverallLeaderboard } from "./ui/Leaderboard.tsx"
import { MetricCard } from "./ui/MetricCard.tsx"
import { JayDancer, RangeControls } from "./ui/RangeControls.tsx"
import { SectionHeading } from "./ui/parts.tsx"
import { TopPostCard } from "./ui/TopPostCard.tsx"
import { TrendChart } from "./ui/TrendChart.tsx"
import xrankConfig from "../xrank.config.ts"

export function App() {
  const [expandedCards, setExpandedCards] = useAtom(expandedCardsAtom)
  const dashboard = useAtomSuspense(dashboardAtom).value
  const jayMode = dashboard.score === "jay"
  const overall = dashboard.metrics.find((metric) => metric.definition.key === "overall")
  const secondaryCards = dashboard.metrics.filter((metric) => metric.definition.key !== "overall")

  const toggleExpanded = (key: MetricKey) => {
    setExpandedCards((current) => {
      const next = new Set(current)
      if (!next.delete(key)) next.add(key)
      return next
    })
  }

  return (
    <TooltipPrimitive.Provider delayDuration={120} skipDelayDuration={300}>
      <main className="app-shell">
        <section className="hero-panel">
          <div className="hero-copy">
            <p className="eyebrow">X leaderboard · {dashboard.rangeLabel}</p>
            <h1>{xrankConfig.title ?? "X Rank"}</h1>
          </div>
          <div className="sync-card">
            <strong>
              {dashboard.visibleAccounts}/{dashboard.totalAccounts} accounts
            </strong>
            <small>{dashboard.capturedAtLabel}</small>
            <small>{dashboard.coverageLabel}</small>
          </div>
        </section>

        <RangeControls dashboard={dashboard} />
        {jayMode && <JayDancer />}

        <section className="summary-grid" aria-label={`${dashboard.rangeLabel} summary`}>
          {dashboard.summary.map((stat) => (
            <article className="summary-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <small className={stat.tone}>{stat.delta}</small>
            </article>
          ))}
        </section>

        {overall && (
          <OverallLeaderboard
            card={overall}
            scoreLabel={dashboard.scoreLabel}
            scoreUnitLabel={dashboard.scoreUnitLabel}
            scoreDescription={dashboard.scoreDescription}
          />
        )}

        <SectionHeading title="By metric" />

        <section className="metric-grid">
          {secondaryCards.map((card) => (
            <MetricCard
              card={card}
              expanded={expandedCards.has(card.definition.key)}
              key={card.definition.key}
              onToggle={() => toggleExpanded(card.definition.key)}
            />
          ))}
        </section>

        <SectionHeading title="Top posts" />

        <section className="top-posts">
          {dashboard.topPosts.slice(0, 9).map(({ account, post }, index) => (
            <TopPostCard account={account} hero={index === 0} key={`${account.id}:${post.url}`} topPost={post} />
          ))}
        </section>

        <SectionHeading title="Activity" />

        <section className="chart-panel">
          <TrendChart trend={dashboard.trend} />
        </section>

        <FunZone accounts={dashboard.accounts} />
      </main>
    </TooltipPrimitive.Provider>
  )
}
