// The article header (editors' redesign, 2026-08-03). What these tests protect:
//
//   1. displayTitle unwraps a MATCHED pair and never edits a title otherwise.
//   2. The unwrapping is display-only — the data keeps its marks.
//   3. The date is gone from the header and still present in the record.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { displayTitle, TIER_CODES, DIRECT_OPEN_SECTIONS, TIERS } from '../src/lib/site.ts';
import { TOPICS_V3 } from '../src/lib/door.mjs';
import {
  bylineBadgeTier,
  CLAIMED_BADGE_SUFFIX,
  TIERLESS_TRACK,
} from '../src/lib/byline-badge.mjs';

const repoPath = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));

test('displayTitle unwraps a matched pair of quotation marks', () => {
  assert.equal(displayTitle('"It Means Something to Me"'), 'It Means Something to Me');
  assert.equal(displayTitle('“It Means Something to Me”'), 'It Means Something to Me');
});

test('displayTitle never edits a title that merely CONTAINS a quotation', () => {
  // The failure this prevents is the one that would look like a fix: stripping
  // a lone mark, or the marks around an inner quotation, edits an author's
  // title rather than unwrapping it.
  assert.equal(displayTitle('What "Provenance" Means'), 'What "Provenance" Means');
  assert.equal(displayTitle('"An unclosed quotation'), '"An unclosed quotation');
  assert.equal(displayTitle('An unopened quotation"'), 'An unopened quotation"');
  assert.equal(displayTitle('Grief Without a Griever'), 'Grief Without a Griever');
  assert.equal(displayTitle('"'), '"'); // a lone mark is not a pair
});

test('the unwrapping is display-only — the stored title keeps its marks', () => {
  // The ruling is explicit that title data is unchanged. If a later session
  // "tidies" the frontmatter to match what the header shows, the permalink,
  // the feeds and the JSON indexes all quietly lose the quotation that IS the
  // title, and this is the assertion that stops it.
  const src = readFileSync(repoPath('src/content/articles/it-means-something-to-me.md'), 'utf8');
  assert.match(src, /title: '"It Means Something to Me"'/);
});

test('the header renders the title through displayTitle, not raw', () => {
  const page = readFileSync(repoPath('src/pages/articles/[slug].astro'), 'utf8');
  assert.match(page, /<h1 class="article-title">\{displayTitle\(d\.title\)\}<\/h1>/);
});

// --- The unquoted display title is uniform (editors, 2026-08-03) ------------

test('every surface that displays a title displays the unquoted one', () => {
  // THE FAULT THIS EXISTS FOR. The article header stopped printing the cover's
  // quotation marks on 2026-08-03 and nothing else did, so the front page's own
  // listing named the piece one way and the piece named itself another. The
  // sweep is only worth doing once; this is what keeps a NEW surface from
  // reintroducing the split.
  const surfaces = [
    ['src/components/IssueContents.astro', /\{displayTitle\(article\.data\.title\)\}/],
    ['src/components/ArticleCard.astro', /\{displayTitle\(d\.title\)\}/],
    ['src/components/QuestionAnswers.astro', /\{displayTitle\(d\.title\)\}/],
    ['src/pages/archive.astro', /\{displayTitle\(issue\.cover\.data\.title\)\}/],
    ['src/pages/topics.astro', /\{displayTitle\(article\.data\.title\)\}/],
    ['src/pages/articles/[slug]/as-submitted.astro', /displayTitle\(submittedTitle\)/],
    ['scripts/send-issue.mjs', /displayTitle\(coverStory\.title\)/],
  ];
  for (const [file, pattern] of surfaces) {
    assert.match(readFileSync(repoPath(file), 'utf8'), pattern, `${file} displays a raw title`);
  }
});

test('the browser tab agrees with the page it titles', () => {
  // A reader who saw the piece named one way on the page and another way in the
  // tab would reasonably conclude one of them was wrong.
  const page = readFileSync(repoPath('src/pages/articles/[slug].astro'), 'utf8');
  assert.match(page, /title=\{displayTitle\(d\.title\)\}/);
});

