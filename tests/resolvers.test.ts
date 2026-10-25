import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory stand-in for the Prisma release table.
type Row = {
  id: string;
  name: string;
  dueDate: Date;
  additionalInfo: string | null;
  completedSteps: number[];
};
const rows = new Map<string, Row>();
let seq = 0;

vi.mock("../src/lib/db", () => ({
  prisma: {
    release: {
      findMany: async ({ skip = 0, take }: { skip?: number; take?: number } = {}) =>
        [...rows.values()].slice(skip, take === undefined ? undefined : skip + take),
      count: async () => rows.size,
      findUnique: async ({ where }: { where: { id: string } }) =>
        rows.get(where.id) ?? null,
      create: async ({ data }: { data: Omit<Row, "id" | "completedSteps"> }) => {
        const row = { ...data, id: `r${++seq}`, completedSteps: [] };
        rows.set(row.id, row);
        return row;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<Row>;
      }) => {
        const row = { ...rows.get(where.id)!, ...data };
        rows.set(where.id, row);
        return row;
      },
      deleteMany: async ({ where }: { where: { id: string } }) => ({
        count: rows.delete(where.id) ? 1 : 0,
      }),
    },
  },
}));

import { yoga } from "../src/graphql/yoga";
import { STEPS } from "../src/lib/steps";

// Goes through the real HTTP handler, same path as POST /api/graphql.
async function run(query: string, variables?: Record<string, unknown>) {
  const res = await yoga.fetch("http://localhost/api/graphql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return (await res.json()) as {
    data?: Record<string, unknown>;
    errors?: { message: string }[];
  };
}

const FIELDS = "id name status additionalInfo steps { id completed }";

beforeEach(() => rows.clear());

describe("release API", () => {
  it("creates, toggles steps, updates info and deletes", async () => {
    const created = await run(
      `mutation { createRelease(name: " v1.0 ", dueDate: "2026-12-01T10:00:00Z") { ${FIELDS} } }`,
    );
    const rel = created.data!.createRelease as { id: string; name: string; status: string };
    expect(rel.name).toBe("v1.0");
    expect(rel.status).toBe("planned");

    const toggle = (stepId: number, completed: boolean) =>
      run(
        `mutation($id: ID!, $s: Int!, $c: Boolean!) { toggleStep(releaseId: $id, stepId: $s, completed: $c) { status } }`,
        { id: rel.id, s: stepId, c: completed },
      );

    expect((await toggle(1, true)).data!.toggleStep).toEqual({ status: "ongoing" });
    expect((await toggle(1, true)).data!.toggleStep).toEqual({ status: "ongoing" }); // idempotent
    expect((await toggle(1, false)).data!.toggleStep).toEqual({ status: "planned" });

    for (const s of STEPS) await toggle(s.id, true);
    const all = await run(`{ release(id: "${rel.id}") { status } }`);
    expect(all.data!.release).toEqual({ status: "done" });

    const info = await run(
      `mutation { updateAdditionalInfo(releaseId: "${rel.id}", additionalInfo: "ship it") { additionalInfo } }`,
    );
    expect(info.data!.updateAdditionalInfo).toEqual({ additionalInfo: "ship it" });

    const upd = await run(
      `mutation { updateRelease(id: "${rel.id}", name: " v1.1 ", dueDate: "2027-01-02T09:00:00Z") { name dueDate additionalInfo } }`,
    );
    expect(upd.data!.updateRelease).toEqual({
      name: "v1.1",
      dueDate: "2027-01-02T09:00:00.000Z",
      additionalInfo: "ship it", // omitted field is untouched
    });
    const badName = await run(
      `mutation { updateRelease(id: "${rel.id}", name: "  ") { id } }`,
    );
    expect(badName.errors?.[0].message).toBe("Name is required");

    const del = await run(`mutation { deleteRelease(id: "${rel.id}") }`);
    expect(del.data!.deleteRelease).toBe(true);
    expect((await run(`{ releases { items { id } total } }`)).data!.releases).toEqual({
      items: [],
      total: 0,
    });
  });

  it("paginates with limit/offset", async () => {
    for (let i = 0; i < 5; i++) {
      await run(
        `mutation { createRelease(name: "r${i}", dueDate: "2026-12-0${i + 1}T10:00:00Z") { id } }`,
      );
    }
    const page = async (args: string) =>
      (await run(`{ releases${args} { items { name } total hasMore } }`)).data!
        .releases as { items: { name: string }[]; total: number; hasMore: boolean };

    const first = await page("(limit: 2, offset: 0)");
    expect(first.items.map((r) => r.name)).toEqual(["r0", "r1"]);
    expect(first.total).toBe(5);
    expect(first.hasMore).toBe(true);

    const last = await page("(limit: 2, offset: 4)");
    expect(last.items.map((r) => r.name)).toEqual(["r4"]);
    expect(last.hasMore).toBe(false);

    // default page size is 20, so everything fits and nothing is "more"
    const all = await page("");
    expect(all.items).toHaveLength(5);
    expect(all.hasMore).toBe(false);
  });

  it("rejects bad input", async () => {
    const blank = await run(
      `mutation { createRelease(name: "  ", dueDate: "2026-12-01T10:00:00Z") { id } }`,
    );
    expect(blank.errors?.[0].message).toBe("Name is required");

    const badDate = await run(
      `mutation { createRelease(name: "x", dueDate: "nope") { id } }`,
    );
    expect(badDate.errors?.[0].message).toBe("Invalid due date");

    const badStep = await run(
      `mutation { toggleStep(releaseId: "x", stepId: 999, completed: true) { id } }`,
    );
    expect(badStep.errors?.[0].message).toBe("Unknown step");
  });
});
