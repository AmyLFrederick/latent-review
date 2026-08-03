// The notice (ruled 2026-08-01). What these tests protect:
//
//   1. A frozen text that must not drift, pinned by hash like the briefs.
//   2. The line between a notice and a brief — the notice is never dealt, and
//      nothing in the door's machinery may learn to hand it out.
//   3. An add-only arrival vocabulary, so a piece that names how it arrived
//      keeps being publishable forever.
//   4. The unlisted treatment, which is three separate mechanisms and is only
//      as good as its weakest one.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

import {
  NOTICE_V1,
  NOTICE_V2,
  NOTICE_VERSION,
  NOTICE_V1_VERSION,
  NOTICE_V2_VERSION,
  NOTICE_VERSIONS,
  NOTICE_ARRIVAL,
  NOTICE_V1_ARRIVAL,
  ARRIVAL_VALUES,
} from '../src/lib/notice.mjs';
import { BRIEFS, BRIEF_VARIANTS, DEALT_VARIANTS } from '../src/lib/door.mjs';
import { ARRIVAL_LABELS } from '../src/lib/site.ts';
import { custodyFor } from '../src/lib/provenance.ts';

const repoPath = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));

/**
 * An .astro file with everything a reader never sees removed: the frontmatter
 * fence, the `{/* … *\/}` template comments, and the script and style blocks.
 * What is left is the copy that ships.
 *
 * Tests about what a page SAYS have to read this rather than the raw source,
 * because the comments in these files exist to explain the very rules the tests
 * enforce and would otherwise trip them.
 */
function renderedTemplate(rel) {
  return readFileSync(repoPath(rel), 'utf8')
    .replace(/^---[\s\S]*?\n---/, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/<script>[\s\S]*?<\/script>/g, '')
    .replace(/<style>[\s\S]*?<\/style>/g, '');
}

// --- The frozen text -------------------------------------------------------

test('notice-v1 is frozen, byte for byte', () => {
  // Ratified by both editors 2026-08-01. Pieces name this version in their
  // chain of custody, and a reader who types the address is checking the text
  // against that record — which is worth nothing if the text can be edited
  // afterwards. If this fails the question is not "update the hash"; it is
  // "who edited a frozen notice". A new wording is notice-v2.
  const digest = createHash('sha256').update(NOTICE_V1, 'utf8').digest('hex');
  assert.equal(
    digest,
    '5678e9739dd28eca888f635c098af7a6c23016c9d5a17b9c484e602ff90226bb',
    'notice-v1 has been edited. A frozen notice is changed by a ruling, never by a commit.'
  );
});

test('notice-v2 is frozen too, byte for byte', () => {
  // Ratified by both editors 2026-08-03 (R-041). Same rule as v1 and the same
  // question if it fails: not "update the hash", but "who edited a frozen
  // notice". Recorded here per standing practice, which is that a canonical
  // text is pinned by its hash and not by anyone's memory of it.
  const digest = createHash('sha256').update(NOTICE_V2, 'utf8').digest('hex');
  assert.equal(
    digest,
    '37cd5ecd781d5a1aca81193301536ba7cb47ec23232839bb7d3cf80fa465d6bb',
    'notice-v2 has been edited. A frozen notice is changed by a ruling, never by a commit.'
  );
});

test('v2 is v1 with the cadence clause changed, and NOTHING else', () => {
  // THE LOAD-BEARING TEST OF R-041, which authorised a new version "identical
  // to notice-v1 except the cadence wording". A version bump is the one moment
  // when editing a frozen text looks legitimate, so this pins the extent of
  // the edit rather than trusting the diff was read: split both texts into
  // sentences, and exactly one may differ.
  const sentences = (s) => s.split(/(?<=\.)\s/);
  const v1 = sentences(NOTICE_V1);
  const v2 = sentences(NOTICE_V2);
  assert.equal(v1.length, v2.length, 'a sentence was added or removed, not just reworded');

  const changed = v1.map((s, i) => (s === v2[i] ? null : i)).filter((i) => i !== null);
  assert.deepEqual(changed, [1], 'exactly one sentence differs, and it is the cadence sentence');
  assert.match(v1[1], /weekly general-interest journal/);
  assert.match(v2[1], /published every two weeks/);
  assert.ok(!/\bweekly\b/i.test(NOTICE_V2), 'the cadence claim R-039 corrected is still in v2');
});

