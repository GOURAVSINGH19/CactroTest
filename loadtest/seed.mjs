// Seed or clean load-test data through the public GraphQL API (no DB access needed).
//   node loadtest/seed.mjs seed  <url> [count=1000]
//   node loadtest/seed.mjs clean <url>      (deletes every release whose name starts with "loadtest-")
const [cmd, urlArg, countArg] = process.argv.slice(2);
if (!["seed", "clean"].includes(cmd) || !urlArg) {
  console.error("usage: node loadtest/seed.mjs <seed|clean> <url> [count]");
  process.exit(1);
}
const endpoint = urlArg.replace(/\/$/, "") + "/api/graphql";

async function gql(query, variables) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

async function inBatches(items, size, fn) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
    process.stdout.write(`\r${Math.min(i + size, items.length)}/${items.length}`);
  }
  process.stdout.write("\n");
}

if (cmd === "seed") {
  const count = Number(countArg ?? 1000);
  const base = Date.UTC(2027, 0, 1);
  const ids = Array.from({ length: count }, (_, i) => i);
  await inBatches(ids, 10, (i) =>
    gql(
      `mutation($n: String!, $d: String!) { createRelease(name: $n, dueDate: $d) { id } }`,
      { n: `loadtest-${i}`, d: new Date(base + i * 3600_000).toISOString() },
    ),
  );
  console.log(`created ${count} releases named loadtest-*`);
} else {
  const { releases } = await gql(`{ releases { id name } }`);
  const mine = releases.filter((r) => r.name.startsWith("loadtest-"));
  await inBatches(mine, 10, (r) =>
    gql(`mutation($id: ID!) { deleteRelease(id: $id) }`, { id: r.id }),
  );
  console.log(`deleted ${mine.length} loadtest-* releases (kept ${releases.length - mine.length} others)`);
}
