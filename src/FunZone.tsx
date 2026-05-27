import * as DialogPrimitive from "@radix-ui/react-dialog"
import {
  BarChart3,
  CalendarDays,
  Clock4,
  Eye,
  Fingerprint,
  Hash,
  Heart,
  Layers,
  MessageCircle,
  Newspaper,
  Repeat2,
  Sparkles,
  Tag,
  TrendingUp,
  Type,
  Zap
} from "lucide-react"
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react"
import { Avatar } from "./Avatar.tsx"
import type { Account, TopPost } from "./data.ts"
import { flattenPosts, formatNumber, totalEngagements, type PostItem } from "./model.ts"

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

const sum = (xs: ReadonlyArray<number>) => xs.reduce((s, n) => s + n, 0)

const formatHour = (h: number) => {
  if (h === 0) return "12am"
  if (h === 12) return "12pm"
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

function FunSection({
  title,
  description,
  icon: Icon,
  children
}: {
  readonly title: string
  readonly description: string
  readonly icon: ComponentType<{ readonly size?: number; readonly strokeWidth?: number }>
  readonly children: ReactNode
}) {
  return (
    <section className="fun-section">
      <header className="fun-header">
        <div className="fun-title">
          <Icon size={16} strokeWidth={1.6} />
          <h3>{title}</h3>
        </div>
        <p>{description}</p>
      </header>
      {children}
    </section>
  )
}

const feedDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York"
})

function FeedStat({
  icon: Icon,
  value,
  label
}: {
  readonly icon: ComponentType<{ readonly size?: number; readonly strokeWidth?: number }>
  readonly value: number
  readonly label: string
}) {
  return (
    <span className="feed-stat" title={label}>
      <Icon size={13} strokeWidth={1.7} />
      <span>{formatNumber(value)}</span>
    </span>
  )
}

