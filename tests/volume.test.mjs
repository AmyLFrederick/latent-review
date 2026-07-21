import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveVolumes, datelineFor } from '../src/lib/volume.mjs';

const d = (iso) => new Date(`${iso}T00:00:00Z`);

test('volume 1 is 2026 and numbering is 1-based in global order', () => {
  const volumes = deriveVolumes([
    { number: 2, date: d('2026-06-08') },
    { number: 1, date: d('2026-06-01') },
    { number: 3, date: d('2026-06-15') },
  ]);
  assert.deepEqual(volumes.get(1), { volume: 1, number: 1, year: 2026 });
  assert.deepEqual(volumes.get(2), { volume: 1, number: 2, year: 2026 });
  assert.deepEqual(volumes.get(3), { volume: 1, number: 3, year: 2026 });
});

test('December → January boundary: the new volume restarts numbering at 1', () => {
  const volumes = deriveVolumes([
    { number: 1, date: d('2026-12-21') },
    { number: 2, date: d('2026-12-28') },
    { number: 3, date: d('2027-01-04') },
    { number: 4, date: d('2027-01-11') },
  ]);
  assert.deepEqual(volumes.get(2), { volume: 1, number: 2, year: 2026 });
  assert.deepEqual(volumes.get(3), { volume: 2, number: 1, year: 2027 });
  assert.deepEqual(volumes.get(4), { volume: 2, number: 2, year: 2027 });
});

test('a volume whose first global issue number is arbitrary', () => {
  // Volume 3 opens at global issue 57; its within-volume number is still 1.
  const issues = [];
  for (let n = 1; n <= 56; n++) {
    issues.push({ number: n, date: d(n <= 20 ? '2026-11-01' : '2027-06-01') });
  }
  issues.push({ number: 57, date: d('2028-01-03') });
  const volumes = deriveVolumes(issues);
  assert.deepEqual(volumes.get(20), { volume: 1, number: 20, year: 2026 });
  assert.deepEqual(volumes.get(56), { volume: 2, number: 36, year: 2027 });
  assert.deepEqual(volumes.get(57), { volume: 3, number: 1, year: 2028 });
});

test('UTC decides the year, consistent with the feeds', () => {
  // 2026-12-31T23:00-05:00 is 2027-01-01T04:00Z; the date stored is the UTC
  // calendar date, so an issue dated 2027-01-01 belongs to Volume 2 even if
  // its editors saw a New Year's Eve clock.
  const volumes = deriveVolumes([
    { number: 1, date: d('2026-12-31') },
    { number: 2, date: d('2027-01-01') },
  ]);
  assert.equal(volumes.get(1).volume, 1);
  assert.equal(volumes.get(2).volume, 2);
});

test('dateline renders the ratified masthead form', () => {
  assert.equal(datelineFor({ volume: 1, number: 1 }, 'June 1, 2026'), 'Vol. 1, No. 1 · June 1, 2026');
});
