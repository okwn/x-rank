import { defineXRankConfig } from "./src/xrank-config.ts"

export default defineXRankConfig({
  title: "X Rank",
  roster: [
    { handle: "opencode", team: "Official", color: "#34d399" },
    { handle: "kitlangton", team: "Engineering", color: "#7c3aed" },
    { handle: "jayair", team: "Founders", color: "#111827" },
    { handle: "thdxr", team: "Founders", color: "#0f766e" },
    { handle: "fanjiewang", team: "Founders", color: "#0891b2" },
    { handle: "alan__rice", team: "Engineering", color: "#2563eb" },
    { handle: "kmdrfx", team: "Engineering", color: "#4f46e5" },
    { handle: "adamdotdev", team: "Engineering", color: "#9333ea" },
    { handle: "rekram11", team: "Engineering", color: "#16a34a" },
    { handle: "iamdavidhill", team: "Design", color: "#db2777" },
    { handle: "ryanvogel", team: "Growth", color: "#ea580c" },
    { handle: "jlongster", team: "Engineering", color: "#be123c" },
    { handle: "simonklee", team: "Engineering", color: "#06b6d4" },
    { handle: "LukeParkerDev", team: "Engineering", color: "#ca8a04" },
    { handle: "vimtor", team: "Engineering", color: "#84cc16" },
    { handle: "brendonovich", team: "Engineering", color: "#f97316" },
    { handle: "StefanTMD", team: "Business", color: "#6366f1" },
    { handle: "nexxeln", team: "Engineering", color: "#14b8a6" },
    { handle: "juliana_ardila3", team: "Engineering", color: "#f43f5e" },
    { handle: "MichelleBakels", team: "Engineering", color: "#a855f7" }
  ],
  schedule: {
    every: "4 hours",
    command: "bun run publish --skip-if-fresh",
    label: "com.kitlangton.xrank"
  }
})
