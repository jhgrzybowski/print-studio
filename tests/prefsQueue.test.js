import { test } from "node:test";
import assert from "node:assert/strict";
import { prefsQueue } from "../src/lib/prefsQueue.js";

// A server whose PUTs settle only when the test says so.
function server() {
  const calls = [];
  const put = (doc) =>
    new Promise((resolve, reject) => {
      calls.push({ doc, ok: () => resolve(doc), fail: () => reject(new Error("PUT failed")) });
    });
  return { calls, put };
}
const tick = () => new Promise((r) => setImmediate(r));
const add = (id) => (p) => ({ archived: [...(p.archived || []), id] });

test("saves go out one at a time, each built on what the server confirmed", async () => {
  const s = server();
  const shown = [];
  const q = prefsQueue(s.put, (d) => shown.push(d));
  q.reset({ theme: "dark" });
  const a = q.save(add(1));
  const b = q.save(add(2));
  assert.deepEqual(shown.at(-1), { theme: "dark", archived: [1, 2] });
  await tick();
  assert.equal(s.calls.length, 1, "the second PUT waits for the first");
  s.calls[0].ok();
  await a;
  await tick();
  assert.deepEqual(s.calls[1].doc, { theme: "dark", archived: [1, 2] });
  s.calls[1].ok();
  assert.deepEqual(await b, { theme: "dark", archived: [1, 2] });
});

test("a failed save drops only its own change, even with a later one queued", async () => {
  const s = server();
  const q = prefsQueue(s.put, () => {});
  q.reset({});
  const a = q.save(add(1));
  const b = q.save(add(2));
  await tick();
  s.calls[0].fail();
  await assert.rejects(a);
  assert.deepEqual(q.current(), { archived: [2] });
  await tick();
  assert.deepEqual(s.calls[1].doc, { archived: [2] }, "the failed change is not sent again");
  s.calls[1].ok();
  assert.deepEqual(await b, { archived: [2] });
});

test("signing out drops saves still waiting their turn", async () => {
  const s = server();
  const q = prefsQueue(s.put, () => {});
  q.reset({ a: 1 });
  const first = q.save({ b: 2 });
  const second = q.save({ c: 3 });
  await tick();
  q.reset({});
  s.calls[0].ok();
  await first;
  await second;
  assert.equal(s.calls.length, 1);
  assert.deepEqual(q.current(), {});
});
