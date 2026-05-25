# ValoTrak

A **Valorant companion desktop app**. ValoTrak shows your live lobby (allies and
enemies, with ranks and recent stats), your profile and rank, your daily store —
and a rank/stat history for the players you follow. It reads the local Riot
Client for live in-game data and can sign you in remotely with your Riot account
so your profile and shop work even when the game isn't running.

> ⚠️ **Disclaimer.** ValoTrak is an unofficial, third-party tool. It is not
> affiliated with or endorsed by Riot Games. You sign in on Riot's own hosted
> page. Some features (notably revealing client-hidden enemy data during agent
> select) are against Riot's policy and may lead to a ban — use them at your own
> risk under Riot's Terms of Service.

## Features

- **Match** — Live lobby detection (agent select / in-game). Shows each player's
  rank, K/D, ACS, HS%, Win% and most-played agents. Optional enemy reveal (with
  a ban-risk warning) and a one-click dodge during agent select.
- **Profile** — Your current and peak rank, aggregated stats, top agents and
  recent competitive matches with a clickable match recap.
- **Shop** — Your daily offers, featured bundles and Night Market with VP costs
  and live countdowns.
- **Trends** — Rank and stat history charts for followed players, built from
  snapshots captured each time you refresh the live lobby.
- **Tracked players** — Follow players (requires a ValoTrak account) to build
  and keep their stat history across sessions.
- **Auto-update** — Installed builds update themselves from signed GitHub
  releases.
- **Bilingual** — English and French UI.

## How it works

Two independent data paths feed the app:

1. **Riot data** comes from your Riot session, resolved in this order:
   - the **local Riot Client** (game or launcher running) — read directly in
     Rust over the client's self-signed local API; this also powers real-time
     lobby/match detection over a local websocket;
   - a **remote session** — sign in on Riot's official hosted page in a
     dedicated WebView; this works with nothing running and persists for silent
     re-auth. Authenticated `pvp.net` enrichment (MMR, match history, names,
     storefront) is proxied through the Rust HTTP plugin to avoid CORS.
2. **Social data** (followed players, stat history) lives on the ValoTrak
   server behind your own account (Better Auth), independent of your Riot login.

Live in-game features (Match lobby, dodge) require **Valorant running on
Windows**. Profile and Shop also work off the remote Riot login. When neither is
available, the app shows an empty state — there is no demo data.

## Tech stack

- **Desktop shell** — [Tauri v2](https://v2.tauri.app/) (Rust backend)
- **Frontend** — React 19, [TanStack Router](https://tanstack.com/router)
  (file-based) + [TanStack Query](https://tanstack.com/query), Tailwind CSS v4,
  shadcn/ui, i18next
- **Backend API** — [Hono](https://hono.dev/) + [tRPC](https://trpc.io/) on Bun
- **Auth** — [Better Auth](https://better-auth.com/) (bearer tokens for the
  desktop webview)
- **Database** — PostgreSQL (Neon serverless driver) via
  [Drizzle ORM](https://orm.drizzle.team/)
- **Riot networking (Rust)** — `reqwest` with native TLS (SChannel) to accept
  the local self-signed cert; `tokio-tungstenite` for the local websocket
- **Tooling** — [Turborepo](https://turborepo.com/) + Bun workspaces,
  [Biome](https://biomejs.dev/) (lint/format)

## Project structure

```
valotrak/
├── apps/
│   ├── web/            # Desktop app: React frontend + Tauri (Rust) in src-tauri/
│   └── server/         # Backend API (Hono + tRPC + Better Auth)
├── packages/
│   ├── valorant/       # Framework-agnostic Riot domain logic (endpoints,
│   │                   #   enrichment, stat aggregation, storefront, static API)
│   ├── api/            # tRPC routers (followed players, stat cache)
│   ├── auth/           # Better Auth configuration
│   ├── db/             # Drizzle schema & client (Neon Postgres)
│   ├── ui/             # Shared shadcn/ui components and styles
│   ├── env/            # Validated environment variables (t3-env)
│   └── config/         # Shared TypeScript / tooling config
```

## Prerequisites

- [Bun](https://bun.sh) `1.3.14` (see `packageManager` in `package.json`)
- A PostgreSQL database (e.g. a [Neon](https://neon.tech) project)
- The [Rust toolchain](https://www.rust-lang.org/tools/install) and the
  [Tauri v2 system prerequisites](https://v2.tauri.app/start/prerequisites/) to
  run or build the desktop app
- **Windows** is required for the live in-game features (Valorant is
  Windows-only)

## Getting started

Install dependencies from the repo root:

```bash
bun install
```

### Environment variables

Create `apps/server/.env`:

```bash
DATABASE_URL=postgres://...            # PostgreSQL connection string
BETTER_AUTH_SECRET=...                 # min 32 chars (e.g. openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3000  # server base URL
CORS_ORIGIN=http://localhost:3001      # web origin allowed by the server
# NODE_ENV defaults to "development"
```

Create `apps/web/.env`:

```bash
VITE_SERVER_URL=http://localhost:3000  # API base URL the frontend talks to
```

### Database

Apply the schema to your database:

```bash
bun run db:push
```

### Run in development

Start everything (web + server):

```bash
bun run dev
```

- Web app: <http://localhost:3001>
- API: <http://localhost:3000>

Or run them individually with `bun run dev:web` / `bun run dev:server`.

### Run the desktop app

The desktop shell is required for the Riot features (local client access and the
remote-login WebView):

```bash
cd apps/web
bun run desktop:dev     # launch the Tauri app in development
bun run desktop:build   # build a desktop bundle
```

> The server is only needed for the account-based features (followed players and
> their history). Profile, Shop and the live Match view work from the desktop
> shell + Riot alone.

## Available scripts

Run from the repo root unless noted:

| Script | Description |
| --- | --- |
| `bun run dev` | Start all apps in development |
| `bun run dev:web` / `bun run dev:server` | Start only the web app / server |
| `bun run build` | Build all apps |
| `bun run check-types` | Type-check across the monorepo |
| `bun run check` | Format and lint with Biome |
| `bun run db:push` | Push the Drizzle schema to the database |
| `bun run db:generate` / `db:migrate` | Generate / run migrations |
| `bun run db:studio` | Open Drizzle Studio |
| `cd apps/web && bun run desktop:dev` | Run the Tauri desktop app |
| `cd apps/web && bun run desktop:build` | Build the Tauri desktop app |

Tests for the Valorant domain logic:

```bash
cd packages/valorant && bun test
```

## Shared UI

shadcn/ui primitives are shared through `packages/ui`:

- Design tokens & global styles: `packages/ui/src/styles/globals.css`
- Shared primitives: `packages/ui/src/components/*`
- Add more shared primitives from the repo root:

  ```bash
  bunx shadcn@latest add accordion dialog popover sheet table -c packages/ui
  ```

  ```tsx
  import { Button } from "@valotrak/ui/components/button";
  ```

## Releasing

Desktop releases are built, signed and published by GitHub Actions when a
`v*` tag is pushed (installers + an updater `latest.json`). See
[`apps/web/src-tauri/RELEASING.md`](apps/web/src-tauri/RELEASING.md) for the full
procedure (version bump → tag → CI).
