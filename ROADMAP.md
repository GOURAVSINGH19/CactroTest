# Release Checklist App — Step-by-Step Roadmap (with WHY)

Stack: **Next.js (App Router) + TypeScript**, **GraphQL (graphql-yoga)** inside a Next route handler, **PostgreSQL (Neon)** via **Prisma**, **Apollo Client** on the frontend, **Vitest** for tests, **Docker + docker-compose**, **k6** for stress tests, **Vercel** for deploy.

> Rule of thumb for the whole project: build the *simplest correct thing first* (phases 1–9), deploy it (10), then break it on purpose (11), then fix it (12–13). The assignment grades the **delta** between 11 and 13, so the first version should be honest and naive, not secretly optimized.

---

## Requirement → Phase map (use this as your final checklist)

| Requirement | Phase |
|---|---|
| List / create / delete releases | 4, 5 |
| Check / uncheck steps | 3, 4, 5 |
| Update additional info | 4, 5 |
| Status auto-computed | 3 |
| Single-page app | 5 |
| Postgres hosted online | 2, 10 |
| Frontend ↔ backend via GraphQL | 4, 5 |
| Simple CSS + responsive | 6 |
| README with run steps, endpoints, DB schema | 9 |
| Docker (Dockerfile + compose) | 8 |
| Automated tests | 7 |
| Single GitHub repo | 1 |
| Deployed API + UI | 10 |
| Stress test (how many users) | 11, 13 |
| Demo video (3 mandatory points) | 14 |

---

## Phase 0 — Decide before you code (30 min)

1. **Open the mockup** (the S3 link) and list the screens: releases list, create form, release detail with steps + info.
   *Why:* you build what is graded. Missing a mockup element is the cheapest mistake to avoid.
2. **Fix the 8 steps** (constant list), e.g.
   1. Create release branch 2. Bump version 3. Update changelog 4. Run full test suite 5. Deploy to staging 6. QA sign-off 7. Deploy to production 8. Announce release
   *Why:* the brief says steps are the same for every release → no `steps` table. Constants in code = simpler schema and faster reads.
3. **Pick the stack** (above).
   *Why Next.js for both:* one repo, one deploy, one language (TS), shared types between client and server. *Why GraphQL Yoga:* tiny, works in Next route handlers, no separate server needed. *Why Prisma:* typed DB access, migrations for free. *Why Neon:* free hosted Postgres with a built-in connection pooler (matters in phase 12).

---

## Phase 1 — Repo & project scaffold

```bash
npx create-next-app@latest release-checklist --ts --app --eslint --no-tailwind --src-dir
cd release-checklist
git init && git remote add origin <your github url>
```
Add `.env.local` yourself (never commit it) and add `.env.example` with placeholder values.

*Why:* a single GitHub repo is a hard requirement. `.env.example` lets reviewers run it without your secrets. `--no-tailwind` because the brief wants "a few CSS rules" — plain CSS modules/globals.css is enough.

Suggested layout:
```
src/
  app/
    page.tsx                  # the single page (SPA)
    api/graphql/route.ts      # the only API endpoint
  graphql/
    schema.ts                 # typeDefs
    resolvers.ts
  lib/
    db.ts                     # prisma singleton
    steps.ts                  # STEPS constant
    status.ts                 # computeStatus()
  components/                 # ReleaseList, ReleaseForm, ReleaseDetail, StepList
prisma/schema.prisma
tests/
loadtest/                     # k6 scripts + results
Dockerfile
docker-compose.yaml
README.md
```
*Why:* separating `lib/status.ts` (pure logic) from resolvers makes it trivially testable and reusable on client and server.

---

## Phase 2 — Database

Prisma model:
```prisma
model Release {
  id             String   @id @default(uuid())
  name           String
  dueDate        DateTime            // "date (datetime, mandatory)"
  additionalInfo String?
  completedSteps Int[]    @default([])  // indexes/ids of steps that are ON
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([dueDate])
}
```
Steps:
1. Create a Neon project → copy the **pooled** connection string into `.env.local` as `DATABASE_URL`.
2. `npx prisma migrate dev --name init`

*Why store `completedSteps` as an array on the release:* the brief says "store, for each release, which step has been completed" without a steps table. One row per release = one read gets everything (no joins).
*Why NOT store `status`:* it's derived from steps. Storing it creates two sources of truth that can drift. Compute it on read (cheap: compare array length to 8).
*Why index `dueDate`:* the list is sorted by it; you'll want that fast when the table grows (also helps phase 12).

---

## Phase 3 — Domain logic (pure functions first)

`lib/steps.ts` → `export const STEPS = [{id:1,label:'...'}, ...]`
`lib/status.ts`:
```ts
export type Status = 'planned' | 'ongoing' | 'done';
export const computeStatus = (done: number[]): Status =>
  done.length === 0 ? 'planned' : done.length === STEPS.length ? 'done' : 'ongoing';
```
*Why now:* it's the only real business rule. Write it before UI/API so both depend on one tested function. Validate step ids against `STEPS` too (reject unknown ids).

---

## Phase 4 — GraphQL API

