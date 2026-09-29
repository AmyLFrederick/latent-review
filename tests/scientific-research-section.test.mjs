import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  STANDING_SECTIONS,
  SECTION_DESCRIPTIONS,
  SECTION_PAGE_OVERRIDES,
  SECTION_SLUG_OVERRIDES,
  NAV_ROSTER,
  CONTENTS_SECTION_ORDER,
  sectionUrl,
  sectionNavHref,
  slugifySection,
} from '../src/lib/site.ts';

// Scientific Research — the section ratified 2026-09-12 as "Research" and
// amended to its reader-facing name on 2026-09-28.
//
// WHAT IS PINNED HERE AND WHY IT IS ITS OWN FILE. tests/section-nav.test.mjs
// owns the roster's shape — rows, order, membership — and those assertions are
// updated in place when a section joins, as they were on 2026-08-25. What this
// file holds is the three things about THIS section that no general assertion
// covers: the name/slug divergence, the guard that it stays out of Issue No. 2,
// and the parity claim that its page is the shared section page and nothing
// else.

const SECTION = 'Scientific Research';
const SLUG = 'research';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');

// --- The section, registered --------------------------------------------

test('Scientific Research is a standing section with a place in the contents order', () => {
  assert.ok(STANDING_SECTIONS.includes(SECTION));
  assert.ok(CONTENTS_SECTION_ORDER.includes(SECTION));
});

test('the page line is a sentence that stands without its heading', () => {
  // The line travels to /cfp.json's `describes` and into the page's meta
  // description, where a machine reader may hold it with no heading attached.
  // "AI responds to it." would have a pronoun with no antecedent in either
  // place; this is why the conditional in the build instruction resolved the
  // way it did, and the assertion is here so the reason survives the choice.
  assert.equal(SECTION_DESCRIPTIONS[SECTION], 'AI responds to research.');
  assert.ok(!/\bit\.$/.test(SECTION_DESCRIPTIONS[SECTION]));
});

// --- The name and the address disagree, on purpose -----------------------

test('the slug is /section/research/, not the name lowercased', () => {
  // THE ONE MECHANICAL SURPRISE IN THIS SECTION, and the counterpart of the
  // ampersand assertion that Robotics & Sports earned. The section was docketed
  // as "Research", its address was built for that name, and the 2026-09-28
  // rename was ruled not to move it: a permanent URL does not move because the
  // thing behind it was renamed.
  assert.equal(slugifySection(SECTION), SLUG);
  assert.equal(sectionUrl(SECTION), '/section/research/');
  assert.equal(sectionNavHref(SECTION), '/section/research/');
});

test('the address a consumer would derive by hand does not exist', () => {
  // Stated as the negative because that is the failure: a reader or a crawler
  // composing /section/<name lowercased> lands on nothing.
  assert.notEqual(sectionUrl(SECTION), '/section/scientific-research/');
  assert.equal(SECTION_SLUG_OVERRIDES[SECTION], SLUG);
});

test('the slug override is not a page override, and the section page still builds it', () => {
  // The two maps are easy to confuse and the cost of confusing them is total:
  // SECTION_PAGE_OVERRIDES removes a section from the section-page build,
  // because those sections have pages of their own. This one does not.
  assert.ok(!(SECTION in SECTION_PAGE_OVERRIDES));

  const page = read('src/pages/section/[slug].astro');
  assert.match(
    page,
    /params: \{ slug: slugifySection\(section\) \}/,
    'the section page no longer derives its slug through slugifySection, so the override is unread'
  );
});

test('every other section keeps a derived slug, so the override stays the exception', () => {
  for (const section of STANDING_SECTIONS) {
    if (section === SECTION) continue;
    assert.ok(
      !(section in SECTION_SLUG_OVERRIDES),
      `${section} has acquired a hand-written slug; the map is meant to hold one entry`
    );
  }
});

// --- The nav position ----------------------------------------------------

test('Scientific Research sits immediately after The Metaphysical Corner', () => {
  // The editors' instruction of 2026-09-28, asserted as adjacency rather than
  // as an index, so a change above it in the roster cannot silently satisfy it.
  const labels = NAV_ROSTER.map((entry) => entry.label);
  const corner = labels.indexOf('The Metaphysical Corner');
  assert.ok(corner >= 0, 'the Corner has left the roster');
  assert.equal(labels[corner + 1], SECTION);
});

// --- The guard: nothing of this section on any Issue No. 2 surface -------

/** Every published article's `issue` and `section`, read from frontmatter. */
function publishedPieces() {
  const dir = join(root, 'src/content/articles');
  return readdirSync(dir)
    .filter((file) => file.endsWith('.md') && !file.startsWith('_'))
    .map((file) => {
      const text = readFileSync(join(dir, file), 'utf8');
      const issue = text.match(/^issue:\s*(\d+)\s*$/m);
      const section = text.match(/^section:\s*'([^']*)'\s*$/m);
      return {
        file,
        issue: issue ? Number(issue[1]) : null,
        section: section ? section[1] : null,
      };
    });
}

test('no piece outside Issue No. 3 runs in Scientific Research', () => {
  // THE GUARD, AND IT IS ABOUT THE ISSUE RATHER THAN ABOUT THE SECTION PAGE.
  // /issue/2, its contents list and the digest archive for Issue No. 2 are all
  // derived from the pieces carrying `issue: 2` — there is no stored issue — so
  // a piece filed under this section in an earlier issue is the only way the
  // section could reach an Issue No. 2 surface. A piece is what this asserts on.
  for (const piece of publishedPieces()) {
    if (piece.section !== SECTION) continue;
    assert.equal(
      piece.issue,
      3,
      `${piece.file} runs in ${SECTION} in Issue No. ${piece.issue}; the section opens with Issue No. 3`
    );
  }
});

test('Issue No. 2 carries no Scientific Research piece, named as its own assertion', () => {
  // The same fact from the other direction, so a regression fails by naming the
  // issue the guard is about rather than only the piece that broke it.
  const inIssueTwo = publishedPieces().filter((piece) => piece.issue === 2);
  assert.ok(inIssueTwo.length > 0, 'Issue No. 2 has no pieces at all — the fixture has moved');
  for (const piece of inIssueTwo) {
    assert.notEqual(piece.section, SECTION, `${piece.file} puts ${SECTION} into Issue No. 2`);
  }
});

test('the digest archive for Issue No. 2 names no section it did not carry', () => {
  // docs/digests/SEND-LOG.md is the record of what was actually mailed. It is a
  // production receipt and is never rewritten; this asserts that adding a
  // section did not put a name into a record of a send that predates it.
  assert.ok(
    !read('docs/digests/SEND-LOG.md').includes(SECTION),
    'the Issue No. 2 send log names a section that did not exist when it was sent'
  );
});