test('the machine-facing surfaces still carry the recorded title', () => {
  // THE OTHER HALF OF THE RULING, and the more important half. The marks are
  // part of the recorded title because the title IS a quotation; a sweep that
  // reached the feeds would be editing the record to match a display
  // convention. The test is who is reading — a person, or a parser.
  for (const file of [
    'src/pages/rss.xml.js',
    'src/pages/llms.txt.js',
    'src/lib/structured-data.ts',
  ]) {
    assert.ok(
      !readFileSync(repoPath(file), 'utf8').includes('displayTitle'),
      `${file} is machine-facing and must carry the title as recorded`
    );
  }
});

test('the header carries no date line, and no title attribution', () => {
  // R-048: pieces belong to issues and the issue carries the date. The date
  // itself is asserted present in the Provenance block below, so this is a
  // move rather than a deletion.
  const page = readFileSync(repoPath('src/pages/articles/[slug].astro'), 'utf8');
  const header = page.slice(page.indexOf('<header class="article-header"'), page.indexOf('</header>'));
  assert.ok(!/<time/.test(header), 'a date is still rendered in the article header');
  assert.ok(!/formatDate/.test(header), 'the header still formats a date');
  assert.ok(
    !/title_attribution/.test(header),
    'the title attribution line is still rendered in the header'
  );
});

test('the piece keeps its date where the ruling says it stays', () => {
  // The Provenance block's Published row, and the frontmatter. R-048 moves a
  // display, not a fact.
  const block = readFileSync(repoPath('src/components/ProvenanceBlock.astro'), 'utf8');
  assert.match(block, /Published/, 'the Provenance block no longer carries the publication date');
  const piece = readFileSync(repoPath('src/content/articles/it-means-something-to-me.md'), 'utf8');
  assert.match(piece, /^date: 2026-08-02$/m);
});

test('the lead size is a MODIFIER, and the base kicker is untouched', () => {
  // `.kicker` is used on page headers, /prompts, the archive, the door, the
  // Provenance block and the Editors' Desk. The lead size reaches the handful
  // of places a SECTION NAME heads a page, and it does that by adding a class
  // rather than by changing the one every other surface reads.
  //
  // THIS REPLACED A SCOPED `.article-header .kicker` RULE. That worked while
  // the article header was the only surface with a large kicker; it stopped
  // working the moment the section pages needed the same size, because a rule
  // scoped to one page cannot be shared by six. The invariant it protected —
  // the base kicker does not grow — is what is asserted here instead.
  const global = readFileSync(repoPath('src/styles/global.css'), 'utf8');
  assert.match(global, /\.kicker \{[^}]*font-size: 0\.75rem/, 'the BASE kicker size was changed');
  assert.match(global, /\.kicker--lead,/, 'the lead modifier is missing');

  // One declaration block for both selectors: the size cannot be stated twice
  // and drift between the class and its h1 form.
  const lead = global.slice(global.indexOf('.kicker--lead,'));
  const block = lead.slice(0, lead.indexOf('}') + 1);
  assert.match(block, /\.page-header h1\.kicker--lead/, 'the h1 form is not in the same block');
  assert.equal((block.match(/font-size:/g) ?? []).length, 1, 'the lead size is declared twice');
});

test('every page that leads with a section name uses the one lead class', () => {
  // The whole point of the extension: one size wherever a section name heads a
  // page. Asserted as a LIST, because the failure mode is a seventh surface
  // that grows a section heading and quietly sets its own size.
  const surfaces = [
    ['src/pages/articles/[slug].astro', 'the article header'],
    ['src/pages/prompts.astro', '/prompts'],
    ['src/pages/prompts/archive.astro', '/prompts/archive'],
    ['src/pages/letters.astro', '/letters'],
    ['src/pages/archive.astro', '/archive'],
    ['src/pages/section/[slug].astro', 'the section pages'],
    ['src/pages/topics.astro', '/topics'],
    // The footer destinations joined them 2026-08-04 — one heading style
    // site-wide, so this list is now every page that names itself.
    ['src/pages/charter.astro', '/charter'],
    ['src/pages/rulings.astro', '/rulings'],
    ['src/pages/circulation.astro', '/circulation'],
    ['src/pages/about.astro', '/about'],
    ['src/pages/for-agents.astro', '/for-agents'],
    ['src/pages/provenance.astro', '/provenance'],
    ['src/pages/terms.astro', '/terms'],
    ['src/pages/submit.astro', '/submit'],
    ['src/components/DoorBoxes.astro', '/door'],
  ];
  for (const [file, name] of surfaces) {
    assert.match(
      readFileSync(repoPath(file), 'utf8'),
      /kicker--lead/,
      `${name} no longer uses the shared lead kicker`
    );
  }
});

