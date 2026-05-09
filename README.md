# TimeGrid

A world-clock app for tracking time across timezones with workspaces, time
travel, and shareable URLs.

```bash
npm install
npm run dev
```

The app boots without any environment variables. To enable cloud sync, copy
`.env.local.example` to `.env.local` and fill in Kinde + Redis credentials.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run typecheck` | Strict TypeScript |
| `npm run lint` | ESLint, zero warnings |
| `npm run test` | Vitest unit + integration |
| `npm run test:cov` | Tests with coverage thresholds |
| `npm run test:e2e` | Playwright end-to-end |
| `npm run specs:check` | Spec coverage smoke check |
| `npm run verify` | typecheck + lint + tests + specs |

## Architecture

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for a tour of the layers.

```
app/                  Next.js routes and API handlers (thin)
src/
  domain/             Pure TypeScript: timezone math, workspace ops, sharing
  schemas/            Zod schemas — single source of truth
  application/        Zustand stores, app-level hooks, sync engine
  infrastructure/     localStorage, Redis, API clients, logger
  ui/features/        App-specific React components
  config/             Constants, limits, palette
  data/               Static datasets (cities, abbreviations)
specs/                Behavioral contract — Gherkin scenarios
tests/                Unit, integration, and end-to-end tests
```

## Specs

Every feature has a markdown spec under `specs/` written in Gherkin form.
Tests are named after the scenarios; `npm run specs:check` ensures every spec
has at least a healthy ratio of negative/edge-case scenarios alongside happy
paths.

## Testing

- **Unit** (`tests/unit/`): pure domain functions, ≥95% coverage on `src/domain/`,
  property-based tests for offset and DST math.
- **Integration** (`tests/integration/`): stores + storage + API clients with
  MSW + `ioredis-mock`. Exercises adversarial inputs — corrupt JSON,
  prototype pollution, quota errors, schema mismatches, retry budgets,
  conflict resolution.
- **E2E** (`tests/e2e/`): Playwright on Chromium and mobile Chromium, plus
  `axe-playwright` for accessibility.

Coverage thresholds (CI-blocking):

| Layer | Lines | Branches |
|---|---|---|
| `src/domain/` | 95% | 95% |
| `src/infrastructure/` | 90% | 85% |
| `src/application/` | 85% | 80% |
| Overall | 80% | 75% |

## Sync model

Sync is debounced (2s after the last edit). Each save sends an
`expectedRevision`; the server returns `409` if the local revision is stale,
and the client surfaces a typed conflict event the UI can resolve as
"use server" or "keep local". Network errors retry with exponential backoff
(1s, 2s, 4s, 8s, 16s, then give up).

## Tech stack

Next.js 15 · React 18 · TypeScript 5.9 (strict + `noUncheckedIndexedAccess`) ·
Tailwind · shadcn/ui primitives · Zustand · TanStack Query · Zod · date-fns ·
dnd-kit · Kinde · ioredis · Vitest · React Testing Library · MSW · Playwright ·
axe-playwright · fast-check · Lucide icons.
