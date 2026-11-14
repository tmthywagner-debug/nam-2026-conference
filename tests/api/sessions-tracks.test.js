import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { startApi } from './harness.js';

/** `trackSlug` takes one slug or a comma-separated list; the result is the union. */

let api;
let close;
let slugs;
let day;

const ids = (list) => list.map((s) => s.id).sort();
const get = (query) => api.json(`/sessions?${query}`);

before(async () => {
  const started = await startApi();
  api = started.api;
  close = started.close;
  const boot = await api.json('/bootstrap');
  slugs = boot.tracks.map((t) => t.slug);
  day = boot.days[0].date;
});

after(() => close());

describe('GET /sessions?trackSlug=a,b', () => {
  test('returns exactly the union of the single-track results', async () => {
    const [a, b] = slugs;
    const onlyA = await get(`trackSlug=${a}`);
    const onlyB = await get(`trackSlug=${b}`);
    const both = await get(`trackSlug=${a},${b}`);

    assert.ok(onlyA.length > 0 && onlyB.length > 0);
    assert.deepEqual(ids(both), ids([...onlyA, ...onlyB]));
    assert.ok(both.length > onlyA.length && both.length > onlyB.length);
    assert.ok(both.every((s) => [a, b].includes(s.track.slug)));
  });

  test('three tracks, spaces and empty entries are tolerated', async () => {
    const [a, b, c] = slugs;
    const expected = ids((await Promise.all([a, b, c].map((s) => get(`trackSlug=${s}`)))).flat());
    const got = await get(`trackSlug=${encodeURIComponent(` ${a} , ${b},,${c},`)}`);
    assert.deepEqual(ids(got), expected);
  });

  test('a single value is the same as before, and an unknown slug matches nothing', async () => {
    const [a] = slugs;
    const one = await get(`trackSlug=${a}`);
    assert.ok(one.length > 0);
    assert.deepEqual(ids(await get(`trackSlug=${a},no-such-track`)), ids(one));
    assert.deepEqual(await get('trackSlug=no-such-track'), []);
  });

  test('other filters still narrow the selection', async () => {
    const [a, b] = slugs;
    const all = await get(`trackSlug=${a},${b}`);
    const onDay = await get(`trackSlug=${a},${b}&day=${day}`);
    assert.deepEqual(ids(onDay), ids(all.filter((s) => s.day === day)));
    assert.ok(onDay.length > 0 && onDay.length < all.length);

    const level = onDay[0].level;
    const narrowed = await get(`trackSlug=${a},${b}&day=${day}&level=${encodeURIComponent(level)}`);
    assert.deepEqual(ids(narrowed), ids(onDay.filter((s) => s.level === level)));
  });
});
