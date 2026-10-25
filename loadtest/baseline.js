// k6 stepped load test for the GraphQL API, with per-level results.
//   k6 run -e URL=https://cactro-test-iota.vercel.app --summary-export loadtest/results/baseline.json loadtest/baseline.js
//   -e WRITES=1 adds ~5% createRelease (rows named "loadtest-w-*")
//
// Each level ramps for 5s then holds for 25s. Only the hold window is tagged
// stage=vu<N>, so the numbers for each level are not mixed with ramping.
import http from "k6/http";
import { check } from "k6";
import { Rate } from "k6/metrics";
import exec from "k6/execution";

const BASE = (__ENV.URL || "http://localhost:3000").replace(/\/$/, "");
const WRITES = __ENV.WRITES === "1";
const PAGED = __ENV.PAGED === "1";
const LEVELS = [10, 25, 50, 100, 200, 400];
const RAMP_S = 5;
const HOLD_S = 25;
const LEVEL_S = RAMP_S + HOLD_S;

const gqlErrors = new Rate("graphql_errors");

const stages = [];
const thresholds = {};
for (const n of LEVELS) {
  stages.push({ duration: `${RAMP_S}s`, target: n }, { duration: `${HOLD_S}s`, target: n });
  // Sub-metric thresholds exist so k6 reports each level separately. They never abort the run.
  thresholds[`http_req_duration{stage:vu${n}}`] = ["p(95)<1000"];
  thresholds[`http_req_failed{stage:vu${n}}`] = ["rate<0.01"];
  thresholds[`graphql_errors{stage:vu${n}}`] = ["rate<0.01"];
  thresholds[`http_reqs{stage:vu${n}}`] = ["count>=0"];
}
stages.push({ duration: "15s", target: 0 });

export const options = { stages, thresholds };

function currentStage() {
  const t = (Date.now() - exec.scenario.startTime) / 1000;
  const i = Math.floor(t / LEVEL_S);
  if (i >= LEVELS.length) return "down";
  return t - i * LEVEL_S < RAMP_S ? "ramp" : `vu${LEVELS[i]}`;
}

const headers = { "Content-Type": "application/json" };

export default function () {
  const stage = currentStage();
  const post = (query, variables) =>
    http.post(`${BASE}/api/graphql`, JSON.stringify({ query, variables }), {
      headers,
      timeout: "30s",
      tags: { stage },
    });

  let res;
  if (WRITES && Math.random() < 0.05) {
    res = post(
      `mutation($n: String!) { createRelease(name: $n, dueDate: "2027-01-01T10:00:00Z") { id } }`,
      { n: `loadtest-w-${__VU}-${__ITER}` },
    );
  } else {
    // PAGED=1 targets the paginated API (first page of 20); default is the original full-list query.
    res = PAGED
      ? post(
          `{ releases(limit: 20) { items { id name dueDate status steps { id label completed } } total hasMore } }`,
        )
      : post(`{ releases { id name dueDate status steps { id label completed } } }`);
  }
  // GraphQL returns HTTP 200 even for failures, so look inside the body too.
  const bad = res.status !== 200 || (res.body && res.body.includes('"errors"'));
  gqlErrors.add(bad ? 1 : 0, { stage });
  check(res, { "status 200": (r) => r.status === 200, "no graphql errors": () => !bad }, { stage });
}
