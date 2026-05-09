export interface TimeState {
  /** Canonical UTC instant currently displayed by the grid. */
  instantUtc: string;
  /** True iff the user has scrubbed the slider away from "now". */
  isModified: boolean;
}

export const TIME_STATE_DEFAULT: TimeState = {
  instantUtc: new Date(0).toISOString(),
  isModified: false,
};
