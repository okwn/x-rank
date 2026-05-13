#!/usr/bin/env bun
import { existsSync, readFileSync } from "node:fs"
import userConfig from "../xrank.config.ts"
import type { RosterEntry } from "../src/xrank-config.ts"

const roster = userConfig.roster as ReadonlyArray<RosterEntry>

const fail = (message: string) => {
  console.error(`✗ ${message}`)
  process.exitCode = 1
}

const pass = (message: string) => console.log(`✓ ${message}`)
const info = (message: string) => console.log(`• ${message}`)

const env = existsSync(".env") ? readFileSync(".env", "utf8") : ""
const token = env.match(/^X_BEARER_TOKEN=(.+)$/m)?.[1]?.trim()

console.log("x-rank doctor\n")

if (roster.length === 0) fail("xrank.config.ts roster is empty")
else pass(`${roster.length} roster handle${roster.length === 1 ? "" : "s"}`)

const seen = new Set<string>()
for (const entry of roster) {
  const handle = entry.handle.trim().replace(/^@+/, "").toLowerCase()
  if (!handle) fail("roster contains an empty handle")
  if (seen.has(handle)) fail(`roster contains duplicate handle: ${handle}`)
  seen.add(handle)
  if (entry.color && !/^#[0-9a-fA-F]{6}$/.test(entry.color)) fail(`invalid color for ${handle}: ${entry.color}`)
}

if (!existsSync(".env")) fail(".env is missing; copy .env.example to .env and set X_BEARER_TOKEN")
else pass(".env exists")

if (!token) fail("X_BEARER_TOKEN is missing in .env")
else if (!token.startsWith("AAAA")) fail("X_BEARER_TOKEN should be an X API bearer token starting with AAAA")
else pass("X_BEARER_TOKEN looks like an X API bearer token")

info(`schedule every: ${userConfig.schedule?.every ?? "not configured"}`)
info(`schedule command: ${userConfig.schedule?.command ?? "not configured"}`)

if (process.exitCode) {
  console.log("\nFix the items above, then run `bun run doctor` again.")
} else {
  console.log("\nReady. Next: `bun run refresh && bun run export && bun run build`.")
}