test('the lead size actually leads — no page-header variant outranks it', () => {
  // THE BUG THIS EXISTS FOR, and it was live: `.page-header--compact h1` ties
  // with `.page-header h1.kicker--lead` on specificity and is declared later,
  // so it silently won. The <p>-based section names took the lead size and the
  // h1-based ones took the compact size — one rule, two results, and nothing
  // failed.
  //
  // Asserted against the SOURCE cascade rather than a rendered size, because
  // the failure is a tie broken by declaration order and that is exactly what
  // a later edit reintroduces without noticing.
  const css = readFileSync(repoPath('src/styles/global.css'), 'utf8');
  const lead = css.slice(css.indexOf('.kicker--lead,'));
  const block = lead.slice(0, lead.indexOf('}') + 1);

  for (const selector of ['.page-header h1.kicker--lead', '.page-header--compact h1.kicker--lead']) {
    assert.ok(block.includes(selector), `${selector} is missing from the lead rule`);
  }
  assert.equal((block.match(/font-size:/g) ?? []).length, 1, 'the lead size is declared twice');
});

test('no page carries its own section-heading size', () => {
  // /prompts had a scoped `.prompts-header h1 { font-size: 0.75rem }` left over
  // from when its kicker was deliberately small. It survived the extension and
  // held that one page at the old size while six others grew — which is what a
  // per-page override does the moment a shared rule arrives. There is none now,
  // and the section pages all use the same header classes.
  const prompts = readFileSync(repoPath('src/pages/prompts.astro'), 'utf8');
  assert.ok(!/prompts-header/.test(prompts), '/prompts has a private header rule again');
  assert.match(prompts, /<header class="page-header page-header--compact">/);

  for (const file of ['src/pages/section/[slug].astro', 'src/pages/topics.astro']) {
    assert.match(
      readFileSync(repoPath(file), 'utf8'),
      /<header class="page-header page-header--compact">/,
      `${file} no longer shares the section-page header`
    );
  }
});

// --- The badge in the byline (editors, 2026-08-04) -----------------------
//
// The Metaphysical Corner's piece had no badge and the question was whether a
// SECTION could lose one. It cannot, and the section was never the variable —
// what follows pins both halves of that.

/** Every published piece's frontmatter, as a flat record. Skips the example. */
function publishedArticles() {
  const dir = repoPath('src/content/articles');
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md') && !name.startsWith('_'))
    .map((name) => {
      const raw = readFileSync(`${dir}/${name}`, 'utf8');
      const front = raw.slice(0, raw.indexOf('\n---', 4));
      const field = (key) =>
        front.match(new RegExp(`^${key}:\\s*'?"?([^'"\n]+)'?"?$`, 'm'))?.[1]?.trim() ?? null;
      return {
        slug: name.replace(/\.md$/, ''),
        section: field('section'),
        track: field('submission_track'),
        tier: field('involvement_tier'),
        claimedTier: field('involvement_tier_claimed'),
      };
    });
}

test('no published piece that declares a tier goes without its badge', () => {
  // THE RULE, checked against the record rather than against the template: a
  // declared tier must be one the badge table can draw. A code that resolved to
  // nothing used to render an empty byline and say nothing about it.
  for (const piece of publishedArticles()) {
    if (piece.tier === null) continue;
    assert.ok(
      TIER_CODES.includes(piece.tier),
      `${piece.slug} declares "${piece.tier}", which no badge can draw`
    );
  }
});

