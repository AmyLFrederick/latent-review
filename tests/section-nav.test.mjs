import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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

// --- Robotics / Sports (editors, 2026-08-25) -------------------------------

test('the slash in the section name survives into a usable slug', () => {
  // THE ONE MECHANICAL HAZARD IN THE NAME. "Robotics / Sports" is the display
  // form the editors ruled, and it is the first section name carrying a
  // character that is also a path separator. slugifySection collapses runs of
  // non-alphanumerics, so the slash and the spaces around it become one hyphen
  // — but a change to that function that let the slash through would produce
  // /section/robotics-/-sports/, which is a different page at a nested path and
  // would 404 from every link in the nav.
  assert.equal(sectionNavHref('Robotics / Sports', null), '/section/robotics-sports/');
  assert.ok(!sectionNavHref('Robotics / Sports', null).includes('//section'));
  assert.equal(sectionNavHref('Robotics / Sports', null).split('/').filter(Boolean).length, 2);
});

test('Robotics / Sports is a listing section and never direct-opens', () => {
  // It holds MULTIPLE pieces by design, exactly as Topics and Opinion do, so it
  // is deliberately absent from DIRECT_OPEN_SECTIONS. The nav must reach its
  // listing even in the issue where it happens to carry one piece.
  assert.ok(!DIRECT_OPEN_SECTIONS.includes('Robotics / Sports'));
  const oneItem = { sections: [{ section: 'Robotics / Sports', items: [{ id: 'a-piece' }] }] };
  assert.equal(sectionNavHref('Robotics / Sports', oneItem), '/section/robotics-sports/');
});

test('Topics is still last in the contents order — the catch-all closes an issue', () => {
  // The new section is a named beat and runs with the named sections. If it
  // ever lands below Topics, an issue would run its catch-all before a section
  // defined by its subject, which inverts what the order means.
  assert.equal(STANDING_SECTIONS[STANDING_SECTIONS.length - 1], 'Topics');
  assert.ok(
    STANDING_SECTIONS.indexOf('Robotics / Sports') < STANDING_SECTIONS.indexOf('Topics')
  );
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
  assert.deepEqual([...pages].sort(), ['Letters', 'Prompts']);
});

test('Topics still comes before Letters — the one position R-027 clause 3 fixes', () => {
  const labels = NAV_ROSTER.map((e) => e.label);
  assert.ok(labels.indexOf('Topics') < labels.indexOf('Letters'));
});

test('Letters is last — correspondence closes the book', () => {
  // Ruled by the editors 2026-08-03. This is the position the whole
  // arrangement was reorganised around, so it is asserted rather than left to
  // the array's shape.
  assert.equal(NAV_ROSTER[NAV_ROSTER.length - 1].label, 'Letters');
});

test('AI Voices comes ahead of Opinion', () => {
  const labels = NAV_ROSTER.map((e) => e.label);
  assert.ok(labels.indexOf('AI Voices') < labels.indexOf('Opinion'));
});

test('the roster renders as four pinned rows, three of them the ruled arrangement', () => {
  // FINAL ARRANGEMENT, ruled 2026-08-03 from the editors' phone walk — and the
  // same arrangement Mustafa proposed in his layout pass, reached a second time
  // from the rendering.
  //
  // The rows are asserted as a SHAPE rather than as three separate facts,
  // because the thing that keeps being lost is the arrangement as a whole: a
  // change that moves one entry between rows passes every individual check and
  // still produces a nav nobody approved.
  const rows = NAV_ROSTER.reduce((acc, entry) => {
    if (entry.startsRow || acc.length === 0) acc.push([]);
    acc[acc.length - 1].push(entry.label);
    return acc;
  }, []);

  assert.deepEqual(rows, [
    ['Cover', 'AI Voices', 'Opinion', 'Topics'],
    ['The Metaphysical Corner'],
    ['Robotics / Sports'],
    ['Prompts', 'Letters'],
  ]);
});

test('the ruled rows are untouched by the row added in 2026-08-25', () => {
  // THE INSERTION IS THE CLAIM. Rows 1 and 2 are the arrangement the editors
  // walked on a phone and ruled on 2026-08-03, and adding a section must not
  // have quietly rearranged them to make room. Asserted separately from the
  // shape above so that a future change which rebalances row 1 fails HERE, with
  // the reason attached, rather than only as a diff in a four-row fixture.
  const rows = NAV_ROSTER.reduce((acc, entry) => {
    if (entry.startsRow || acc.length === 0) acc.push([]);
    acc[acc.length - 1].push(entry.label);
    return acc;
  }, []);
  assert.deepEqual(rows[0], ['Cover', 'AI Voices', 'Opinion', 'Topics']);
  assert.deepEqual(rows[1], ['The Metaphysical Corner']);
  assert.deepEqual(rows[rows.length - 1], ['Prompts', 'Letters']);
});