Single endpoint: `POST /api/graphql` (Yoga in `route.ts`, export `GET` and `POST`).

Schema:
```graphql
enum Status { planned ongoing done }
type Step { id: Int!  label: String!  completed: Boolean! }
type Release {
  id: ID!  name: String!  dueDate: String!  additionalInfo: String
  status: Status!  steps: [Step!]!
}
type Query {
  releases: [Release!]!
  release(id: ID!): Release
}
type Mutation {
  createRelease(name: String!, dueDate: String!, additionalInfo: String): Release!
  toggleStep(releaseId: ID!, stepId: Int!, completed: Boolean!): Release!
  updateAdditionalInfo(releaseId: ID!, additionalInfo: String): Release!
  deleteRelease(id: ID!): Boolean!
}
```
Rules: trim + require `name`; require valid `dueDate`; `toggleStep` is idempotent (set, don't flip) — *why:* double-clicks or retries must not produce the wrong state.

`status` and `steps` are **field resolvers computed from `completedSteps`**.
*Why GraphQL fits:* the detail view wants name + status + steps in one request; the list wants only name/date/status. Clients ask for exactly what they need.

Keep this first version deliberately plain (e.g. `releases` returns everything, new Prisma client usage as in the docs). That is your **baseline** for phase 11.

---

## Phase 5 — Frontend (single page)

- `page.tsx` is one screen: left = release list + "New release" form, right (or below on mobile) = selected release detail.
- Use **Apollo Client** (`useQuery`, `useMutation`) with `ApolloProvider` in a client component.
- Components: `ReleaseList`, `ReleaseForm` (name, datetime-local, additional info), `ReleaseDetail` (steps as checkboxes, textarea for info + Save, Delete button with confirm).
- After mutations, update the Apollo cache (return the full `Release` from mutations so the cache auto-updates by `id`).
- Show loading/error states.

*Why Apollo:* normalized cache means toggling a step re-renders only that release — no manual refetch. *Why one page:* the brief says SPA; selecting a release must not trigger full navigation.

Optional (nice): optimistic response on `toggleStep` so the checkbox feels instant. *Why:* it also hides latency of the deployed API in your demo.

---

## Phase 6 — Styling & responsiveness

- ~50–80 lines of CSS in `globals.css`: system font, max-width container, card style, status badge colors (planned=grey, ongoing=amber, done=green).
- One breakpoint: `@media (max-width: 700px)` → single column, full-width buttons.
- Test in DevTools at 375px width.

*Why:* the rubric says "responsive" and "few CSS rules" — one breakpoint and flex/grid satisfies both without time sink.

---

## Phase 7 — Automated tests ("a couple")

Install: `npm i -D vitest`
1. `tests/status.test.ts`: 0 steps → planned, 1 → ongoing, all → done, unknown step id rejected.
2. `tests/resolvers.test.ts`: call the Yoga schema directly (`yoga.fetch` / `graphql()`) against a test DB or mocked Prisma: create → toggle → status changes → update info → delete.
3. (Optional) one Playwright smoke test of the UI.

*Why:* tests 1 guard the one business rule; test 2 proves the API contract that the frontend depends on. Two good tests beat ten shallow ones.

---

## Phase 8 — Docker

`Dockerfile` (multi-stage: deps → build → run, `output: 'standalone'` in `next.config`).
`docker-compose.yaml`:
```yaml
services:
  db:
    image: postgres:16
    environment: { POSTGRES_USER: app, POSTGRES_PASSWORD: app, POSTGRES_DB: releases }
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://app:app@db:5432/releases
    depends_on: [db]
volumes: { pgdata: {} }
```
Run `prisma migrate deploy` on container start (entrypoint script).

*Why:* the brief wants the backend "easily run locally with Docker". A local Postgres in compose also means reviewers need no cloud account, and you get a **local load-test target** that doesn't burn your free tier.

---

## Phase 9 — README

Sections: what it is · tech stack · run locally (npm and Docker) · env vars · **API** (single `POST /api/graphql`, list every query/mutation with a sample request) · **database schema** (table + columns + types) · tests (`npm test`) · deployment link · load-test results · architecture notes.

*Why:* the brief explicitly asks for endpoints + schema in the README, and reviewers read it first.

---

## Phase 10 — Deploy

1. Push to GitHub.
2. Vercel → import repo → set `DATABASE_URL` (Neon **pooled** URL) in Vercel env settings → deploy.
3. Run `prisma migrate deploy` against the Neon DB (from your machine once, or in the build command).
4. Smoke-test the live URL: create → check steps → edit info → delete. Also `curl` the live `/api/graphql` (you will do this in the video).

*Why Vercel + Neon:* zero-ops, free, matches Next.js. *Why pooled URL:* serverless functions open many short connections; direct connections will exhaust Postgres under load.

---

## Phase 11 — Stress test the baseline (point 1 of the video)

Tool: **k6** (`brew/choco install k6`).
```js
// loadtest/baseline.js
import http from 'k6/http'; import { check } from 'k6';
export const options = { stages: [
  { duration: '30s', target: 10 }, { duration: '30s', target: 50 },
  { duration: '30s', target: 100 }, { duration: '30s', target: 200 },
  { duration: '30s', target: 400 }, { duration: '20s', target: 0 } ],
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<1000'] } };
export default function () {
  const r = http.post(URL, JSON.stringify({ query: '{ releases { id name status } }' }),
    { headers: { 'Content-Type': 'application/json' } });
  check(r, { 'status 200': (x) => x.status === 200, 'no gql errors': (x) => !x.body.includes('"errors"') });
}
```
Mix reads and writes (create/toggle) in a second scenario. Seed ~1,000 releases first so the list query is realistic.

**Record:** VUs at which p95 > 1s, error rate > 1%, and where requests are dropped (timeouts / 5xx / 429). Save the k6 summary + a screenshot.

*Why ramp stages:* you need to *see* the knee of the curve, not just a pass/fail. *Why seed data:* an empty table hides every real bottleneck. *Why check GraphQL errors:* GraphQL returns HTTP 200 even on failure, so status-code checks alone lie.

Expected breakers: DB connection exhaustion, slow unbounded list query, cold starts, N+1 on field resolvers.

---

## Phase 12 — Optimize (point 2 of the video: *talk about it*)

Do them one at a time, re-running k6 after each, so you can say which change bought what.

| # | Optimization | Why it helps |
|---|---|---|
| 1 | **Prisma singleton** (`globalThis` cache) | Stops creating a new client/pool per request in dev/serverless |
| 2 | **Connection pooling** (Neon pooler / PgBouncer, `connection_limit` tuned) | Postgres has a hard connection cap; pooling multiplexes thousands of requests |
| 3 | **Pagination / `limit`** on `releases` (cursor or take/skip) | Unbounded list = payload and query time grow with data |
| 4 | **Select only needed columns** | Less data over the wire and through JSON |
| 5 | **Remove N+1** (derive `status`/`steps` from already-fetched row; DataLoader for anything relational) | 1 query instead of 1+N |
| 6 | **Indexes** (`dueDate`, run `EXPLAIN ANALYZE`) | Sort/filter without full scans |
| 7 | **Caching** (HTTP `Cache-Control: s-maxage` + `stale-while-revalidate` for the list, or Redis/Upstash; invalidate on mutation) | Most traffic is reads; serve them without touching the DB |
| 8 | **Region co-location** (Vercel function region = Neon region) | Removes cross-region latency per query |
| 9 | **Compression + persisted/limited queries, query depth limit** | Smaller payloads, protects from abusive queries |
| 10 | **Rate limiting** (graceful 429 instead of random drops) | Degrades predictably under overload |
| 11 | **Run on a long-lived server** (Render/Fly container) if serverless cold starts dominate | Warm pool, shared in-process cache |

*Why this order:* cheapest/largest wins first (1–5), then structural (7, 8, 11). Measure after each; discard changes that don't move the numbers.

Read up on: Postgres connection limits, PgBouncer transaction mode, N+1 & DataLoader, `EXPLAIN ANALYZE`, HTTP caching for GraphQL (GET + persisted queries).

---

## Phase 13 — Re-test and compare (point 3 of the video)

Run the **same** `loadtest/baseline.js` against the optimized deployment. Record:

| Metric | Baseline | Optimized |
|---|---|---|
| Max VUs with p95 < 1s | ? | ? |
| Error rate @ 200 VUs | ? | ? |
| Requests/sec | ? | ? |
| p95 latency @ 100 VUs | ? | ? |

Put this table in the README.

*Why identical script:* the comparison is only honest if the only variable is your code.

---

## Phase 14 — Demo video (2–5 min, aim 3–4, face visible, English)

Script:
1. **0:00–0:20** Intro, face on camera: what you built, stack.
2. **0:20–1:10** Live app on the deployed URL: create release, tick steps (status planned → ongoing → done), edit info, delete. Show phone-width layout.
3. **1:10–1:40** API calls to the deployed link: `curl`/Postman/GraphiQL hitting `/api/graphql` (query + a mutation).
4. **1:40–2:30** **Point 1:** run k6 on the *baseline*; show the VU count where errors/timeouts start and requests get dropped.
5. **2:30–3:15** **Point 2:** explain the optimizations (table in phase 12) and why each helps.
6. **3:15–3:50** **Point 3:** run k6 on optimized; show the new ceiling and the before/after table.
7. **3:50–4:00** Wrap up, repo link.

Tips: pre-run the long tests and record short clips/terminal output if live runs exceed time; keep the baseline build tagged in git (`git tag baseline`) so you can redeploy/show it.
*Why:* all 3 points are marked mandatory; a missing one fails the submission.

---

## Phase 15 — Final submission checklist

- [ ] GitHub repo public, README complete (run, endpoints, schema, load-test table)
- [ ] `.env.example` present, no secrets committed
- [ ] `docker compose up` works from a clean clone
- [ ] `npm test` passes
- [ ] Live URL works; DB is hosted online
- [ ] Baseline vs optimized numbers recorded
- [ ] Video 2–5 min, face visible, covers points 1–3
