# x-rank

A self-hostable X leaderboard. Pick a list of accounts, refresh their recent
posts through the X API, export JSON snapshots, and deploy the React dashboard
as a static site to any CDN.

Production is static by default: no server, no database connection, and no API
token in the browser.

## Quick Start

Prerequisites: [Bun](https://bun.sh) >= 1.3 and an X API v2 bearer token with
pay-per-use/read access for user lookup, recent search, and post lookup. The
bearer token starts with `AAAA`; it is not an xAI key.

```sh
bun install
cp .env.example .env
# Paste X_BEARER_TOKEN into .env
```

Edit the typed config in `xrank.config.ts`:

```ts
export default defineXRankConfig({
  title: "Acme X Rank",
  roster: [{ handle: "thdxr" }, { handle: "kitlangton" }, { handle: "opencode", color: "#34d399" }],
  schedule: {
    every: "4 hours",
    command: "bun run publish --skip-if-fresh"
  }
})
```

Only `handle` is required. `team` and `color` are optional and kept for future
grouping/customization.

Agents can update the roster without hand-editing TypeScript:

```sh
bun run config -- set thdxr kitlangton opencode
bun run config -- add jayair adamdotdev
bun run config -- list
```

Check setup before spending X API credits:

```sh
bun run doctor
```

Generate and preview the static site:

```sh
bun run refresh       # fetch X data into ./data/snapshots.db
bun run export        # write public/snapshot.json and public/snapshots/*
bun run dev:static    # optional local UI preview using exported snapshots
bun run build         # build ./dist for any static host
```

## Deploy Anywhere

The deploy artifact is `dist/`. Upload it to any static CDN:

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages
- S3/R2 plus a CDN
- any server that can serve static files

### Vercel

```sh
bunx vercel login
bunx vercel link
bun run publish       # refresh + export + Vercel build/deploy
```

`bun run publish --skip-if-fresh` retries a Vercel deploy without another X API
refresh if the last refresh was within the past hour.

### Cloudflare Pages

Use the static artifact. No Worker or D1 is required.

```sh
bun run refresh
bun run export
bun run build
bunx wrangler pages deploy dist --project-name x-rank
```

In the Cloudflare dashboard, set the Pages build settings to:

- Build command: `bun run build`
- Build output directory: `dist`

If Cloudflare builds from Git, add `X_BEARER_TOKEN` as a Pages environment
variable only if the build job also runs `bun run refresh`. Most setups should
refresh locally or in CI and then deploy the static output.

Provider-agnostic flow:

```sh
bun run refresh
bun run export
bun run build
# deploy ./dist with your host's CLI
```

## Agent Setup Prompt

Give this prompt to an agent after forking the repo:

```md
Set up this x-rank fork for my organization.

1. Ask me for the X handles to track and the deployment target.
2. Update `xrank.config.ts` directly or run `bun run config -- set <handles>`.
   Only add `team` or `color` if I provide them.
3. Help me create `.env` from `.env.example` and set `X_BEARER_TOKEN`; never
   commit the token.
4. Run `bun install`.
5. Run `bun run doctor` and fix any reported issues.
6. If I chose Vercel, run `bunx vercel link` if needed, then `bun run publish`.
7. If I chose Cloudflare Pages, run `bun run refresh`, `bun run export`,
   `bun run build`, then `bunx wrangler pages deploy dist --project-name x-rank`.
8. Otherwise run `bun run refresh`, `bun run export`, and `bun run build`, then
   tell me to deploy the generated `dist/` directory.
9. If I want local background publishing, run `bun run schedule:install -- --yes --load`.
10. Run `bun run cost` and summarize the estimated X API spend.
```

## Scheduling

Only one scheduler should use a given X API token. Running multiple refresh loops
against the same token can double-bill pay-per-use reads.

Good options:

- Manual: run `bun run publish` when you want fresh data.
- Manual retry: run `bun run publish --skip-if-fresh` to avoid another X API
  refresh if you are only retrying a deploy.
- Local background publishing: configure `schedule` in `xrank.config.ts`, then run
  `bun run schedule:install -- --yes --load`. On macOS this writes and loads a
  LaunchAgent; on Linux it prints a cron entry.
- GitHub Actions schedule: good for shared ownership; commit or upload the
  exported snapshots during the job, then deploy static assets.

The production site should still serve static JSON. Avoid request-time X API
calls unless you deliberately want a live server and cost controls.

## Costs

X API pay-per-use pricing changes over time; check `console.x.com` for the
current rate card. This app estimates cost from the resources it reads. Typical
current public pricing is around `$0.01` per user read and `$0.005` per post
read, with 24-hour dedupe for repeat reads.

Useful commands:

```sh
bun run cost
bun run cost --since 30d --daily
bun run status
```

## Local Development

```sh
bun run dev          # Vite with fake data by default; no server or network
bun run dev:static   # Vite using exported snapshots from public/
bun run dev:live     # Vite + local API server, no refresh daemon by default
```

`bun run dev:static` previews the exported snapshots in `public/`. `bun run
dev:live` points the UI at the local API server. Live mode is useful while
developing server behavior, but production deploys should use static mode.

`bun run server` does not schedule background refreshes unless
`ENABLE_REFRESH_DAEMON=true` is set. `REFRESH_INTERVAL=1 hour` controls the live
cache TTL and optional daemon cadence.

`bun run export` uses the existing local DB. Use `bun run export --refresh` when
you explicitly want export to hit the X API first.

Other commands: `bun run xrank --help` lists everything (`refresh`, `export`,
`publish`, `cost`, `status`).

## Architecture

```txt
xrank.config.ts roster
  -> bun run refresh
  -> local SQLite cache at ./data/snapshots.db
  -> bun run export
  -> public/snapshot.json + public/snapshots/*.json
  -> bun run build
  -> static CDN
```

There is also a Bun API server (`bun run server`) exposing `/api/snapshot` and
`/api/refresh` over Effect HTTP for local/live experiments. It is not required
for the static self-host path.

## Conventions

- Use `bun` and `bunx`.
- Keep `xrank.config.ts` as the user-editable setup surface.
- `HttpApi` in `src/api.ts` is the live API contract.
- `bun run typecheck` and `bun run build` are the checks.

## Troubleshooting

**`bun run doctor` fails with "X_BEARER_TOKEN not set"**
Make sure `.env` exists and contains `X_BEARER_TOKEN=AAAA...`. The token starts with `AAAA`, not `xai-`.

**`bun run refresh` hits rate limits quickly**
Reduce `schedule.every` in `xrank.config.ts`. Each refresh batches calls per account; with many accounts, spread the interval. Run `bun run cost` to see recent usage.

**Snapshots look stale**
Run `bun run refresh --force` to bypass the refresh cache TTL. Check `bun run status` for last refresh timestamp.

**`bun run export` produces no output**
Ensure `data/snapshots.db` exists — export reads from the local DB, not the X API. Run `bun run refresh` first if the DB is empty.

**Vercel deploy fails but local build works**
`bun run publish` needs `X_BEARER_TOKEN` in the Vercel environment. Add it in the Vercel dashboard under Settings → Environment Variables. Do not add it to `.env` in the repo.
