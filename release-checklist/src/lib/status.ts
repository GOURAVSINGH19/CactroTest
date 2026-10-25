import { STEPS } from "./steps";

export type Status = "planned" | "ongoing" | "done";

export function computeStatus(completed: readonly number[]): Status {
  const count = new Set(completed).size;
  if (count === 0) return "planned";
  return count >= STEPS.length ? "done" : "ongoing";
}
