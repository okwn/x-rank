#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs"
import userConfig from "../xrank.config.ts"
import type { RosterEntry } from "../src/xrank-config.ts"

const CONFIG_PATH = "xrank.config.ts"
const roster = userConfig.roster as ReadonlyArray<RosterEntry>

const normalizeHandle = (handle: string) => handle.trim().replace(/^@+/, "")
const parseHandles = (values: ReadonlyArray<string>) =>
  values
    .flatMap((value) => value.split(/[\s,]+/))
    .map(normalizeHandle)
    .filter(Boolean)

const unique = (handles: ReadonlyArray<string>) => [...new Set(handles.map((handle) => handle.toLowerCase()))]

const entrySource = (entry: RosterEntry) => {
  const parts = [`handle: ${JSON.stringify(normalizeHandle(entry.handle))}`]
  if (entry.team) parts.push(`team: ${JSON.stringify(entry.team)}`)
  if (entry.color) parts.push(`color: ${JSON.stringify(entry.color)}`)
  return `    { ${parts.join(", ")} }`
}

const rosterSource = (entries: ReadonlyArray<RosterEntry>) => `roster: [\n${entries.map(entrySource).join(",\n")}\n  ],`

const writeRoster = (entries: ReadonlyArray<RosterEntry>) => {
  const source = readFileSync(CONFIG_PATH, "utf8")
  const next = source.replace(/roster: \[[\s\S]*?\n  \],/, rosterSource(entries))
  if (next === source) throw new Error(`Could not find roster block in ${CONFIG_PATH}`)
  writeFileSync(CONFIG_PATH, next)
}

const entriesByHandle = () => new Map(roster.map((entry) => [normalizeHandle(entry.handle).toLowerCase(), entry]))

const [command, ...args] = process.argv.slice(2)

switch (command) {
  case "list": {
    for (const entry of roster) console.log(entry.handle)
    break
  }
  case "set": {
    const handles = unique(parseHandles(args))
    if (handles.length === 0) throw new Error("Usage: bun run config -- set thdxr kitlangton opencode")
    const byHandle = entriesByHandle()
    writeRoster(handles.map((handle) => byHandle.get(handle.toLowerCase()) ?? { handle }))
    console.log(`Set roster to ${handles.length} handle${handles.length === 1 ? "" : "s"}.`)
    break
  }
  case "add": {
    const byHandle = entriesByHandle()
    for (const handle of parseHandles(args)) byHandle.set(handle.toLowerCase(), { handle })
    if (byHandle.size === roster.length) throw new Error("No new handles provided")
    const entries = [...byHandle.values()]
    writeRoster(entries)
    console.log(`Updated roster to ${entries.length} handle${entries.length === 1 ? "" : "s"}.`)
    break
  }
  default:
    console.log("Usage:")
    console.log("  bun run config -- list")
    console.log("  bun run config -- set thdxr kitlangton opencode")
    console.log("  bun run config -- add jayair adamdotdev")
}
