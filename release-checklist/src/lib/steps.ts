export interface StepDef {
  id: number;
  label: string;
}

// Same steps for every release; a release only stores which ids are completed.
export const STEPS: readonly StepDef[] = [
  { id: 1, label: "Create release branch" },
  { id: 2, label: "Bump version number" },
  { id: 3, label: "Update changelog" },
  { id: 4, label: "Run full test suite" },
  { id: 5, label: "Deploy to staging" },
  { id: 6, label: "QA sign-off" },
  { id: 7, label: "Deploy to production" },
  { id: 8, label: "Announce the release" },
];

export const isValidStepId = (id: number): boolean =>
  STEPS.some((s) => s.id === id);
