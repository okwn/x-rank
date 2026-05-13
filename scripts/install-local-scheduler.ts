#!/usr/bin/env bun
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { homedir, platform } from "node:os"
import { basename, join } from "node:path"
import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import { Duration } from "effect"
import userConfig from "../xrank.config.ts"

const cwd = process.cwd()
const appName = basename(cwd).replace(/[^a-zA-Z0-9_-]/g, "-") || "x-rank"
const logPath = join(cwd, "logs", "scheduler.log")

const args = process.argv.slice(2)

const option = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : undefined
}

const has = (name: string) => args.includes(`--${name}`)

const label = option("label") ?? userConfig.schedule?.label ?? `com.x-rank.${appName}.publish`
const plistPath = join(homedir(), "Library", "LaunchAgents", `${label}.plist`)

const rl = createInterface({ input, output })

const ask = async (question: string, fallback: string) => {
  const answer = (await rl.question(`${question} (${fallback}): `)).trim()
  return answer || fallback
}

const shellEscape = (value: string) => `'${value.replace(/'/g, "'\\''")}'`

const intervalSeconds = (input: string) => {
  const millis = Duration.toMillis(Duration.fromInputUnsafe(input as Duration.Input))
  if (!Number.isFinite(millis) || millis <= 0) throw new Error(`Invalid interval: ${input}`)
  return Math.max(60, Math.round(millis / 1000))
}

const writeMacLaunchAgent = (seconds: number, command: string) => {
  mkdirSync(join(homedir(), "Library", "LaunchAgents"), { recursive: true })
  mkdirSync(join(cwd, "logs"), { recursive: true })
  const shellCommand = `cd ${shellEscape(cwd)} && ${command}`
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>${shellCommand.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</string>
  </array>
  <key>StartInterval</key>
  <integer>${seconds}</integer>
  <key>StandardOutPath</key>
  <string>${logPath}</string>
  <key>StandardErrorPath</key>
  <string>${logPath}</string>
  <key>WorkingDirectory</key>
  <string>${cwd}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${(process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</string>
  </dict>
</dict>
</plist>
`
  writeFileSync(plistPath, plist)
}

const cronSchedule = (seconds: number) => {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `*/${minutes} * * * *`
  if (minutes % 60 === 0 && minutes / 60 <= 23) return `0 */${minutes / 60} * * *`
  return `*/30 * * * *`
}

const uninstallMacLaunchAgent = () => {
  spawnSync("launchctl", ["bootout", `gui/${process.getuid?.() ?? ""}`, plistPath], { stdio: "ignore" })
  if (existsSync(plistPath)) rmSync(plistPath)
  console.log(`Removed ${plistPath}`)
}

try {
  if (has("uninstall")) {
    if (platform() === "darwin") uninstallMacLaunchAgent()
    else console.log("Remove the cron/systemd entry you created for this repo.")
    process.exit(0)
  }

  console.log("x-rank local scheduler\n")
  const interval =
    option("every") ??
    (has("yes") ? undefined : await ask("Publish interval", userConfig.schedule?.every ?? "4 hours")) ??
    userConfig.schedule?.every ??
    "4 hours"
  const command =
    option("command") ??
    (has("yes")
      ? undefined
      : await ask("Command to run", userConfig.schedule?.command ?? "bun run publish --skip-if-fresh")) ??
    userConfig.schedule?.command ??
    "bun run publish --skip-if-fresh"
  const seconds = intervalSeconds(interval)

  if (platform() === "darwin") {
    writeMacLaunchAgent(seconds, command)
    console.log(`Wrote ${plistPath}`)
    if (has("load")) {
      spawnSync("launchctl", ["bootout", `gui/${process.getuid?.() ?? ""}`, plistPath], { stdio: "ignore" })
      const loaded = spawnSync("launchctl", ["bootstrap", `gui/${process.getuid?.() ?? ""}`, plistPath], {
        stdio: "inherit"
      })
      if (loaded.status !== 0) process.exit(loaded.status ?? 1)
      console.log(`Loaded ${label}`)
    } else {
      console.log("Load it with:")
      console.log(`  launchctl bootstrap gui/$(id -u) ${shellEscape(plistPath)}`)
    }
    console.log("Run once now with:")
    console.log(`  launchctl kickstart -k gui/$(id -u)/${label}`)
    console.log("Uninstall with:")
    console.log("  bun run schedule:uninstall")
  } else {
    const schedule = cronSchedule(seconds)
    console.log("Add this to your crontab (`crontab -e`):")
    console.log(`${schedule} cd ${shellEscape(cwd)} && ${command} >> ${shellEscape(logPath)} 2>&1`)
  }
} finally {
  rl.close()
}
