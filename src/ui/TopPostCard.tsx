import type { Account, TopPost } from "../data.ts"
import { formatNumber, totalEngagements } from "../model.ts"
import { AccountIdentity } from "./parts.tsx"

export function TopPostCard({
  account,
  hero,
  topPost
}: {
  readonly account: Account
  readonly hero: boolean
  readonly topPost: TopPost
}) {
  const className = hero ? "post-card hero" : "post-card"
  const content = (
    <>
      <AccountIdentity account={account} compact />
      <p>{topPost.text}</p>
      <div className="post-stats">
        <span>{topPost.createdAt}</span>
        <strong>{formatNumber(totalEngagements(topPost.stats))} engagements</strong>
        <span>{formatNumber(topPost.stats.impressions)} impressions</span>
      </div>
    </>
  )

  if (!topPost.url) return <article className={className}>{content}</article>

  return (
    <a
      aria-label={`Open ${account.name}'s top post on X`}
      className={className}
      href={topPost.url}
      rel="noreferrer"
      target="_blank"
    >
      {content}
    </a>
  )
}
