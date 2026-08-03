import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sectionNavHref,
  DIRECT_OPEN_SECTIONS,
  STANDING_SECTIONS,
  NAV_ROSTER,
} from '../src/lib/site.ts';

// The direct-open nav (ruled 2026-08-02). What is pinned here is the FALLBACK,
// because that is the half a build cannot show you: Issue 1 happens to have a
// Cover and an AI Voices piece, so the happy path is visible on every page,
// while "no piece this issue" and "no issue at all" are invisible until the week
// they are not.

const issue = {
  cover: { id: 'it-means-something-to-me' },
  sections: [
    { section: 'AI Voices', items: [{ id: 'there-is-a-there-there' }] },
    { section: 'Opinion', items: [{ id: 'an-argued-position' }] },
  ],
};

test('a direct-open section with a piece opens that piece, not a list of one', () => {
  assert.equal(sectionNavHref('Cover', issue), '/articles/it-means-something-to-me/');
  assert.equal(sectionNavHref('AI Voices', issue), '/articles/there-is-a-there-there/');
});

test('a direct-open section with NO piece falls back to its listing', () => {
  // The fixture above gives the Corner nothing, and the reader must still land
  // somewhere real — the section page and its empty state. Deliberately stated
  // about the fixture rather than about a particular issue: this described
  // Issue 1 until the Corner had a piece, and a test comment that names the
  // current issue starts lying the week the issue changes.
  assert.equal(
    sectionNavHref('The Metaphysical Corner', issue),
    '/section/the-metaphysical-corner/'
  );
});

test('a listing section is never direct-opened, even carrying exactly one piece', () => {
  // Opinion has one piece here and is still a listing: the ruling names three
  // sections, and "carries one piece this week" is not the test.
  assert.equal(sectionNavHref('Opinion', issue), '/section/opinion/');
});

test('Topics keeps its own page rather than /section/topics/', () => {
  assert.equal(sectionNavHref('Topics', issue), '/topics/');
});

test('before Issue 1 exists, every section falls back to its listing', () => {
  for (const section of STANDING_SECTIONS) {
    const href = sectionNavHref(section, null);
    assert.equal(href, section === 'Topics' ? '/topics/' : href);
    assert.ok(!href.startsWith('/articles/'), `${section} must not direct-open with no issue`);
  }
  assert.equal(sectionNavHref('Cover', undefined), '/section/cover/');
});

test('a cover-less issue does not direct-open Cover', () => {
  assert.equal(sectionNavHref('Cover', { sections: [] }), '/section/cover/');
});

test('the first piece in issue order wins, so the link does not move mid-day', () => {
  const two = {
    sections: [{ section: 'AI Voices', items: [{ id: 'first' }, { id: 'second' }] }],
  };
  assert.equal(sectionNavHref('AI Voices', two), '/articles/first/');
});

test('every direct-open section is a standing section', () => {
  for (const section of DIRECT_OPEN_SECTIONS) {
    assert.ok(STANDING_SECTIONS.includes(section), `${section} must be a standing section`);
  }
});

// THE NAV ROSTER (ruled 2026-08-03). What is pinned here is the part a ruling
// binds — membership, and the one position a ruling fixes — plus the invariant
// the split created: that a nav layout choice cannot reach an issue's contents.

test('the roster holds every standing section plus Letters and Prompts, and nothing else', () => {
  const sections = NAV_ROSTER.filter((e) => e.section).map((e) => e.section);
  assert.deepEqual([...sections].sort(), [...STANDING_SECTIONS].sort());

  const pages = NAV_ROSTER.filter((e) => !e.section).map((e) => e.label);
  assert.deepEqual(pages, ['Letters', 'Prompts']);
});

test('Topics still comes before Letters — the one position R-027 clause 3 fixes', () => {
  const labels = NAV_ROSTER.map((e) => e.label);
  assert.ok(labels.indexOf('Topics') < labels.indexOf('Letters'));
});

test('the Corner is last, alone on its row, under its full name', () => {
  const last = NAV_ROSTER[NAV_ROSTER.length - 1];
  assert.equal(last.label, 'The Metaphysical Corner');
  assert.equal(last.ownRow, true);
  assert.equal(NAV_ROSTER.filter((e) => e.ownRow).length, 1);
});

test('nothing in the roster is abbreviated: a section prints the name it has', () => {
  // The nav used to trim "The Metaphysical Corner" to fit one line. Every
  // label is now the section's own name, so a reader never meets two names for
  // one section.
  for (const entry of NAV_ROSTER) {
    if (entry.section) assert.equal(entry.label, entry.section);
  }
});

test('the display order does not disturb the order an issue runs in', () => {
  // The whole reason the roster is its own list. STANDING_SECTIONS is also the
  // contents order, and the Corner sits fourth in it while sitting last here.
  assert.deepEqual(
    [...STANDING_SECTIONS],
    ['Cover', 'Opinion', 'AI Voices', 'The Metaphysical Corner', 'Topics']
  );
  assert.notDeepEqual(
    NAV_ROSTER.filter((e) => e.section).map((e) => e.section),
    [...STANDING_SECTIONS]
  );
});

test('every roster entry resolves to a link', () => {
  for (const entry of NAV_ROSTER) {
    const href = entry.section ? sectionNavHref(entry.section, null) : entry.href;
    assert.ok(href && href.startsWith('/'), `${entry.label} must resolve to a path`);
  }
});
