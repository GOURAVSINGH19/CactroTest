import { STEPS, isValidStepId } from "./steps";

export type Status = "planned" | "ongoing" | "done";

export function computeStatus(completed: readonly number[]): Status {
  // Only count ids that are still real steps (stale ids from an older step
  // list must not push a release to "done").
  const count = new Set(completed.filter(isValidStepId)).size;
  if (count === 0) return "planned";
  return count >= STEPS.length ? "done" : "ongoing";
}
