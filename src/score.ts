import type { Account, ScoreMetric } from "./api.ts"
import type { MetricSnapshot } from "./model.ts"

export interface ScoreDefinition {
  readonly key: ScoreMetric
  readonly label: string
  readonly unit: string
  readonly description: string
  readonly value: (snapshot: MetricSnapshot, account: Account) => number
}

export const scores: Record<ScoreMetric, ScoreDefinition> = {
  engagements: {
    key: "engagements",
    label: "Engagements",
    unit: "total engagements",
    description: "Total likes, replies, reposts, quotes, and bookmarks",
    value: ({ engagements }) => engagements
  },
  impressions: {
    key: "impressions",
    label: "Impressions",
    unit: "total impressions",
    description: "Total impressions (views) across all posts in the window",
    value: ({ stats }) => stats.impressions
  },
  jay: {
    key: "jay",
    label: "JAY",
    unit: "name-width score",
    description:
      "Ranked by the width (character count) of the account's display name — shorter names rule. ¯\\_(ツ)_/¯",
    value: (_, account) => Math.max(0, 100 - account.name.length)
  }
}

export const scoreFor = (key: ScoreMetric): ScoreDefinition => scores[key]