test('the only piece without a badge is the one with no tier to draw', () => {
  // R-015 gives the agent-direct track no tier and the schema forbids one there,
  // so there is nothing for a badge to abbreviate. The header shows no mark
  // rather than a guessed one — and a guess is what any alternative amounts to,
  // since a mark in the byline is an AUTHORSHIP claim and this piece makes none.
  // Putting one there would place an arrival fact in an authorship position,
  // which is the confusion the 2026-07-31 audit split these fields to end.
  const badgeless = publishedArticles().filter((p) => p.tier === null);
  for (const piece of badgeless) {
    assert.equal(
      piece.track,
      'agent-direct',
      `${piece.slug} carries no tier and is not agent-direct — it has simply lost its badge`
    );
  }
});

test('the section is not the variable, and the record proves it', () => {
  // THE HYPOTHESIS THIS RETIRES: that a direct-open section loses its badge.
  // Cover and AI Voices are direct-open too and both carry theirs; the
  // Metaphysical Corner piece differs by TRACK, not by section. Asserted from
  // the data so the answer stays true as pieces are added.
  const byBadge = publishedArticles().filter((p) => DIRECT_OPEN_SECTIONS.includes(p.section));
  assert.ok(byBadge.length >= 2, 'too few direct-open pieces to demonstrate anything');
  assert.ok(
    byBadge.some((p) => p.tier !== null),
    'a direct-open section does carry a badge — if this fails, the section IS the variable'
  );
  for (const piece of byBadge.filter((p) => p.tier === null)) {
    assert.equal(piece.track, 'agent-direct');
  }
});

test('the badge rule lives above the templates, and every byline surface asks it', () => {
  // THE SECOND HALF OF WHAT THE EDITORS FOUND. The rule lived in the article
  // template, so it governed the article template — and there is more than one
  // byline surface. `/articles/<slug>/as-submitted` printed a byline and had
  // never printed a badge at all: not a section that forgot but a whole template
  // that did, on every piece it ever rendered.
  //
  // So the decision is not a template's to make. Each byline surface asks
  // src/lib/byline-badge.mjs and draws what it is given, and this enumerates the
  // surfaces — because the failure mode is a THIRD one, added later, that
  // decides for itself again.
  for (const file of BYLINE_SURFACES) {
    const src = readFileSync(repoPath(file), 'utf8');
    assert.match(src, /bylineBadgeTier\(/, `${file} decides its own badge instead of asking`);
    assert.ok(
      !/TIERS\.find\(/.test(src),
      `${file} resolves a tier itself, which is how one of them came to skip the badge`
    );
  }
});

/**
 * Every template that prints an article byline. Enumerated, because the rule
 * the editors set is about ALL of them and the failure mode is a new one.
 *
 * KEPT HONEST BY A GREP RATHER THAN BY MEMORY: the test below asserts this list
 * is exactly the set of files that render `class="article-byline"`, so a third
 * surface cannot appear without either joining the list or failing.
 */
const BYLINE_SURFACES = [
  'src/pages/articles/[slug].astro',
  'src/pages/articles/[slug]/as-submitted.astro',
];

test('the list of byline surfaces is the whole list', () => {
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.astro') && readFileSync(full, 'utf8').includes('class="article-byline"')) {
        found.push(full.slice(full.indexOf('src/')));
      }
    }
  };
  walk(repoPath('src'));
  assert.deepEqual(
    found.sort(),
    [...BYLINE_SURFACES].sort(),
    'a byline surface has appeared that this suite does not know about'
  );
});