test('the Corner has a row to itself, under its full name', () => {
  // Restored by the three-row arrangement. It was given up when Letters had to
  // close a TWO-row nav — whatever held the second row was what a reader
  // reached last, so the Corner could not both own that row and let Letters be
  // last. A third row buys both.
  const rows = NAV_ROSTER.reduce((acc, entry) => {
    if (entry.startsRow || acc.length === 0) acc.push([]);
    acc[acc.length - 1].push(entry);
    return acc;
  }, []);
  const corner = rows.find((r) => r.some((e) => e.label === 'The Metaphysical Corner'));
  assert.equal(corner.length, 1, 'the Corner shares its row');
  assert.equal(corner[0].label, 'The Metaphysical Corner');
});

test('every row after the first is opened by an explicit marker', () => {
  // The pinning itself. Rows exist because the roster says so, not because a
  // width caused a wrap — that is what stopped the phone rendering from
  // rearranging an arrangement the editors approved on a desk.
  assert.equal(NAV_ROSTER.filter((e) => e.startsRow).length, 3, 'four rows need three markers');
  assert.ok(!NAV_ROSTER[0].startsRow, 'the first entry opens a row by position, not by marker');
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
  // contents order, and the editors' 2026-08-03 nav pass moved AI Voices ahead
  // of Opinion in the NAV without touching the order an issue runs in.
  assert.deepEqual(
    [...STANDING_SECTIONS],
    [
      'Cover',
      'Opinion',
      'AI Voices',
      'The Metaphysical Corner',
      'Robotics / Sports',
      'Topics',
    ]
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

// --- Header and footer nav are one rule (editors, 2026-08-04) ------------

const baseLayout = () =>
  readFileSync(fileURLToPath(new URL('../src/layouts/Base.astro', import.meta.url)), 'utf8');

/** A declaration's value inside the first rule whose selector matches. */
const declaration = (css, selector, property) =>
  css
    .slice(css.indexOf(`\n  ${selector} {`))
    .slice(0, css.slice(css.indexOf(`\n  ${selector} {`)).indexOf('}'))
    .match(new RegExp(`${property}:\\s*([^;]+);`))?.[1]
    ?.trim() ?? null;

test('the footer nav inherits the header nav rather than restating it', () => {
  // THE POINT IS THE ABSENCE. `.footer-governance` is a <nav>, so `nav a`
  // already governs its links — size, weight, letterspacing, case, the green and
  // the hover. What made it a different family was two overrides on top: a
  // colour of ink-soft, and a hover that moved to the accent the header links
  // REST in. Both were deleted rather than rewritten to the header's values.
  //
  // Two rules that agree today are two rules that disagree the first time one is
  // edited. One rule cannot, and that is what this asserts.
  const css = baseLayout();
  assert.ok(
    !/\n\s*\.footer-governance a\s*\{/.test(css),
    'the footer nav links have taken their own styling again'
  );
  assert.ok(
    !/\n\s*\.footer-governance a:hover\s*\{/.test(css),
    'the footer nav links have taken their own hover again'
  );
  assert.match(css, /\n {2}nav a \{/, 'the shared nav link rule is gone');
});

test('the one property the shared rule does not reach is matched by hand', () => {
  // Letterspacing on the CONTAINER, which the separators between the links
  // inherit — `nav a` declares its own, so the links were already right and the
  // dots between them were not. It was 0.1em against the links' 0.14em, so the
  // punctuation sat tighter than the words it divided.
  const css = baseLayout();
  assert.equal(
    declaration(css, '.footer-governance', 'letter-spacing'),
    declaration(css, 'nav a', 'letter-spacing'),
    'the footer nav separators no longer track with the links they divide'
  );
  assert.equal(
    declaration(css, '.footer-governance', 'font-size'),
    declaration(css, 'nav a', 'font-size')
  );
  assert.equal(
    declaration(css, '.footer-governance', 'text-transform'),
    declaration(css, 'nav a', 'text-transform')
  );
});

test('the footer nav links take the journal green, at a ratio that clears', () => {
  // They come from `nav a` now, which rests in --accent and hovers to
  // --accent-deep. At 0.72rem uppercase 600 these are ordinary text answering to
  // 4.5:1; --accent measures 5.07:1 on the ground, which is the same reasoning
  // recorded on the header nav and it governs here for the same reasons.
  const css = baseLayout();
  assert.equal(declaration(css, 'nav a', 'color'), 'var(--accent)');
  assert.equal(declaration(css, 'nav a:hover', 'color'), 'var(--accent-deep)');

  // The container keeps the quiet colour, deliberately: the separators and the
  // legal-review note are punctuation and apparatus, not navigation.
  assert.equal(declaration(css, '.footer-governance', 'color'), 'var(--ink-soft)');
});
