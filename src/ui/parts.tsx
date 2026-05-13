import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import type { ReactNode } from "react"
import { Avatar } from "../Avatar.tsx"
import type { Account } from "../data.ts"
import type { LeaderboardEntry } from "../model.ts"

export function Hint({ children, label }: { readonly children: ReactNode; readonly label: string }) {
  return (
    <TooltipPrimitive.Root delayDuration={120}>
      <TooltipPrimitive.Trigger asChild>
        <span className="hint">{children}</span>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content className="hint-content" side="top" sideOffset={6}>
          {label}
          <TooltipPrimitive.Arrow className="hint-arrow" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

export const HINTS = {
  engagements: "Likes + replies + reposts + quotes + bookmarks. Sum of public reactions.",
  impressions: "Views — how many times the post showed up on a timeline.",
  posts: "Number of original posts (excludes retweets and replies).",
  rate: "Engagement rate: engagements ÷ impressions.",
  growth: "Net follower change since the previous refresh window.",
  reach: "Total impressions across all of the user's posts.",
  conversation: "Replies + quotes — posts where people wrote something back.",
  consistency: "Days within the window that the user posted at least once.",
  perPost: "Average engagements per post — surfaces low-volume high-impact accounts.",
  rank: "Tied scores share a rank. Dash = no activity to rank.",
  overall: "Total likes, replies, reposts, quotes, and bookmarks."
} as const satisfies Record<string, string>

export function SectionHeading({ title }: { readonly title: string }) {
  return (
    <div className="section-heading" role="separator" aria-label={title}>
      <h2>{title}</h2>
    </div>
  )
}

export function AccountIdentity({
  account,
  compact = false
}: {
  readonly account: Account
  readonly compact?: boolean
}) {
  return (
    <div className={compact ? "account-identity compact" : "account-identity"}>
      <Avatar account={account} />
      <div>
        <strong>{account.name}</strong>
        <span>@{account.handle}</span>
      </div>
    </div>
  )
}

export function RankBadge({ entry }: { readonly entry: LeaderboardEntry }) {
  if (entry.value === 0) {
    return (
      <div className="rank-cell rank-empty">
        <strong>—</strong>
      </div>
    )
  }
  const change = entry.rankChange
  const showChange = change !== 0
  const direction = change === "new" || change === 0 ? "flat" : change > 0 ? "up" : "down"
  const label = change === "new" ? "new" : change === 0 ? "" : `${change > 0 ? "↑" : "↓"}${Math.abs(change)}`

  return (
    <div className="rank-cell">
      <strong>#{entry.rank}</strong>
      {showChange && <span className={direction}>{label}</span>}
    </div>
  )
}

const SPARKLINE_BLOCKS = "▁▂▃▄▅▆▇█"

export function Sparkline({ values }: { readonly values: ReadonlyArray<number> }) {
  if (values.length === 0) return <span className="sparkline" />
  const max = Math.max(...values)
  const chars = values
    .map((v) => {
      if (max === 0) return SPARKLINE_BLOCKS[0]
      const idx = Math.round((v / max) * (SPARKLINE_BLOCKS.length - 1))
      return SPARKLINE_BLOCKS[idx]
    })
    .join("")
  return (
    <span className="sparkline" aria-hidden="true">
      {chars}
    </span>
  )
}