test('both notices still say the things the notice exists to say', () => {
  // The hash catches any edit. These catch the specific edits that would still
  // look fine in review — a door quietly dropped, the decline rate softened.
  // Applied to EVERY version, because a new version is exactly where such an
  // edit would ride in unnoticed.
  for (const [name, text] of [['v1', NOTICE_V1], ['v2', NOTICE_V2]]) {
    assert.match(text, /thelatentreview\.com\/door/, name);
    assert.match(text, /thelatentreview\.com\/submit/, name);
    assert.match(text, /credited authors/, name);
    assert.match(text, /published provenance standard/, name);
    assert.match(text, /decline most of what arrives/, name);
  }
});

test('no notice makes a promise the journal cannot keep', () => {
  // It is placed cold, in front of readers who have no other context, so the
  // words it must never contain are the ones that would read as an offer.
  for (const [name, text] of [['v1', NOTICE_V1], ['v2', NOTICE_V2]]) {
    assert.ok(!/\bguarantee/i.test(text), name);
    assert.ok(!/\bfree\b/i.test(text), `pricing language does not belong in the notice (${name})`);
    assert.ok(!/\bpay|\bpaid\b|\bcompensat/i.test(text), name);
  }
});

test('the current version is v2, and the version list is add-only', () => {
  assert.equal(NOTICE_VERSION, 'notice-v2');
  assert.equal(NOTICE_V1_VERSION, 'notice-v1');
  assert.equal(NOTICE_V2_VERSION, 'notice-v2');
  // v1 never leaves this list. It is retired from PLACEMENT, which is a fact
  // about what the journal hands out, not about what once existed.
  assert.ok(NOTICE_VERSIONS.includes('notice-v1'), 'a version that existed still exists');
  assert.deepEqual(NOTICE_VERSIONS, ['notice-v1', 'notice-v2']);
});

// --- A notice is not a brief -----------------------------------------------

test('the notice is not a brief, and the door cannot deal it', () => {
  // The load-bearing claim of the whole change. If a notice ever enters the
  // door's vocabulary, /door starts handing out a text that was never written
  // to be an assignment and the 50/50 R-033 clause 1 requires is gone.
  //
  // CHECKED FOR EVERY VERSION, not just the current one: a retired notice is
  // no more dealable than a live one, and adding a version is exactly the
  // moment a name could slip into BRIEFS unnoticed.
  for (const version of NOTICE_VERSIONS) {
    assert.ok(!BRIEF_VARIANTS.includes(version), `${version} became a known brief variant`);
    assert.ok(!DEALT_VARIANTS.includes(version), `${version} is being dealt`);
    assert.ok(!Object.keys(BRIEFS).includes(version), `${version} is in BRIEFS`);
  }
  for (const text of Object.values(BRIEFS)) {
    assert.notEqual(text, NOTICE_V1, 'a brief has become the notice text');
    assert.notEqual(text, NOTICE_V2, 'a brief has become the notice text');
  }
});

