// node loadtest/summarize.mjs <k6-summary.json> [more.json ...]  -> per-level table
import { readFileSync } from "node:fs";
const f = (x, d = 0) => (x == null ? "-" : x.toFixed(d));
for (const file of process.argv.slice(2)) {
  const m = JSON.parse(readFileSync(file, "utf8")).metrics;
  console.log(`\n${file}`);
  console.log("users  reqs  req/s  med(ms)  p95(ms)  failed%");
  for (const n of [10, 25, 50, 100, 200, 400]) {
    const k = `{stage:vu${n}}`;
    const d = m["http_req_duration" + k], r = m["http_reqs" + k], fl = m["http_req_failed" + k];
    console.log(
      String(n).padEnd(6), String(r?.count).padEnd(5), f(r?.count / 25, 1).padEnd(6),
      f(d?.med).padEnd(8), f(d?.["p(95)"]).padEnd(8), f((fl?.value ?? fl?.rate) * 100, 2),
    );
  }
  const d = m.http_req_duration, fl = m.http_req_failed;
  console.log(`TOTAL reqs=${m.http_reqs.count} p95=${f(d["p(95)"])}ms max=${f(d.max)}ms failed=${f((fl.value ?? fl.rate) * 100, 2)}% received=${f(m.data_received.count / 1e6, 1)}MB`);
}