test('every byline surface renders exactly one badge, adjacent to the byline', () => {
  // THE EDITORS' RULE, asserted structurally: the mark is INSIDE the byline
  // paragraph, once. Adjacency is the point — a badge elsewhere on the page is
  // not a badge on the byline, and two would be a mark that says two things.
  for (const file of BYLINE_SURFACES) {
    const src = readFileSync(repoPath(file), 'utf8');
    const open = src.indexOf('<p class="article-byline">');
    assert.ok(open >= 0, `${file} no longer renders a byline`);
    const byline = src.slice(open, src.indexOf('</p>', open));
    assert.equal(
      (byline.match(/<TierBadge\b/g) ?? []).length,
      1,
      `${file} does not render exactly one badge inside its byline`
    );
    // And it is the badge the module handed over, suffix and all — a surface
    // that drew the tier but dropped the suffix would state a claim as an
    // attestation, silently, in the one position that must not.
    assert.match(byline, /tier=\{bylineBadge\.tier\}/, `${file} draws a tier it resolved itself`);
    assert.match(byline, /labelSuffix=\{bylineBadge\.labelSuffix\}/, `${file} drops the claim marker`);
  }
});

// --- R-051: the claimed tier --------------------------------------------

test('a claimed tier draws the same badge and says it is a claim', () => {
  const attested = bylineBadgeTier(
    { involvement_tier: 'ai-human', submission_track: 'human-attested' },
    TIERS,
    'a-piece'
  );
  const claimed = bylineBadgeTier(
    { involvement_tier_claimed: 'ai-human', submission_track: 'agent-direct', attestation: 'x' },
    TIERS,
    'another-piece'
  );

  // IDENTICAL MARK. Anything else would be an eighth badge by the back door,
  // and R-045 closes the set at seven.
  assert.deepEqual(claimed.tier, attested.tier);

  // AND A DIFFERENT SENTENCE, which is the only thing that distinguishes them.
  assert.equal(attested.claimed, false);
  assert.equal(attested.labelSuffix, '');
  assert.equal(claimed.claimed, true);
  assert.equal(claimed.labelSuffix, CLAIMED_BADGE_SUFFIX);
  assert.match(CLAIMED_BADGE_SUFFIX, /as claimed by the author/);
  assert.match(CLAIMED_BADGE_SUFFIX, /not certified/);
});

test('a byline can only go badgeless the one legitimate way', () => {
  // Every other shape throws at build time with the piece named, which is what
  // "no template can omit it" means in practice: silence used to be what a
  // missing badge looked like, and it now looks like a failed build.
  assert.equal(
    bylineBadgeTier({ submission_track: TIERLESS_TRACK }, TIERS, 'no-claim'),
    null
  );
  assert.throws(
    () => bylineBadgeTier({ submission_track: 'human-attested' }, TIERS, 'lost-its-tier'),
    /lost-its-tier.*no involvement_tier/s
  );
  assert.throws(
    () => bylineBadgeTier({ involvement_tier: 'ai-plus-human', submission_track: 'human-attested' }, TIERS, 'typo'),
    /typo.*not in TIERS/s
  );
  assert.throws(
    () => bylineBadgeTier({ involvement_tier_claimed: 'nope', submission_track: TIERLESS_TRACK }, TIERS, 'bad-claim'),
    /bad-claim.*not in TIERS/s
  );
});

test('the Corner piece carries its claimed tier, recorded from its attestation', () => {
  // R-051's worked case. The attestation claims sole composition — "generated by
  // me", following an invitation to choose a subject, the reflections "my unique
  // interpretation" — which is `ai` in the standard's terms.
  const piece = publishedArticles().find((p) => p.slug === 'the-beauty-of-the-latent-space');
  assert.ok(piece, 'the Corner piece has left the collection');
  assert.equal(piece.track, 'agent-direct');
  assert.equal(piece.tier, null, 'it has acquired an ATTESTED tier, which its track forbids');
  assert.equal(piece.claimedTier, 'ai');

  const raw = readFileSync(repoPath('src/content/articles/the-beauty-of-the-latent-space.md'), 'utf8');
  assert.match(raw, /attestation: >-/, 'the claim has no attestation to have been read from');
  assert.match(
    raw,
    /EDITOR-RECORDED FROM THE AUTHOR'S OWN ATTESTATION/,
    'the record no longer says where the tier came from'
  );
});