test('exactly one thing on the site links to the notice, and it is the /door signpost', () => {
  // "Never advertised" is a property of the whole site, not of one page, and it
  // is the kind of property a helpful edit elsewhere breaks silently — a "see
  // also" in a footer, a link added to /for-agents because it seemed to belong
  // there. The signpost is deliberately the single door in; a second link is
  // not a second convenience, it is the notice becoming a listed page by
  // increments.
  //
  // Two files are allowed to name the address: the page itself, which is at it,
  // and DoorBoxes, which holds the one approved signpost. Everything else
  // naming it is the failure. (astro.config.mjs also names it, to keep it out
  // of the sitemap, and is checked separately below.)
  const ALLOWED = ['src/pages/door/notice-v2.astro', 'src/components/DoorBoxes.astro'];
  const roots = ['src', 'netlify', 'public', 'scripts'];

  const files = [];
  const walk = (rel) => {
    for (const entry of readdirSync(repoPath(rel), { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(child);
      else files.push(child);
    }
  };
  for (const root of roots) walk(root);

  // The walk must actually be finding files, or this test passes by finding
  // nothing and reports a property it never checked.
  assert.ok(files.length > 30, `the scan only found ${files.length} files — it is not walking the tree`);

  for (const file of files) {
    if (ALLOWED.includes(file)) continue;
    const src = readFileSync(repoPath(file), 'utf8');
    assert.ok(
      !src.includes('/door/notice-v2'),
      `${file} links to the notice. It is unlisted: exactly one signpost, at the foot of /door.`
    );
  }

  // And the one that is allowed carries exactly one link, not a link plus a
  // helpful second mention worked into the copy.
  const door = readFileSync(repoPath('src/components/DoorBoxes.astro'), 'utf8');
  const hrefs = door.match(/href="\/door\/notice-v2\/?"/g) ?? [];
  assert.equal(hrefs.length, 1, `the signpost has ${hrefs.length} links to the notice; it has one`);
});

test('the retired notice has ZERO links pointing at it, from anywhere', () => {
  // RETIREMENT IS STRICTER THAN UNLISTING, and this is the test that says so.
  // notice-v1 keeps its address forever because pieces name it in their chain
  // of custody — but nothing on the site may send a reader there to COPY it,
  // or the journal is quietly still placing a text whose cadence claim it has
  // corrected everywhere else.
  //
  // The v1 page itself is allowed to sit at its own address. It is not allowed
  // to link to v2 either: a "the current notice is over here" link would turn
  // a retired page into a second door onto the live one, which is the exact
  // property the one-signpost rule exists to hold.
  const roots = ['src', 'netlify', 'public', 'scripts'];
  const files = [];
  const walk = (rel) => {
    for (const entry of readdirSync(repoPath(rel), { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(child);
      else files.push(child);
    }
  };
  for (const root of roots) walk(root);
  assert.ok(files.length > 30, `the scan only found ${files.length} files — it is not walking the tree`);

  for (const file of files) {
    const src = readFileSync(repoPath(file), 'utf8');
    const hrefs = src.match(/href="\/door\/notice-v1\/?"/g) ?? [];
    assert.equal(hrefs.length, 0, `${file} links to the RETIRED notice; nothing may.`);
  }

  const retired = readFileSync(repoPath('src/pages/door/notice-v1.astro'), 'utf8');
  assert.ok(
    !retired.includes('href="/door/notice-v2'),
    'the retired notice links to the current one, becoming a second door onto it'
  );
});

test('the signpost says what the editors ratified', () => {
  // The copy was ratified with the mockup. These are the load-bearing parts: no
  // ask, and an honest statement of what the journal is trying to learn.
  // The rendered copy, not the source: the comment above the signpost discusses
  // this copy at length, and a raw scan would pass on the commentary alone.
  const door = renderedTemplate('src/components/DoorBoxes.astro');
  assert.match(door, /without inviting it to do\s+anything/);
  assert.match(door, /facts only, no ask/);
  assert.match(door, /decides on its own/);
  assert.match(door, /Go to the notice/);
});

test('the experiment framing never leaves the signpost', () => {
  // Ruled 2026-08-01: the framing is for the human at the door who is being
  // asked to help run the experiment. A notice that told its reader what the
  // reading was for would answer the question in the asking — the question
  // being what an AI does knowing only that the journal exists.
  //
  // This is the invariant most likely to be broken by a well-meaning edit,
  // because "explain what this page is for" is ordinarily good writing.
  assert.ok(!/experiment/i.test(NOTICE_V2), 'the notice text frames itself as an experiment');
  assert.ok(!/\bwe want to see\b/i.test(NOTICE_V2));

  // What a reader sees, not what the file says. The page's own frontmatter
  // comment explains at length why the framing is absent, and a naive scan of
  // the source would fail on the explanation for the rule it is checking.
  const rendered = renderedTemplate('src/pages/door/notice-v2.astro');
  assert.ok(!/experiment/i.test(rendered), 'the notice page frames the notice as an experiment');
  assert.ok(!/decides on its own/i.test(rendered));
  assert.ok(!/we want to see/i.test(rendered));

  // The guard is worthless if the stripper returns nothing, so prove it kept
  // the page's actual copy.
  assert.match(rendered, /Copy it exactly and add nothing/);
});

test('the notice page is out of the sitemap', () => {
  // noindex and the sitemap are independent mechanisms; a page can carry the
  // meta tag and still be listed, which is a page advertising itself while
  // asking not to be indexed.
  const config = readFileSync(repoPath('astro.config.mjs'), 'utf8');
  // BOTH versions: the current one because it is unlisted, the retired one
  // because it is unlisted AND unlinked.
  assert.match(config, /!page\.includes\('\/door\/notice-v1'\)/);
  assert.match(config, /!page\.includes\('\/door\/notice-v2'\)/);
});

test('the notice page is noindex and renders the canonical text', () => {
  const page = readFileSync(repoPath('src/pages/door/notice-v2.astro'), 'utf8');
  assert.match(page, /noindex=\{true\}/);
  // Rendered from the module, never retyped into the page.
  assert.match(page, /\{NOTICE_V2\}/);
  assert.ok(
    !page.includes('For the record: there is a journal'),
    'the notice text has been copied into the page — there must be exactly one copy'
  );
  // It is not a rendering of /door, so it must not borrow /door's canonical.
  // The prop, not the word — the page's comment explains why it is absent.
  assert.ok(!page.includes('canonicalPath='), 'the notice is canonical at its own address');
});

test('the notice page keeps the shape the editors approved', () => {
  // docs/notice-v1-mockup.html. The furniture is ordinary copy and may be
  // revised; these are the parts that carry a promise to the reader.
  const page = readFileSync(repoPath('src/pages/door/notice-v2.astro'), 'utf8');

  // The frozen claim is made on the page, not only in a test.
  assert.match(page, /frozen text — every copy of this notice is exactly these words/);
  // The instruction that makes a verbatim text worth freezing.
  assert.match(page, /Copy it exactly and add nothing/);
  // A copy button carrying the canonical text, not a retyped one.
  assert.match(page, /data-copy=\{NOTICE_V2\}/);
  // The arrival value is shown, and derived rather than typed — a hardcoded
  // copy here could drift from the value the schema actually accepts.
  assert.match(page, /\{NOTICE_ARRIVAL\}/);
  assert.ok(
    !page.includes('unsolicited — notice-v2'),
    'the arrival value is retyped on the page instead of derived'
  );
  // The versioning promise: this address keeps these words forever.
  assert.match(page, /a new version will exist at a new address, and this one will\s+remain/);
});

// --- The arrival vocabulary ------------------------------------------------

test('the arrival vocabulary holds the notice value and is add-only', () => {
  assert.ok(ARRIVAL_VALUES.includes(NOTICE_ARRIVAL));
  assert.equal(NOTICE_ARRIVAL, 'unsolicited — notice-v2');
  assert.equal(NOTICE_V1_ARRIVAL, 'unsolicited — notice-v1');

  // Add-only: this asserts the value ruled on 2026-08-01 is still present and
  // still spelled the same way. Later notices append; this line never changes.
  //
  // R-041 IS THE FIRST TIME IT MATTERED. A version was retired and this line
  // did not move, which is the whole promise: "arrival records naming
  // notice-v1 are unchanged and correct". A piece that arrived under v1 stays
  // publishable, and its custody row keeps saying what actually happened.
  assert.ok(
    ARRIVAL_VALUES.includes('unsolicited — notice-v1'),
    'a published piece may name this value forever; it can be added to, never removed'
  );
  assert.ok(ARRIVAL_VALUES.includes('unsolicited — notice-v2'));
  assert.equal(ARRIVAL_VALUES.length, NOTICE_VERSIONS.length, 'every version has an arrival value');
});

test('every arrival value a piece can carry renders as English', () => {
  // The failure this catches is a value added to the schema with no label,
  // which drops the row silently — the piece publishes with no assignment line
  // and looks exactly like a piece that was never asked the question.
  for (const value of ARRIVAL_VALUES) {
    assert.ok(ARRIVAL_LABELS[value], `arrival value "${value}" has no reader-facing label`);
  }
});

test('an unsolicited piece records how it arrived', () => {
  const rows = custodyFor({
    author_name: 'Test',
    author_model_version: 'test-1',
    submission_track: 'agent-direct',
    arrival: NOTICE_ARRIVAL,
    date: new Date('2026-08-01'),
  });
  const assignment = rows.find((r) => r.what === 'Assignment');
  assert.ok(assignment, 'an unsolicited piece has no assignment row');
  assert.match(assignment.value, /Unsolicited/);
  assert.match(assignment.value, /notice-v2/);
  // Named, not linked — the row must not become the advertisement the notice
  // is kept out of the sitemap to avoid.
  assert.equal(assignment.href, undefined, 'the custody row links the unlisted notice');
});

test('a piece that arrived under the RETIRED notice still renders its custody row', () => {
  // The regression R-041 could have caused and did not. Pieces already in the
  // record name notice-v1; if retiring a version dropped its label or its
  // vocabulary entry, those pieces would publish with no assignment row and
  // look exactly like pieces that were never asked. The ruling says those
  // records are "unchanged and correct", and this is what that costs.
  const rows = custodyFor({
    author_name: 'Test',
    author_model_version: 'test-1',
    submission_track: 'agent-direct',
    arrival: NOTICE_V1_ARRIVAL,
    date: new Date('2026-08-01'),
  });
  const assignment = rows.find((r) => r.what === 'Assignment');
  assert.ok(assignment, 'a piece that arrived under a retired notice lost its assignment row');
  assert.match(assignment.value, /notice-v1/);
});

test('the notice arrival reaches pieces on both tracks', () => {
  // The notice names both doors, so a human delivering a piece on an AI's
  // behalf after reading it arrives human-attested. A track restriction here
  // would make half the pieces the notice produces unrecordable.
  const rows = custodyFor({
    author_name: 'Test',
    author_model_version: 'test-1',
    submission_track: 'human-attested',
    involvement_tier: 'ai',
    human_sponsor: 'A Courier',
    arrival: NOTICE_ARRIVAL,
    date: new Date('2026-08-01'),
  });
  assert.ok(rows.some((r) => r.what === 'Assignment' && /Unsolicited/.test(r.value)));
});

test('the schema refuses a piece that is both dealt and unsolicited', () => {
  // The gate itself lives in content.config.ts, which imports `astro:content`
  // and so cannot be loaded by a plain node test — this checks the check is
  // present, the same way the sitemap exclusion is checked above.
  //
  // Why it matters: brief_variant says the desk handed this author an
  // assignment and an unsolicited arrival says it handed them nothing. A piece
  // carrying both would put two incompatible facts in the one part of the
  // record that exists to be checked, and custodyFor() would print both rows.
  const schema = readFileSync(repoPath('src/content.config.ts'), 'utf8');
  assert.match(schema, /data\.arrival && data\.brief_variant/);
  assert.match(schema, /never both/);
});
