import type { TrendPoint } from "../data.ts"
import { formatNumber } from "../model.ts"

export function TrendChart({ trend }: { readonly trend: ReadonlyArray<TrendPoint> }) {
  const max = Math.max(1, ...trend.map((item) => item.engagements))

  return (
    <div className="trend-grid">
      {trend.map((item) => (
        <div className="trend-columnn" key={item.label}>
          <div className="bar-wrap">
            <div className="bar engagements" style={{ height: `${Math.max(2, (item.engagements / max) * 100)}%` }} />
          </div>
          <strong>{item.label}</strong>
          <span>{formatNumber(item.engagements)} eng</span>
          <small>{item.posts} posts</small>
        </div>
      ))}
    </div>
  )
}