function CalendarHeatmap({ accounts }: { readonly accounts: ReadonlyArray<Account> }) {
  const ranked = useMemo(() => accounts.toSorted((a, b) => sum(b.dailyEngagement) - sum(a.dailyEngagement)), [accounts])
  const globalMax = useMemo(() => Math.max(1, ...accounts.flatMap((a) => a.dailyEngagement)), [accounts])

  return (
    <div className="cal-heatmap">
      <div className="cal-heatmap-head">
        <span />
        {DAY_LABELS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      {ranked.map((account) => (
        <div className="cal-heatmap-row" key={account.id}>
          <span className="cal-heatmap-name" title={account.name}>
            @{account.handle}
          </span>
          {account.dailyEngagement.map((value, idx) => {
            const intensity = value / globalMax
            const day = DAY_LABELS[idx] ?? "?"
            return (
              <span
                aria-label={`${account.name} ${day}: ${formatNumber(value)} eng`}
                className="cal-heatmap-cell"
                key={day}
                style={{
                  background: account.color,
                  opacity: intensity === 0 ? 0.04 : 0.18 + intensity * 0.82
                }}
                title={`${day} · ${formatNumber(value)} eng`}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

const CLOCK_SIZE = 320
const CLOCK_INNER_R = 50
const CLOCK_OUTER_R = 130

function RhythmClock({ accounts }: { readonly accounts: ReadonlyArray<Account> }) {
  const aggregate = useMemo(() => {
    const buckets = Array.from({ length: 24 }, () => 0)
    for (const a of accounts) {
      a.hourlyEngagement.forEach((v, h) => {
        buckets[h] += v
      })
    }
    return buckets
  }, [accounts])

  const max = Math.max(1, ...aggregate)
  const peakHour = aggregate.indexOf(max)
  const cx = CLOCK_SIZE / 2
  const cy = CLOCK_SIZE / 2
  const innerR = CLOCK_INNER_R
  const outerR = CLOCK_OUTER_R

  return (
    <div className="clock-wrap">
      <svg viewBox={`0 0 ${CLOCK_SIZE} ${CLOCK_SIZE}`} width={CLOCK_SIZE} height={CLOCK_SIZE}>
        <circle cx={cx} cy={cy} r={outerR + 6} fill="none" stroke="rgba(255,255,255,0.06)" />
        <circle cx={cx} cy={cy} r={innerR - 6} fill="none" stroke="rgba(255,255,255,0.08)" />
        {aggregate.map((value, hour) => {
          const angleStart = (hour / 24) * Math.PI * 2 - Math.PI / 2
          const angleEnd = ((hour + 1) / 24) * Math.PI * 2 - Math.PI / 2
          const r = innerR + (value / max) * (outerR - innerR)
          const x1 = cx + innerR * Math.cos(angleStart)
          const y1 = cy + innerR * Math.sin(angleStart)
          const x2 = cx + r * Math.cos(angleStart)
          const y2 = cy + r * Math.sin(angleStart)
          const x3 = cx + r * Math.cos(angleEnd)
          const y3 = cy + r * Math.sin(angleEnd)
          const x4 = cx + innerR * Math.cos(angleEnd)
          const y4 = cy + innerR * Math.sin(angleEnd)
          return (
            <path
              key={hour}
              d={`M ${x1} ${y1} L ${x2} ${y2} A ${r} ${r} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerR} ${innerR} 0 0 0 ${x1} ${y1} Z`}
              fill={hour === peakHour ? "var(--accent)" : "rgba(52, 211, 153, 0.55)"}
              stroke="#000"
              strokeWidth={1}
            >
              <title>{`${formatHour(hour)} — ${formatNumber(value)} eng`}</title>
            </path>
          )
        })}
        {[0, 6, 12, 18].map((hour) => {
          const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2
          const x = cx + (outerR + 22) * Math.cos(angle)
          const y = cy + (outerR + 22) * Math.sin(angle)
          return (
            <text
              key={hour}
              x={x}
              y={y}
              fill="rgba(255,255,255,0.4)"
              fontSize="11"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {formatHour(hour)}
            </text>
          )
        })}
        <text x={cx} y={cy - 6} fill="var(--text)" fontSize="14" fontWeight="600" textAnchor="middle">
          peak
        </text>
        <text x={cx} y={cy + 14} fill="var(--accent)" fontSize="18" fontWeight="700" textAnchor="middle">
          {formatHour(peakHour)}
        </text>
      </svg>
      <p className="clock-caption">
        Engagement by hour of day. This roster peaks at <strong>{formatHour(peakHour)}</strong>.
      </p>
    </div>
  )
}

const BUBBLE_W = 720
const BUBBLE_H = 380
const BUBBLE_PAD = { top: 28, right: 60, bottom: 40, left: 56 } as const

function FollowersBubble({ accounts }: { readonly accounts: ReadonlyArray<Account> }) {
  const points = accounts.filter((a) => a.followers > 0)
  const innerW = BUBBLE_W - BUBBLE_PAD.left - BUBBLE_PAD.right
  const innerH = BUBBLE_H - BUBBLE_PAD.top - BUBBLE_PAD.bottom

  if (points.length === 0) return null

  const engOf = (a: Account) => Math.max(1, sum(a.posts.map((p) => totalEngagements(p.stats))))
  const minF = Math.log10(Math.max(100, Math.min(...points.map((a) => a.followers))))
  const maxF = Math.log10(Math.max(...points.map((a) => a.followers)))
  const minE = Math.log10(Math.min(...points.map(engOf)))
  const maxE = Math.log10(Math.max(2, Math.max(...points.map(engOf))))
  const maxPosts = Math.max(1, ...points.map((a) => a.stats.posts))

  const xScale = (followers: number) =>
    BUBBLE_PAD.left + ((Math.log10(Math.max(1, followers)) - minF) / (maxF - minF || 1)) * innerW
  const yScale = (eng: number) =>
    BUBBLE_PAD.top + innerH - ((Math.log10(Math.max(1, eng)) - minE) / (maxE - minE || 1)) * innerH
  const rScale = (posts: number) => 6 + Math.sqrt(posts / maxPosts) * 18

  return (
    <div className="bubble-wrap">
      <svg viewBox={`0 0 ${BUBBLE_W} ${BUBBLE_H}`} width="100%" preserveAspectRatio="xMidYMid meet">
        <line
          x1={BUBBLE_PAD.left}
          y1={BUBBLE_PAD.top + innerH}
          x2={BUBBLE_PAD.left + innerW}
          y2={BUBBLE_PAD.top + innerH}
          stroke="rgba(255,255,255,0.1)"
        />
        <line
          x1={BUBBLE_PAD.left}
          y1={BUBBLE_PAD.top}
          x2={BUBBLE_PAD.left}
          y2={BUBBLE_PAD.top + innerH}
          stroke="rgba(255,255,255,0.1)"
        />
        <text x={BUBBLE_PAD.left + innerW / 2} y={BUBBLE_H - 8} fill="var(--muted)" fontSize="11" textAnchor="middle">
          followers (log) →
        </text>
        <text
          x={14}
          y={BUBBLE_PAD.top + innerH / 2}
          fill="var(--muted)"
          fontSize="11"
          textAnchor="middle"
          transform={`rotate(-90, 14, ${BUBBLE_PAD.top + innerH / 2})`}
        >
          engagements (log) →
        </text>
        {points.map((a) => {
          const eng = engOf(a)
          return (
            <g key={a.id}>
              <circle
                cx={xScale(a.followers)}
                cy={yScale(eng)}
                r={rScale(a.stats.posts)}
                fill={a.color}
                fillOpacity={0.55}
                stroke={a.color}
                strokeWidth={1.5}
              >
                <title>{`@${a.handle}\n${formatNumber(a.followers)} followers\n${formatNumber(eng)} eng\n${a.stats.posts} posts`}</title>
              </circle>
              <text
                x={xScale(a.followers)}
                y={yScale(eng) - rScale(a.stats.posts) - 4}
                fill="var(--text)"
                fontSize="10"
                textAnchor="middle"
                pointerEvents="none"
              >
                @{a.handle}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="caption">
        Top-left = punching above weight (less reach, more engagement). Bubble size = post volume.
      </p>
    </div>
  )
}

type TreemapTile = {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  readonly account: Account
  readonly post: TopPost
  readonly value: number
}

type Rect<T> = {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  readonly data: T
}

function layoutSorted<T extends { value: number }>(
  sorted: ReadonlyArray<T>,
  x: number,
  y: number,
  w: number,
  h: number
): Array<Rect<T>> {
  if (sorted.length === 0 || w <= 0 || h <= 0) return []
  if (sorted.length === 1) return [{ x, y, w, h, data: sorted[0]! }]
  const total = sorted.reduce((s, i) => s + i.value, 0)
  if (total === 0) return []
  let cumulative = 0
  let splitIndex = 1
  for (let i = 0; i < sorted.length - 1; i++) {
    cumulative += sorted[i]!.value
    if (cumulative >= total / 2) {
      splitIndex = i + 1
      break
    }
  }
  const left = sorted.slice(0, splitIndex)
  const right = sorted.slice(splitIndex)
  const ratio = sum(left.map((i) => i.value)) / total
  if (w >= h) {
    const splitW = w * ratio
    return [...layoutSorted(left, x, y, splitW, h), ...layoutSorted(right, x + splitW, y, w - splitW, h)]
  }
  const splitH = h * ratio
  return [...layoutSorted(left, x, y, w, splitH), ...layoutSorted(right, x, y + splitH, w, h - splitH)]
}

function binaryTreemap<T extends { value: number }>(
  items: ReadonlyArray<T>,
  x: number,
  y: number,
  w: number,
  h: number
): Array<Rect<T>> {
  const sorted = items.toSorted((a, b) => b.value - a.value)
  return layoutSorted(sorted, x, y, w, h)
}

const TREEMAP_W = 1200
const TREEMAP_H = 600

function TweetTreemap({ accounts }: { readonly accounts: ReadonlyArray<Account> }) {
  const tiles = useMemo<ReadonlyArray<TreemapTile>>(() => {
    const items = flattenPosts(accounts).filter((i) => i.value > 0)
    if (items.length === 0) return []
    return binaryTreemap(items, 0, 0, TREEMAP_W, TREEMAP_H).map((rect) => ({
      ...rect.data,
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h
    }))
  }, [accounts])

  if (tiles.length === 0) return <p className="caption">No posts to map yet.</p>

  return (
    <div className="treemap-wrap">
      <div className="treemap">
        {tiles.map((tile) => {
          const showHandle = tile.w > 80 && tile.h > 30
          const showEng = tile.w > 80 && tile.h > 50
          const showText = tile.w > 220 && tile.h > 100
          return (
            <a
              key={`${tile.account.id}:${tile.post.url}`}
              className="treemap-tile"
              href={tile.post.url}
              target="_blank"
              rel="noreferrer"
              style={{
                left: `${(tile.x / TREEMAP_W) * 100}%`,
                top: `${(tile.y / TREEMAP_H) * 100}%`,
                width: `${(tile.w / TREEMAP_W) * 100}%`,
                height: `${(tile.h / TREEMAP_H) * 100}%`,
                background: tile.account.color
              }}
              title={`@${tile.account.handle} · ${formatNumber(tile.value)} eng\n\n${tile.post.text}`}
            >
              {showHandle && <span className="treemap-handle">@{tile.account.handle}</span>}
              {showEng && <span className="treemap-eng">{formatNumber(tile.value)}</span>}
              {showText && <span className="treemap-text">{tile.post.text}</span>}
            </a>
          )
        })}
      </div>
      <p className="caption">
        Every post this roster published. Tile size = engagement. Color = author. Click to open.
      </p>
    </div>
  )
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "you",
  "your",
  "are",
  "with",
  "that",
  "this",
  "have",
  "from",
  "but",
  "not",
  "just",
  "all",
  "out",
  "was",
  "will",
  "what",
  "they",
  "has",
  "can",
  "our",
  "its",
  "who",
  "how",
  "why",
  "when",
  "where",
  "than",
  "then",
  "into",
  "more",
  "very",
  "been",
  "were",
  "had",
  "would",
  "could",
  "their",
  "them",
  "his",
  "her",
  "she",
  "him",
  "any",
  "some",
  "one",
  "two",
  "get",
  "got",
  "lol",
  "yeah",
  "yes",
  "really",
  "actually",
  "like",
  "about",
  "also",
  "make",
  "made",
  "way",
  "now",
  "still",
  "even",
  "want",
  "use",
  "see",
  "say",
  "said",
  "going",
  "good",
  "great",
  "much",
  "well",
  "back",
  "over",
  "people",
  "thing",
  "things",
  "something",
  "anything",
  "everyone",
  "anyone",
  "someone",
  "every",
  "those",
  "these",
  "around",
  "while",
  "should",
  "after",
  "before",
  "during",
  "without",
  "because",
  "ever",
  "never",
  "always",
  "doing",
  "trying",
  "work",
  "team",
  "only",
  "many",
  "even",
  "stuff",
  "kind",
  "kinda",
  "guys",
  "today",
  "tomorrow",
  "yesterday",
  "morning",
  "night",
  "year",
  "years",
  "month",
  "week",
  "weeks",
  "days",
  "hour",
  "hours",
  "minute",
  "minutes",
  "another",
  "other",
  "others",
  "still",
  "almost",
  "right",
  "left",
  "first",
  "last",
  "next",
  "previous",
  "https",
  "http",
  "com",
  "twitter",
  "tweet",
  "tweets",
  "post",
  "posts",
  "thread",
  "reply",
  "replies",
  "feel",
  "feels",
  "felt",
  "look",
  "looks",
  "looking",
  "find",
  "found",
  "know",
  "knows",
  "knew",
  "think",
  "thinks",
  "thought",
  "lot",
  "bit",
  "today",
  "since",
  "though",
  "actually",
  "totally",
  "literally",
  "honestly",
  "basically",
  "probably",
  "maybe",
  "definitely",
  "obviously",
  "completely",
  "absolutely",
  "essentially"
])

const WORD_TOKENIZE_RE = /[^\p{L}\p{N}\s'-]/gu
const WORD_URL_RE = /https?:\/\/\S+/g
const WORD_DIGIT_RE = /^\d+$/

type WordEntry = {
  readonly word: string
  readonly weight: number
  readonly posts: ReadonlyArray<PostItem>
}

function WordCloud({ accounts }: { readonly accounts: ReadonlyArray<Account> }) {
  const words = useMemo<ReadonlyArray<WordEntry>>(() => {
    const weightByWord = new Map<string, number>()
    const postsByWord = new Map<string, Array<PostItem>>()
    for (const account of accounts) {
      for (const post of account.posts) {
        const value = Math.max(1, totalEngagements(post.stats))
        const item: PostItem = { account, post, value }
        const tokens = post.text
          .toLowerCase()
          .replace(WORD_URL_RE, "")
          .replace(WORD_TOKENIZE_RE, " ")
          .split(/\s+/)
          .filter((w) => w.length >= 4 && !STOP_WORDS.has(w) && !WORD_DIGIT_RE.test(w))
        const seen = new Set<string>()
        for (const tok of tokens) {
          if (seen.has(tok)) continue
          seen.add(tok)
          weightByWord.set(tok, (weightByWord.get(tok) ?? 0) + value)
          const list = postsByWord.get(tok) ?? []
          list.push(item)
          postsByWord.set(tok, list)
        }
      }
    }
    return [...weightByWord.entries()]
      .filter(([, w]) => w > 0)
      .toSorted((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([word, weight]) => ({
        word,
        weight,
        posts: (postsByWord.get(word) ?? []).toSorted((a, b) => b.value - a.value)
      }))
  }, [accounts])

  if (words.length === 0) return <p className="caption">Not enough text yet.</p>

  const maxWeight = words[0]!.weight
  const minWeight = words[words.length - 1]!.weight
  const fontFor = (w: number) => 13 + ((w - minWeight) / (maxWeight - minWeight || 1)) * 22

  return (
    <div className="cloud-wrap">
      {words.map((entry) => (
        <WordPostsDialog entry={entry} key={entry.word}>
          <button
            type="button"
            className="cloud-word"
            style={{
              fontSize: `${fontFor(entry.weight)}px`,
              opacity: 0.4 + (entry.weight / maxWeight) * 0.6
            }}
            title={`${formatNumber(entry.weight)} weighted eng · ${entry.posts.length} posts`}
          >
            {entry.word}
          </button>
        </WordPostsDialog>
      ))}
    </div>
  )
}

function WordPostsDialog({ entry, children }: { readonly entry: WordEntry; readonly children: ReactNode }) {
  const highlight = useMemo(() => buildHighlight(entry.word), [entry.word])
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{children}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="modal-overlay" />
        <DialogPrimitive.Content className="modal-content word-modal" aria-describedby={undefined}>
          <header className="modal-header word-modal-header">
            <div className="modal-identity">
              <DialogPrimitive.Title asChild>
                <h2>"{entry.word}"</h2>
              </DialogPrimitive.Title>
              <span className="modal-handle">
                {entry.posts.length} post{entry.posts.length === 1 ? "" : "s"} · {formatNumber(entry.weight)} weighted
                eng
              </span>
            </div>
            <DialogPrimitive.Close className="modal-close" aria-label="Close">
              ×
            </DialogPrimitive.Close>
          </header>
          <div className="modal-posts">
            {entry.posts.map(({ account, post, value }) => (
              <a
                className="modal-post"
                href={post.url}
                key={`${account.id}:${post.url}`}
                rel="noreferrer"
                target="_blank"
              >
                <div className="modal-post-meta">
                  <span style={{ color: account.color, fontWeight: 700 }}>@{account.handle}</span>
                  <span>{post.createdAt}</span>
                  <strong>{formatNumber(value)} eng</strong>
                </div>
                <p className="modal-post-text">{highlight(post.text)}</p>
              </a>
            ))}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

const REGEX_ESCAPE = /[.*+?^${}()|[\]\\]/g

function buildHighlight(word: string) {
  const escaped = word.replace(REGEX_ESCAPE, "\\$&")
  const regex = new RegExp(`(${escaped})`, "gi")
  const lower = word.toLowerCase()
  return (text: string): ReactNode =>
    text.split(regex).map((part, idx) =>
      part.toLowerCase() === lower ? (
        <mark key={`${idx}-${part}`} className="word-mark">
          {part}
        </mark>
      ) : (
        <span key={`${idx}-${part}`}>{part}</span>
      )
    )
}

function MentionGraph({ accounts }: { readonly accounts: ReadonlyArray<Account> }) {
  const handleSet = useMemo(() => new Set(accounts.map((a) => a.handle.toLowerCase())), [accounts])
  const edges = useMemo(() => {
    const map = new Map<string, number>()
    for (const account of accounts) {
      for (const post of account.posts) {
        const matches = post.text.match(/@(\w{1,15})/g) ?? []
        for (const m of matches) {
          const target = m.slice(1).toLowerCase()
          if (target === account.handle.toLowerCase()) continue
          if (!handleSet.has(target)) continue
          const key = `${account.handle.toLowerCase()}→${target}`
          map.set(key, (map.get(key) ?? 0) + 1)
        }
      }
    }
    return [...map.entries()].map(([key, weight]) => {
      const [from, to] = key.split("→")
      return { from: from!, to: to!, weight }
    })
  }, [accounts, handleSet])

  const w = 600
  const h = 460
  const cx = w / 2
  const cy = h / 2
  const radius = 170
  const positions = useMemo(() => {
    const result = new Map<string, { x: number; y: number; account: Account }>()
    accounts.forEach((account, idx) => {
      const angle = (idx / accounts.length) * Math.PI * 2 - Math.PI / 2
      result.set(account.handle.toLowerCase(), {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        account
      })
    })
    return result
  }, [accounts, cx, cy])

  const maxWeight = Math.max(1, ...edges.map((e) => e.weight))

  return (
    <div className="graph-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" preserveAspectRatio="xMidYMid meet">
        {edges.map((edge) => {
          const a = positions.get(edge.from)
          const b = positions.get(edge.to)
          if (!a || !b) return null
          const mx = (a.x + b.x) / 2
          const my = (a.y + b.y) / 2
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const offset = dist * 0.35
          const px = mx - (dy / dist) * offset
          const py = my + (dx / dist) * offset
          return (
            <path
              key={`${edge.from}→${edge.to}`}
              d={`M ${a.x} ${a.y} Q ${px} ${py} ${b.x} ${b.y}`}
              fill="none"
              stroke={a.account.color}
              strokeOpacity={0.35 + (edge.weight / maxWeight) * 0.4}
              strokeWidth={1 + (edge.weight / maxWeight) * 3}
            >
              <title>{`@${edge.from} → @${edge.to} · ${edge.weight}×`}</title>
            </path>
          )
        })}
        {[...positions.values()].map(({ x, y, account }) => (
          <g key={account.id}>
            <circle cx={x} cy={y} r={9} fill={account.color} stroke="#000" strokeWidth={1.5} />
            <text
              x={x + (x > cx ? 14 : -14)}
              y={y}
              fill="var(--text)"
              fontSize="10"
              textAnchor={x > cx ? "start" : "end"}
              dominantBaseline="middle"
            >
              @{account.handle}
            </text>
          </g>
        ))}
      </svg>
      <p className="caption">
        {edges.length === 0
          ? "No roster-internal @-mentions captured this week."
          : `${edges.length} mention link${edges.length === 1 ? "" : "s"} between roster members. Curve thickness = repeat count.`}
      </p>
    </div>
  )
}

const STREAM_W = 720
const STREAM_H = 240
const STREAM_PAD = { top: 14, right: 12, bottom: 28, left: 12 } as const

function StreamGraph({ accounts }: { readonly accounts: ReadonlyArray<Account> }) {
  const innerW = STREAM_W - STREAM_PAD.left - STREAM_PAD.right
  const innerH = STREAM_H - STREAM_PAD.top - STREAM_PAD.bottom
  const days = DAY_LABELS.length

  const ranked = useMemo(() => accounts.toSorted((a, b) => sum(a.dailyEngagement) - sum(b.dailyEngagement)), [accounts])

  const totalsByDay = useMemo(() => {
    const result = Array.from({ length: days }, () => 0)
    for (const a of accounts)
      a.dailyEngagement.forEach((v, d) => {
        result[d] += v
      })
    return result
  }, [accounts, days])

  const maxTotal = Math.max(1, ...totalsByDay)
  const dayWidth = innerW / days

  return (
    <div className="stream-wrap">
      <svg viewBox={`0 0 ${STREAM_W} ${STREAM_H}`} width="100%" preserveAspectRatio="xMidYMid meet">
        {Array.from({ length: days }, (_, dayIdx) => {
          let cumulative = 0
          return ranked.map((account) => {
            const value = account.dailyEngagement[dayIdx] ?? 0
            if (value === 0) return null
            const segH = (value / maxTotal) * innerH
            const x = STREAM_PAD.left + dayIdx * dayWidth + 4
            const segW = dayWidth - 8
            const y = STREAM_PAD.top + innerH - cumulative - segH
            cumulative += segH
            return (
              <rect
                key={`${dayIdx}-${account.id}`}
                x={x}
                y={y}
                width={segW}
                height={segH}
                fill={account.color}
                fillOpacity={0.85}
              >
                <title>{`@${account.handle} · ${DAY_LABELS[dayIdx]} · ${formatNumber(value)} eng`}</title>
              </rect>
            )
          })
        })}
        {DAY_LABELS.map((label, idx) => (
          <text
            key={label}
            x={STREAM_PAD.left + idx * dayWidth + dayWidth / 2}
            y={STREAM_H - 8}
            fill="var(--muted)"
            fontSize="11"
            textAnchor="middle"
          >
            {label} · {formatNumber(totalsByDay[idx] ?? 0)}
          </text>
        ))}
      </svg>
    </div>
  )
}

function PostingFingerprint({ accounts }: { readonly accounts: ReadonlyArray<Account> }) {
  return (
    <div className="fingerprint-grid">
      {accounts.map((account) => {
        const max = Math.max(1, ...account.hourlyEngagement)
        return (
          <div className="fingerprint-card" key={account.id}>
            <div className="fingerprint-meta">
              <strong>@{account.handle}</strong>
              <span>{formatNumber(sum(account.hourlyEngagement))}</span>
            </div>
            <svg viewBox="0 0 240 60" width="100%" preserveAspectRatio="none">
              {account.hourlyEngagement.map((v, h) => {
                const barW = 240 / 24
                const barH = (v / max) * 56
                return (
                  <rect
                    key={h}
                    x={h * barW + 0.5}
                    y={60 - barH}
                    width={barW - 1}
                    height={barH}
                    fill={account.color}
                    fillOpacity={0.4 + (v / max) * 0.6}
                  >
                    <title>{`${formatHour(h)} · ${formatNumber(v)} eng`}</title>
                  </rect>
                )
              })}
            </svg>
          </div>
        )
      })}
    </div>
  )
}

const EMOJI_RE = /\p{Extended_Pictographic}/gu
const PUNCT_RE = /[!?]/g
const CAPS_RE = /\b[A-Z]{3,}\b/g

type Goblin = {
  readonly account: Account
  readonly emoji: number
  readonly variance: number
  readonly chaos: number
  readonly score: number
}

function GoblinIndex({ accounts }: { readonly accounts: ReadonlyArray<Account> }) {
  const goblins = useMemo<ReadonlyArray<Goblin>>(() => {
    const list = accounts.map((account) => {
      if (account.posts.length === 0) {
        return { account, emoji: 0, variance: 0, chaos: 0, score: 0 }
      }
      const lengths = account.posts.map((p) => p.text.length)
      const mean = lengths.reduce((s, n) => s + n, 0) / lengths.length
      const variance = Math.sqrt(lengths.reduce((s, n) => s + (n - mean) ** 2, 0) / lengths.length)
      const emojiCount = account.posts.reduce((s, p) => s + (p.text.match(EMOJI_RE)?.length ?? 0), 0)
      const punctCount = account.posts.reduce((s, p) => s + (p.text.match(PUNCT_RE)?.length ?? 0), 0)
      const capsCount = account.posts.reduce((s, p) => s + (p.text.match(CAPS_RE)?.length ?? 0), 0)
      const emoji = emojiCount / Math.max(1, account.posts.length)
      const chaos = (punctCount + capsCount * 2) / Math.max(1, account.posts.length)
      const score = (1 + emoji * 4) * (1 + chaos * 0.4) * (1 + variance / 80)
      return { account, emoji, variance, chaos, score }
    })
    return list.toSorted((a, b) => b.score - a.score)
  }, [accounts])

  const maxScore = goblins[0]?.score ?? 1

  return (
    <div className="goblin-list">
      {goblins.map((g, idx) => (
        <div className="goblin-row" key={g.account.id}>
          <span className="goblin-rank">{idx + 1}</span>
          <span className="goblin-name">@{g.account.handle}</span>
          <span className="goblin-bar-wrap">
            <span
              className="goblin-bar"
              style={{
                width: `${(g.score / maxScore) * 100}%`,
                background: g.account.color
              }}
            />
          </span>
          <span className="goblin-score">{g.score.toFixed(2)}</span>
          <span className="goblin-detail">
            {g.emoji.toFixed(1)} emoji/post · σ {g.variance.toFixed(0)} chars · {g.chaos.toFixed(1)} chaos
          </span>
        </div>
      ))}
    </div>
  )
}

function TickerTape({ accounts }: { readonly accounts: ReadonlyArray<Account> }) {
  const doubled = useMemo(() => {
    const top = flattenPosts(accounts)
      .toSorted((a, b) => b.value - a.value)
      .slice(0, 20)
    return [...top.map((item) => ({ item, lane: "a" as const })), ...top.map((item) => ({ item, lane: "b" as const }))]
  }, [accounts])

  if (doubled.length === 0) return null

  return (
    <div className="ticker">
      <div className="ticker-track">
        {doubled.map(({ item, lane }) => (
          <a
            className="ticker-item"
            key={`${lane}:${item.account.id}:${item.post.url}`}
            href={item.post.url}
            target="_blank"
            rel="noreferrer"
          >
            <span className="ticker-dot" style={{ background: item.account.color }} />
            <strong>@{item.account.handle}</strong>
            <span className="ticker-text">{item.post.text}</span>
            <span className="ticker-eng">{formatNumber(item.value)} eng</span>
          </a>
        ))}
      </div>
    </div>
  )
}

function TeamFeed({ accounts }: { readonly accounts: ReadonlyArray<Account> }) {
  const items = useMemo(
    () => flattenPosts(accounts).toSorted((a, b) => b.post.createdAtMs - a.post.createdAtMs),
    [accounts]
  )

  if (items.length === 0) return <p className="caption">No posts yet.</p>

  return (
    <div className="team-feed">
      {items.map(({ account, post, value }) => (
        <a className="feed-item" href={post.url} key={`${account.id}:${post.url}`} rel="noreferrer" target="_blank">
          <Avatar account={account} size={36} variant="feed" />
          <div className="feed-body">
            <div className="feed-header">
              <span className="feed-name">{account.name}</span>
              <span className="feed-handle" style={{ color: account.color }}>
                @{account.handle}
              </span>
              <span className="feed-time">
                <Clock4 size={11} strokeWidth={1.6} />
                {feedDateFormatter.format(new Date(post.createdAtMs))}
              </span>
              <span className="feed-eng-total">{formatNumber(value)} eng</span>
            </div>
            <p className="feed-text">{post.text}</p>
            <div className="feed-stats">
              <FeedStat icon={Heart} value={post.stats.likes} label="likes" />
              <FeedStat icon={MessageCircle} value={post.stats.replies} label="replies" />
              <FeedStat icon={Repeat2} value={post.stats.reposts} label="reposts" />
              <FeedStat icon={Eye} value={post.stats.impressions} label="impressions" />
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}

function BreakingFeed({ accounts }: { readonly accounts: ReadonlyArray<Account> }) {
  const items = useMemo(
    () =>
      flattenPosts(accounts)
        .toSorted((a, b) => b.value - a.value)
        .slice(0, 5),
    [accounts]
  )

  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (items.length <= 1) return
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), 5000)
    return () => clearInterval(id)
  }, [items.length])

  if (items.length === 0) return null
  const current = items[index]!

  return (
    <div className="breaking">
      <div className="breaking-strip">
        <span className="breaking-label" style={{ background: current.account.color }}>
          BREAKING
        </span>
        <span className="breaking-handle">@{current.account.handle}</span>
        <span className="breaking-eng">{formatNumber(current.value)} eng</span>
      </div>
      <a className="breaking-text" href={current.post.url} target="_blank" rel="noreferrer">
        {current.post.text}
      </a>
      <div className="breaking-dots">
        {items.map((item, idx) => (
          <button
            key={`${item.account.id}:${item.post.url}`}
            type="button"
            className={idx === index ? "breaking-dot active" : "breaking-dot"}
            onClick={() => setIndex(idx)}
            aria-label={`Show story ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

export function FunZone({ accounts }: { readonly accounts: ReadonlyArray<Account> }) {
  return (
    <div className="fun-zone">
      <div className="fun-banner">
        <span>FUN ZONE</span>
        <small>Visualization playground · scroll for patterns the table can't show</small>
      </div>

      <FunSection icon={Zap} title="Breaking" description="The week's biggest hits, on rotation.">
        <BreakingFeed accounts={accounts} />
      </FunSection>

      <FunSection icon={Newspaper} title="Roster feed" description="Every tracked post, newest first.">
        <TeamFeed accounts={accounts} />
      </FunSection>

      <FunSection
        icon={Layers}
        title="Tweet treemap"
        description="Every post as a tile. Size = engagement, color = author."
      >
        <TweetTreemap accounts={accounts} />
      </FunSection>

      <FunSection
        icon={CalendarDays}
        title="Calendar heatmap"
        description="Each row is an account, each columnn is a day. Bright = engaged."
      >
        <CalendarHeatmap accounts={accounts} />
      </FunSection>

      <FunSection icon={BarChart3} title="Stream graph" description="Stacked daily engagement, colored by author.">
        <StreamGraph accounts={accounts} />
      </FunSection>

      <FunSection icon={Clock4} title="Rhythm clock" description="When the roster is loudest, by hour of day.">
        <RhythmClock accounts={accounts} />
      </FunSection>

      <FunSection
        icon={TrendingUp}
        title="Punching above weight"
        description="Followers vs engagement. Top-left bubbles outperform their reach."
      >
        <FollowersBubble accounts={accounts} />
      </FunSection>

      <FunSection
        icon={Type}
        title="Word cloud"
        description="Words weighted by the engagement of posts they appeared in."
      >
        <WordCloud accounts={accounts} />
      </FunSection>

      <FunSection
        icon={Hash}
        title="Mention graph"
        description="Who shouted out whom. Curves between roster members that named each other."
      >
        <MentionGraph accounts={accounts} />
      </FunSection>

      <FunSection
        icon={Fingerprint}
        title="Posting fingerprint"
        description="Each account's 24-hour rhythm as a unique glyph."
      >
        <PostingFingerprint accounts={accounts} />
      </FunSection>

      <FunSection
        icon={Sparkles}
        title="Goblin index"
        description="A made-up vibe metric: emoji density × text-length variance × punctuation chaos."
      >
        <GoblinIndex accounts={accounts} />
      </FunSection>

      <FunSection icon={Tag} title="Ticker tape" description="Top posts on infinite loop.">
        <TickerTape accounts={accounts} />
      </FunSection>
    </div>
  )
}