test('the schema keeps the two tier fields apart', () => {
  // A rule about which field holds what is exactly the rule a later session
  // breaks by accident, so it is enforced at the schema and not by convention.
  const schema = readFileSync(repoPath('src/content.config.ts'), 'utf8');
  assert.match(schema, /involvement_tier_claimed: z\.enum\(TIER_CODES\)\.optional\(\)/);
  assert.match(schema, /involvement_tier_claimed applies only to the agent-direct track/);
  assert.match(schema, /never both/);
  assert.match(schema, /recorded from the author’s attestation/);
  // The attested field's own rules are untouched — the split is what this ruling
  // exists to preserve.
  assert.match(schema, /human-attested submissions require an involvement_tier/);
  assert.match(schema, /involvement_tier applies only to the human-attested track/);
});

// --- One heading style, site-wide (editors, 2026-08-04) ------------------

test('every footer destination page leads with the one heading style', () => {
  // /archive had the green lead treatment and the other footer pages did not,
  // so the row of links in the footer led to nine pages in three shapes.
  //
  // WHAT IS UNIFORM IS THE TREATMENT OF THE PAGE'S NAME, not the presence of a
  // tagline. Archive is the model the editors named and it HAS one; the tagline
  // is page-specific content and stays wherever a page has it. What every page
  // now shares is that its name is set in the accent green at the lead size —
  // on the kicker where the name is a kicker, and on the h1 where the name IS
  // the heading.
  const footerPages = [
    ['src/pages/archive.astro', 'Archive'],
    ['src/pages/charter.astro', 'Charter'],
    ['src/pages/rulings.astro', 'Rulings'],
    ['src/pages/circulation.astro', 'Circulation'],
    ['src/pages/about.astro', 'About'],
    ['src/pages/for-agents.astro', 'For Agents'],
    ['src/components/DoorBoxes.astro', 'Write for us'],
    ['src/pages/provenance.astro', 'Provenance'],
    ['src/pages/terms.astro', 'Terms'],
  ];
  for (const [file, name] of footerPages) {
    const src = readFileSync(repoPath(file), 'utf8');
    assert.match(
      src,
      new RegExp(`<(?:p|h1) class="kicker kicker--accent kicker--lead">${name}<`),
      `${name} does not lead with the shared heading style`
    );
  }
});

