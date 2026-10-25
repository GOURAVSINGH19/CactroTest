import type { Status } from "./status";

export interface StepView {
  id: number;
  label: string;
  completed: boolean;
}

export interface ReleaseView {
  id: string;
  name: string;
  dueDate: string;
  additionalInfo: string | null;
  status: Status;
  steps: StepView[];
}
