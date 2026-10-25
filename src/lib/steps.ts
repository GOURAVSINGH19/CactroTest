export interface StepDef {
  id: number;
  label: string;
}

// Same steps for every release; a release only stores which ids are completed.
export const STEPS: readonly StepDef[] = [
  { id: 1, label: "All relevant Github pull requests have been merged" },
  { id: 2, label: "CHANGELOG.md files have been updated" },
  { id: 3, label: "All tests are passing" },
  { id: 4, label: "Releases in Github created" },
  { id: 5, label: "Deployed in demo" },
  { id: 6, label: "Tested thoroughly in demo" },
  { id: 7, label: "Deployed in production" },
];

export const isValidStepId = (id: number): boolean =>
  STEPS.some((s) => s.id === id);
