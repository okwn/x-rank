import type { Account, TopPost, TopPostStats, TrendPoint } from "./api.ts"

export type { Account, TopPost, TrendPoint } from "./api.ts"

// Stable mock post timestamp: index-based so fake snapshots are deterministic.
let mockPostIndex = 0
const post = (text: string, stats: TopPostStats, createdAt = "Tue 10:42 AM"): TopPost => ({
  text,
  createdAt,
  createdAtMs: Date.now() - mockPostIndex++ * 8 * 60 * 60 * 1000,
  url: "https://x.com/example/status/123",
  stats
})

export const accounts: ReadonlyArray<Account> = [
  {
    id: "maya",
    name: "Maya Chen",
    handle: "maya_builds",
    team: "Product",
    color: "#7c3aed",
    followers: 48200,
    previousFollowers: 47620,
    previousGrowth: 310,
    stats: {
      posts: 9,
      impressions: 184200,
      likes: 4210,
      replies: 342,
      reposts: 812,
      quotes: 138,
      bookmarks: 921,
      activeDays: 5
    },
    previousStats: {
      posts: 7,
      impressions: 122400,
      likes: 2900,
      replies: 210,
      reposts: 480,
      quotes: 82,
      bookmarks: 510,
      activeDays: 4
    },
    posts: [
      post(
        "We rebuilt onboarding around the moment users first feel momentum. Small copy changes, big activation lift.",
        { impressions: 62100, likes: 1460, replies: 116, reposts: 290, quotes: 51, bookmarks: 360 }
      )
    ],
    dailyEngagement: [816, 504, 587, 237, 823, 762, 418],
    followerHistory: [],
    hourlyEngagement: [0, 0, 0, 0, 0, 0, 12, 48, 120, 240, 320, 410, 380, 290, 220, 180, 140, 90, 60, 40, 20, 8, 4, 2]
  },
  {
    id: "eli",
    name: "Eli Brooks",
    handle: "eli_ops",
    team: "Infra",
    color: "#0f766e",
    followers: 20140,
    previousFollowers: 19680,
    previousGrowth: 170,
    stats: {
      posts: 11,
      impressions: 113400,
      likes: 2810,
      replies: 410,
      reposts: 540,
      quotes: 92,
      bookmarks: 610,
      activeDays: 6
    },
    previousStats: {
      posts: 8,
      impressions: 82000,
      likes: 1680,
      replies: 290,
      reposts: 330,
      quotes: 54,
      bookmarks: 330,
      activeDays: 5
    },
    posts: [
      post(
        "A production incident review is only useful if it changes the default path for the next engineer.",
        { impressions: 31200, likes: 840, replies: 138, reposts: 180, quotes: 30, bookmarks: 220 },
        "Mon 3:18 PM"
      )
    ],
    dailyEngagement: [240, 779, 751, 326, 825, 583, 373],
    followerHistory: [],
    hourlyEngagement: [4, 2, 0, 0, 0, 0, 8, 30, 90, 180, 280, 360, 320, 280, 240, 200, 150, 110, 80, 60, 40, 22, 12, 6]
  },
  {
    id: "nora",
    name: "Nora Patel",
    handle: "norapatel",
    team: "Design",
    color: "#db2777",
    followers: 14890,
    previousFollowers: 14330,
    previousGrowth: 84,
    stats: {
      posts: 6,
      impressions: 97200,
      likes: 2380,
      replies: 226,
      reposts: 490,
      quotes: 122,
      bookmarks: 780,
      activeDays: 4
    },
    previousStats: {
      posts: 5,
      impressions: 74400,
      likes: 1560,
      replies: 140,
      reposts: 280,
      quotes: 62,
      bookmarks: 410,
      activeDays: 3
    },
    posts: [
      post(
        "Design systems fail when they optimize for catalog completeness instead of decision speed.",
        { impressions: 43800, likes: 1120, replies: 76, reposts: 260, quotes: 61, bookmarks: 420 },
        "Wed 9:05 AM"
      )
    ],
    dailyEngagement: [600, 823, 638, 656, 177, 254, 356],
    followerHistory: [],
    hourlyEngagement: [0, 0, 0, 0, 0, 0, 0, 22, 90, 220, 340, 410, 360, 280, 200, 140, 100, 70, 50, 30, 20, 12, 6, 2]
  },
  {
    id: "sam",
    name: "Sam Rivera",
    handle: "samships",
    team: "Engineering",
    color: "#2563eb",
    followers: 35600,
    previousFollowers: 35240,
    previousGrowth: 220,
    stats: {
      posts: 8,
      impressions: 138500,
      likes: 3260,
      replies: 188,
      reposts: 620,
      quotes: 74,
      bookmarks: 540,
      activeDays: 5
    },
    previousStats: {
      posts: 9,
      impressions: 151000,
      likes: 3420,
      replies: 230,
      reposts: 710,
      quotes: 96,
      bookmarks: 620,
      activeDays: 6
    },
    posts: [
      post(
        "The best internal tool we shipped this quarter removed one meeting, not one click.",
        { impressions: 58400, likes: 1320, replies: 64, reposts: 250, quotes: 28, bookmarks: 190 },
        "Thu 1:11 PM"
      )
    ],
    dailyEngagement: [105, 407, 156, 468, 536, 154, 152],
    followerHistory: [],
    hourlyEngagement: [0, 0, 0, 0, 0, 6, 30, 70, 140, 220, 290, 350, 320, 260, 200, 160, 120, 90, 70, 60, 40, 26, 14, 8]
  },
  {
    id: "jules",
    name: "Jules Morgan",
    handle: "julesmarket",
    team: "Growth",
    color: "#ea580c",
    followers: 27440,
    previousFollowers: 26920,
    previousGrowth: 260,
    stats: {
      posts: 13,
      impressions: 128900,
      likes: 2510,
      replies: 254,
      reposts: 510,
      quotes: 80,
      bookmarks: 390,
      activeDays: 7
    },
    previousStats: {
      posts: 12,
      impressions: 119400,
      likes: 2230,
      replies: 210,
      reposts: 430,
      quotes: 52,
      bookmarks: 310,
      activeDays: 6
    },
    posts: [
      post(
        "Launch posts work better when they read like notes from the build room, not brochure copy.",
        { impressions: 35200, likes: 720, replies: 72, reposts: 144, quotes: 27, bookmarks: 130 },
        "Fri 8:22 AM"
      )
    ],
    dailyEngagement: [564, 550, 487, 534, 86, 288, 434],
    followerHistory: [],
    hourlyEngagement: [2, 0, 0, 0, 0, 0, 4, 28, 110, 230, 320, 380, 350, 280, 220, 180, 130, 90, 60, 40, 28, 16, 8, 4]
  },
  {
    id: "ari",
    name: "Ari Fox",
    handle: "arifox_ai",
    team: "AI",
    color: "#16a34a",
    followers: 9800,
    previousFollowers: 9100,
    previousGrowth: 115,
    stats: {
      posts: 7,
      impressions: 76400,
      likes: 1860,
      replies: 196,
      reposts: 360,
      quotes: 88,
      bookmarks: 610,
      activeDays: 4
    },
    previousStats: {
      posts: 4,
      impressions: 39200,
      likes: 760,
      replies: 80,
      reposts: 120,
      quotes: 18,
      bookmarks: 180,
      activeDays: 3
    },
    posts: [
      post(
        "Prompt quality gets better when the product stops pretending the first answer is the final answer.",
        { impressions: 28600, likes: 690, replies: 88, reposts: 142, quotes: 42, bookmarks: 280 },
        "Tue 4:07 PM"
      )
    ],
    dailyEngagement: [817, 431, 611, 601, 818, 152, 227],
    followerHistory: [],
    hourlyEngagement: [
      0, 0, 0, 0, 0, 0, 12, 50, 130, 250, 340, 410, 380, 290, 220, 170, 130, 100, 80, 60, 40, 24, 12, 4
    ]
  },
  {
    id: "leo",
    name: "Leo Stein",
    handle: "leostein",
    team: "Founders",
    color: "#111827",
    followers: 81200,
    previousFollowers: 80640,
    previousGrowth: 420,
    stats: {
      posts: 5,
      impressions: 221000,
      likes: 4820,
      replies: 310,
      reposts: 940,
      quotes: 166,
      bookmarks: 860,
      activeDays: 4
    },
    previousStats: {
      posts: 6,
      impressions: 238000,
      likes: 5300,
      replies: 380,
      reposts: 980,
      quotes: 178,
      bookmarks: 900,
      activeDays: 4
    },
    posts: [
      post(
        "A strategy is real when it tells you which tempting feature to decline this week.",
        { impressions: 77200, likes: 1680, replies: 104, reposts: 310, quotes: 63, bookmarks: 330 },
        "Mon 11:30 AM"
      )
    ],
    dailyEngagement: [735, 112, 320, 421, 688, 545, 603],
    followerHistory: [],
    hourlyEngagement: [
      4, 2, 0, 0, 0, 8, 32, 78, 160, 280, 370, 430, 400, 320, 240, 190, 140, 100, 80, 60, 40, 22, 12, 6
    ]
  },
  {
    id: "tess",
    name: "Tess Walker",
    handle: "tessdata",
    team: "Data",
    color: "#0891b2",
    followers: 12680,
    previousFollowers: 12380,
    previousGrowth: 75,
    stats: {
      posts: 6,
      impressions: 54400,
      likes: 1040,
      replies: 144,
      reposts: 210,
      quotes: 44,
      bookmarks: 340,
      activeDays: 5
    },
    previousStats: {
      posts: 5,
      impressions: 46800,
      likes: 900,
      replies: 120,
      reposts: 180,
      quotes: 31,
      bookmarks: 260,
      activeDays: 4
    },
    posts: [
      post(
        "Dashboards get adopted when they answer a ritual question people already ask every week.",
        { impressions: 18900, likes: 380, replies: 50, reposts: 74, quotes: 16, bookmarks: 132 },
        "Wed 2:44 PM"
      )
    ],
    dailyEngagement: [733, 709, 201, 231, 591, 568, 747],
    followerHistory: [],
    hourlyEngagement: [0, 0, 0, 0, 0, 0, 6, 32, 100, 200, 280, 320, 290, 240, 200, 160, 120, 90, 70, 50, 36, 20, 10, 4]
  },
  {
    id: "omar",
    name: "Omar Nunez",
    handle: "omarbuilds",
    team: "Engineering",
    color: "#4f46e5",
    followers: 18120,
    previousFollowers: 17920,
    previousGrowth: 98,
    stats: {
      posts: 10,
      impressions: 68200,
      likes: 1390,
      replies: 166,
      reposts: 250,
      quotes: 36,
      bookmarks: 210,
      activeDays: 6
    },
    previousStats: {
      posts: 8,
      impressions: 71400,
      likes: 1480,
      replies: 120,
      reposts: 260,
      quotes: 42,
      bookmarks: 240,
      activeDays: 5
    },
    posts: [
      post(
        "If the migration plan cannot fit in one screen, the risk is probably hiding in the plan itself.",
        { impressions: 21300, likes: 430, replies: 46, reposts: 92, quotes: 14, bookmarks: 82 },
        "Thu 5:26 PM"
      )
    ],
    dailyEngagement: [329, 690, 432, 547, 340, 444, 477],
    followerHistory: [],
    hourlyEngagement: [2, 0, 0, 0, 0, 0, 8, 36, 120, 220, 290, 340, 320, 260, 200, 160, 120, 90, 70, 60, 44, 28, 14, 6]
  },
  {
    id: "ivy",
    name: "Ivy Kim",
    handle: "ivykim_pm",
    team: "Product",
    color: "#be123c",
    followers: 6900,
    previousFollowers: 6420,
    previousGrowth: 60,
    stats: {
      posts: 8,
      impressions: 48600,
      likes: 980,
      replies: 180,
      reposts: 190,
      quotes: 40,
      bookmarks: 220,
      activeDays: 5
    },
    previousStats: {
      posts: 4,
      impressions: 21200,
      likes: 330,
      replies: 46,
      reposts: 60,
      quotes: 12,
      bookmarks: 70,
      activeDays: 3
    },
    posts: [
      post(
        "A good beta asks fewer questions than a survey and creates better answers than one.",
        { impressions: 16400, likes: 320, replies: 68, reposts: 66, quotes: 18, bookmarks: 96 },
        "Tue 12:03 PM"
      )
    ],
    dailyEngagement: [531, 274, 441, 287, 72, 719, 382],
    followerHistory: [],
    hourlyEngagement: [0, 0, 0, 0, 0, 0, 4, 22, 80, 170, 250, 310, 290, 240, 180, 130, 100, 70, 50, 40, 28, 16, 8, 2]
  },
  {
    id: "zoe",
    name: "Zoe Hart",
    handle: "zoehart",
    team: "Community",
    color: "#9333ea",
    followers: 8600,
    previousFollowers: 8380,
    previousGrowth: 52,
    stats: {
      posts: 12,
      impressions: 44200,
      likes: 900,
      replies: 210,
      reposts: 150,
      quotes: 34,
      bookmarks: 105,
      activeDays: 7
    },
    previousStats: {
      posts: 10,
      impressions: 39600,
      likes: 820,
      replies: 196,
      reposts: 132,
      quotes: 26,
      bookmarks: 84,
      activeDays: 7
    },
    posts: [
      post(
        "The best community threads start with a specific artifact, not a broad question.",
        { impressions: 11800, likes: 230, replies: 74, reposts: 42, quotes: 12, bookmarks: 36 },
        "Wed 6:08 PM"
      )
    ],
    dailyEngagement: [830, 239, 559, 366, 242, 545, 73],
    followerHistory: [],
    hourlyEngagement: [0, 0, 0, 0, 0, 0, 6, 30, 90, 170, 220, 240, 220, 200, 180, 150, 130, 110, 90, 70, 50, 32, 18, 8]
  },
  {
    id: "max",
    name: "Max Turner",
    handle: "maxturner",
    team: "Sales",
    color: "#ca8a04",
    followers: 11420,
    previousFollowers: 11280,
    previousGrowth: 45,
    stats: {
      posts: 5,
      impressions: 39200,
      likes: 760,
      replies: 112,
      reposts: 144,
      quotes: 28,
      bookmarks: 110,
      activeDays: 4
    },
    previousStats: {
      posts: 6,
      impressions: 33800,
      likes: 690,
      replies: 88,
      reposts: 120,
      quotes: 20,
      bookmarks: 92,
      activeDays: 4
    },
    posts: [
      post(
        "The strongest customer quote this week was not about speed. It was about confidence.",
        { impressions: 12800, likes: 250, replies: 38, reposts: 52, quotes: 10, bookmarks: 48 },
        "Fri 10:15 AM"
      )
    ],
    dailyEngagement: [628, 307, 487, 723, 398, 767, 447],
    followerHistory: [],
    hourlyEngagement: [0, 0, 0, 0, 0, 0, 8, 30, 80, 140, 200, 250, 240, 210, 180, 150, 120, 90, 70, 50, 32, 18, 8, 2]
  }
]

export const trend: ReadonlyArray<TrendPoint> = [
  { label: "Mon", posts: 13, engagements: 4200, impressions: 184000 },
  { label: "Tue", posts: 18, engagements: 6900, impressions: 241000 },
  { label: "Wed", posts: 15, engagements: 6100, impressions: 222000 },
  { label: "Thu", posts: 17, engagements: 7200, impressions: 266000 },
  { label: "Fri", posts: 14, engagements: 5400, impressions: 193000 },
  { label: "Sat", posts: 5, engagements: 1800, impressions: 68000 },
  { label: "Sun", posts: 4, engagements: 1600, impressions: 59000 }
] as const
