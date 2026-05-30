# Contributing to x-rank

## Setup

```sh
bun install
cp .env.example .env  # set X_BEARER_TOKEN if testing live mode
```

## Verification Commands

Before submitting a PR, run:

```sh
bun run typecheck     # TypeScript type check (client + server)
bun run lint          # oxlint — fix any warnings
bun run format:check  # oxfmt — fix any formatting issues
bun run test          # (not yet implemented — coming soon)
```

## How to Contribute

1. Fork the repo and create your branch from `main`.
2. Make your changes.
3. Run the verification commands above.
4. Open a PR describing what changed and why.

## Project Conventions

- **Use `bun`** (not pnpm/node), `bunx` (not npx).
- **Effect first** — prefer Effect primitives over hand-rolled loops/caches.
- **`HttpApi` is the contract** — add endpoints to `src/api.ts` first.
- **Schema for parsing at boundaries** — use Effect Schema for all wire types.
- **No AI attribution in commits** — author your own commits.
- **No test script** — use `bun run typecheck` and `bun run build` for verification.
## Contributors
- Documentation improvements (2026)
