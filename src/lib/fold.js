export const FOLD_MAX = 5;

/**
 * The toolbar's next fold step. `need[i]` is how wide the row measured at step i when it last
 * overflowed there, so it unfolds only once the bar is at least that wide again. A step with no
 * width on record is tried again: the row has changed since, and the try records a fresh width.
 */
export function nextFold(fold, { overflow, width, need }) {
  if (overflow) return fold < FOLD_MAX ? fold + 1 : fold;
  if (fold > 0 && !(width < need[fold - 1])) return fold - 1;
  return fold;
}
