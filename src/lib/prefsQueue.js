// The preferences PUT replaces the whole object. Saves go out one at a time, and each is rebased
// onto what the server last confirmed when its turn comes, so a failed save drops only its own
// change and an earlier reply can't overwrite a later one.

const apply = (doc, entries) => entries.reduce((d, e) => ({ ...d, ...(typeof e.patch === "function" ? e.patch(d) : e.patch) }), doc);

/**
 * `put(doc)` sends a whole document and resolves to what the server stored (or nothing).
 * `onChange(doc)` gets the document to show: confirmed state plus every save still in flight.
 */
export function prefsQueue(put, onChange) {
  let base = {};
  let pending = [];
  let tail = Promise.resolve();
  let generation = 0;
  const current = () => apply(base, pending);

  return {
    current,
    /** Start again from `doc` (freshly read, or {} when signed out); saves still in flight are dropped. */
    reset(doc) {
      generation += 1;
      base = doc;
      pending = [];
    },
    /** A patch may be a function of the newest preferences, so quick changes in a row don't undo each other. */
    save(patch) {
      const entry = { patch };
      const gen = generation;
      pending.push(entry);
      onChange(current());
      const run = tail.then(async () => {
        if (gen !== generation) return current();
        const next = apply(base, [entry]);
        try {
          const saved = await put(next);
          if (gen === generation) base = saved || next;
        } finally {
          pending = pending.filter((e) => e !== entry);
          if (gen === generation) onChange(current());
        }
        return current();
      });
      tail = run.catch(() => {});
      return run;
    },
  };
}