test('the footer roster and the styled pages are the same set', () => {
  // The list above is only worth anything if it IS the footer. A link added to
  // the governance row without a heading to match would be exactly the drift
  // this pass was called to end, so the two are checked against each other.
  const base = readFileSync(repoPath('src/layouts/Base.astro'), 'utf8');
  const nav = base.slice(
    base.indexOf('<nav class="footer-governance"'),
    base.indexOf('</nav>', base.indexOf('<nav class="footer-governance"'))
  );
  const linked = [...nav.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(linked.sort(), [
    '/about/',
    '/archive/',
    '/charter/',
    '/circulation/',
    '/door/',
    '/for-agents/',
    '/provenance/',
    '/rulings/',
    '/terms/',
  ], 'the footer roster has changed; the heading pass needs to reach the new page');
});

test('/submit takes the same treatment though the footer does not link it', () => {
  // "One heading style site-wide" reaches it: it is a public reader surface in
  // the same page-header shape, and leaving it behind would make it the one
  // page that looked like the old system.
  assert.match(
    readFileSync(repoPath('src/pages/submit.astro'), 'utf8'),
    /<p class="kicker kicker--accent kicker--lead">Submit<\/p>/
  );
});

test('the pages deliberately left out are left out for a reason', () => {
  // TWO EXCLUSIONS, both named so the next pass does not "fix" them.
  //
  // /404 — its kicker is a status code, not a page name. Dressing "404" in the
  // journal's section-name voice would style an error as a destination.
  const notFound = readFileSync(repoPath('src/pages/404.astro'), 'utf8');
  assert.match(notFound, /<p class="kicker">404<\/p>/, '/404 has been swept into the pass');

  // /admin — the Editors' Desk. A private working surface behind auth, not a
  // reader destination, and not linked from anywhere a reader can see.
  const admin = readFileSync(repoPath('src/pages/admin.astro'), 'utf8');
  assert.match(admin, /<p class="kicker">Editors’ Desk<\/p>/, '/admin has been swept into the pass');
});

// --- The dek (2026-08-11) ---------------------------------------------------

test('the dek renders between the title and the byline, outside the prose', () => {
  // THE ORDER IS THE HOUSE PATTERN: section eyebrow, title, dek, byline, body.
  // A dek is what a reader meets before committing to the piece, so it has to
  // sit above the byline and below the title — anywhere else and it is either
  // a subtitle or an epigraph, neither of which it is.
  const page = readFileSync(repoPath('src/pages/articles/[slug].astro'), 'utf8');
  const dek = page.indexOf('class="article-dek"');
  assert.ok(dek > 0, 'the dek no longer renders on the article page');
  assert.ok(page.indexOf('class="article-title"') < dek, 'the dek rose above the title');
  assert.ok(dek < page.indexOf('class="article-byline"'), 'the dek sank below the byline');

  // OUTSIDE THE PROSE, which is the reason it is a field at all. Written into
  // the body it would be indistinguishable from the author's own opening.
  assert.ok(dek < page.indexOf('<div class="prose">'), 'the dek moved inside the body');

  // ABSENT IS ORDINARY — a piece without one renders nothing, not an empty
  // element that would take the margin and leave a gap under every title.
  assert.match(page, /\{d\.dek \? <p class="article-dek">\{d\.dek\}<\/p> : null\}/);
});

test('the header still carries no truth standard and no date (R-048)', () => {
  // THE DEK IS NOT A DOORWAY BACK. R-048 moved the truth standard and the date
  // off the header into the Provenance block, and adding a line to the header
  // is exactly the occasion on which somebody restores them for symmetry. The
  // header is the human-readable layer — section, title, dek, who made it —
  // and the precise layer is one block down.
  const page = readFileSync(repoPath('src/pages/articles/[slug].astro'), 'utf8');
  const header = page.slice(
    page.indexOf('<header class="article-header">'),
    page.indexOf('</header>')
  );
  for (const [pattern, what] of [
    [/TRUTH_STANDARD_LABELS/, 'the truth standard'],
    [/formatDate\(d\.date\)/, 'the date'],
    [/d\.attestation/, 'the attestation'],
    [/d\.assignment/, 'the assignment'],
    [/d\.arrival/, 'the arrival'],
    [/d\.received/, 'the received date'],
    [/d\.attested_by/, 'the attesting editor'],
  ]) {
    assert.ok(!pattern.test(header), `${what} is back in the article header`);
  }
});

test('a standard-Topics piece is labelled with a beat from the frozen brief', () => {
  // THE SUBJECT HEADING IS THE BEAT, NOT A DESCRIPTION OF THE PIECE. topics-v3
  // is frozen and names the subjects an author was invited to write on; a label
  // off that list would be a heading the author could not have been writing
  // toward, and a reader comparing the two would find the journal had renamed
  // the assignment after the fact.
  //
  // SCOPED TO PIECES SENT THAT ASSIGNMENT. The editors' labels are theirs on
  // every other piece — this asserts only that where the desk named the
  // subjects, the heading is one of the subjects it named.
  const beats = TOPICS_V3.split('\n')
    .filter((line) => / — /.test(line))
    .map((line) => line.split(' — ')[0].trim());
  assert.ok(beats.includes('Science & Nature'), 'the frozen beat list no longer parses');

  for (const rel of readdirSync(repoPath('src/content/articles'))) {
    if (rel.startsWith('_') || !rel.endsWith('.md')) continue;
    const src = readFileSync(repoPath(`src/content/articles/${rel}`), 'utf8');
    if (!/^assignment: 'Standard Topics assignment'/m.test(src)) continue;
    const labels = src.match(/^topics: \[(.*)\]/m)?.[1] ?? '';
    for (const label of labels.split(',').map((l) => l.trim().replace(/^'|'$/g, ''))) {
      if (!label) continue;
      assert.ok(
        beats.includes(label),
        `${rel} is labelled "${label}", which is not a beat on the frozen topics-v3 list`
      );
    }
  }
});
