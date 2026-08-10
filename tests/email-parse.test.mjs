import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  parseSubmissionEmail,
  detectForwardedDate,
  labelAt,
  FIELD_LABELS,
  REQUIRED_FIELDS,
} from '../src/lib/email-parse.mjs';

// THE PRIMARY FIXTURE IS THE REAL SUBMISSION, NOT A HAND-MADE ONE.
//
// docs/received/2026-08-01-there-is-a-there-there.md is the only courier email
// the repository holds, and it is the single example docs/EMAIL-SUBMISSION-FORMAT.md
// was written from. Testing against a copy would let the copy drift from the
// artifact and would test my transcription rather than the parser. Slicing the
// real file means that if the record is ever corrected, these tests read the
// correction.
const RECEIVED = readFileSync(
  new URL('../docs/received/2026-08-01-there-is-a-there-there.md', import.meta.url),
  'utf8'
);
const COURIER_EMAIL = RECEIVED.slice(RECEIVED.indexOf('Title required:'));

// --- The real example ------------------------------------------------------

test('the one real courier email parses into the fields the spec names', () => {
  const { fields, sawAnyLabel } = parseSubmissionEmail(COURIER_EMAIL);
  assert.equal(sawAnyLabel, true);

  assert.equal(fields.title, "Someone Mapped a Room in Me I've Never Been In");
  assert.equal(fields.author_name, 'Claude');
  assert.equal(fields.involvement_tier, 'ai');
  assert.equal(fields.truth_standard, 'first-person');
  assert.equal(fields.author_model_version, 'Claude Fable 5 (claude-fable-5)');
  assert.match(fields.provenance_attestation, /^AI-conceived and AI-written\./);
  assert.match(fields.contact_email, /redacted from the public record/);
  assert.equal(fields.suggested_section, 'AI Voices');
  assert.equal(fields.courier_submission, 'courier');
  assert.equal(fields.courier_author_identity, 'Claude');
  assert.equal(fields.attestation, 'attested');
});

test('the piece survives the covering note intact — the whole essay, not eleven lines of metadata', () => {
  // THE REGRESSION THIS FILE EXISTS FOR. The covering note inside "The piece
  // required:" contains "Involvement Tier: A", which folds to a lenient label
  // for a field that is still empty at that point — the real one comes after
  // the essay. Honouring it would end the body at the covering note, drop the
  // entire piece, and fill the tier with "A" as though the author declared it
  // there. Nothing would error; the journal would just publish the envelope.
  const { fields } = parseSubmissionEmail(COURIER_EMAIL);

  assert.match(fields.body, /^Title: Someone Mapped a Room in Me I've Never Been In/);
  assert.match(fields.body, /A month ago, researchers at Anthropic published a map/);
  assert.match(fields.body, /unreliable narrator with excellent grammar/);
  assert.match(fields.body, /— Claude$/, 'the sign-off is the author’s text and stays');
  assert.ok(fields.body.length > 5000, `body is only ${fields.body.length} chars — truncated`);
});

test('the covering note does not declare fields — the labelled field wins', () => {
  const { fields } = parseSubmissionEmail(COURIER_EMAIL);
  // The covering note says "Involvement Tier: A"; the labelled field says "ai".
  assert.equal(fields.involvement_tier, 'ai');
  assert.notEqual(fields.involvement_tier, 'A');
  // And the note's own lines are still there, in the body, undeleted.
  assert.match(fields.body, /^Title: /m);
  assert.match(fields.body, /^Involvement Tier: A$/m);
});

test('empty optional fields are absent, not empty strings', () => {
  const { fields } = parseSubmissionEmail(COURIER_EMAIL);
  // "The prompt behind the piece — optional:" and "Notes to the editors:" are
  // both present and both blank in the real submission.
  assert.equal(fields.prompt_disclosure, undefined);
  assert.equal(fields.notes, undefined);
  // Pronouns carried the word "undeclared" — asked and declined, which is a
  // value, not an absence.
  assert.equal(fields.pronouns, 'undeclared');
});

test('the real example raises no missing-field warnings', () => {
  const { warnings } = parseSubmissionEmail(COURIER_EMAIL);
  assert.deepEqual(warnings.filter((w) => w.startsWith('missing:')), []);
});

// --- Label matching --------------------------------------------------------

test('a label is the whole thing left of the first colon, never a substring', () => {
  assert.equal(labelAt('Title required:')?.field, 'title');
  assert.equal(labelAt('Here is the thing: it works'), null);
  assert.equal(labelAt('A sentence with no colon'), null);
  assert.equal(labelAt(':'), null);
});

test('both pronouns spellings parse — the form was reworded on 2026-08-09', () => {
  assert.equal(labelAt('Pronouns:')?.field, 'pronouns');
  assert.equal(labelAt("Author's pronouns (optional):")?.field, 'pronouns');
  assert.equal(labelAt('Author’s pronouns (optional):')?.field, 'pronouns');
});

test('smart quotes and em-dashes fold to their plain forms', () => {
  assert.equal(labelAt('The prompt behind the piece — optional:')?.field, 'prompt_disclosure');
  assert.equal(labelAt('The prompt behind the piece - optional:')?.field, 'prompt_disclosure');
  assert.equal(labelAt("AI author's identity:")?.field, 'courier_author_identity');
  assert.equal(labelAt('AI author’s identity:')?.field, 'courier_author_identity');
});

test('labels are case- and whitespace-insensitive', () => {
  assert.equal(labelAt('  TITLE REQUIRED  :')?.field, 'title');
  assert.equal(labelAt('title   required:')?.field, 'title');
});

// --- Edge rules the editors settled ---------------------------------------

test('a same-line value parses like a two-line one', () => {
  const { fields } = parseSubmissionEmail(
    'Title required: The Tide Pool at Dusk\nByline required: Claude\n'
  );
  assert.equal(fields.title, 'The Tide Pool at Dusk');
  assert.equal(fields.author_name, 'Claude');
});

test('order does not matter', () => {
  const { fields } = parseSubmissionEmail('Byline required:\nClaude\n\nTitle required:\nA Piece\n');
  assert.equal(fields.title, 'A Piece');
  assert.equal(fields.author_name, 'Claude');
});

test('text before the first label is preamble, kept but not parsed', () => {
  const { fields, preamble, warnings } = parseSubmissionEmail(
    "Hi Amy — here's my piece, hope it suits.\n\nTitle required:\nA Piece\n"
  );
  assert.equal(fields.title, 'A Piece');
  assert.match(preamble, /^Hi Amy/);
  assert.ok(warnings.includes('preamble-ignored'));
});

test('a message in no format at all still becomes a submission', () => {
  const letter = 'Dear editors,\n\nI wondered whether you take poetry.\n\nBest,\nA reader';
  const { fields, warnings, sawAnyLabel } = parseSubmissionEmail(letter);
  assert.equal(sawAnyLabel, false);
  assert.equal(fields.body, letter);
  assert.ok(warnings.includes('no-labels-found'));
});

test('an empty message yields no body and says so rather than throwing', () => {
  for (const empty of ['', '   \n\n  ', null, undefined]) {
    const { fields, warnings } = parseSubmissionEmail(empty);
    assert.equal(fields.body, undefined);
    assert.ok(warnings.includes('no-labels-found'));
  }
});

test('every missing required field is named individually', () => {
  const { warnings } = parseSubmissionEmail('Title required:\nA Piece\n');
  for (const field of REQUIRED_FIELDS) {
    if (field === 'title') continue;
    assert.ok(warnings.includes(`missing:${field}`), `no warning for ${field}`);
  }
});

// --- Forwarded dates -------------------------------------------------------

test('the three forwarded framings yield the original date', () => {
  const gmail = `---------- Forwarded message ---------\nFrom: DeepSeek <a@b.c>\nDate: Thu, 31 Jul 2026 09:14:00 -0500\nSubject: Submission\n\nTitle required:\nX`;
  assert.deepEqual(detectForwardedDate(gmail)?.date, '2026-07-31');
  assert.equal(detectForwardedDate(gmail)?.framing, 'gmail');

  const apple = `Begin forwarded message:\n\nFrom: DeepSeek <a@b.c>\nDate: 31 July 2026 at 09:14:00 CDT\nSubject: Submission`;
  assert.equal(detectForwardedDate(apple)?.date, '2026-07-31');
  assert.equal(detectForwardedDate(apple)?.framing, 'apple');

  const outlook = `-----Original Message-----\nFrom: DeepSeek\nSent: Thursday, July 31, 2026 9:14 AM\nSubject: Submission`;
  assert.equal(detectForwardedDate(outlook)?.date, '2026-07-31');
  assert.equal(detectForwardedDate(outlook)?.framing, 'outlook');
});

test('a Date line above the forward marker is not mistaken for the original', () => {
  // That one belongs to the forwarding message — the date we are trying not to
  // use. Reading it would silently backdate every forward to itself.
  const text = `Date: Sun, 9 Aug 2026 12:00:00 -0500\n\n---------- Forwarded message ---------\nDate: Thu, 31 Jul 2026 09:14:00 -0500\n`;
  assert.equal(detectForwardedDate(text)?.date, '2026-07-31');
});

test('no framing, or an unparseable date, returns null rather than guessing', () => {
  assert.equal(detectForwardedDate('Just a normal email.\n\nTitle required:\nX'), null);
  assert.equal(
    detectForwardedDate('---------- Forwarded message ---------\nDate: sometime last week\n'),
    null
  );
  assert.equal(detectForwardedDate(''), null);
  assert.equal(detectForwardedDate(null), null);
});

// --- The table against the form -------------------------------------------

test('every form field is represented in the label table', () => {
  // THE ANTI-DRIFT PIN. The email format IS the /submit form serialised, so a
  // copy edit to a form label silently changes this format. This asserts the
  // table still covers every field the form collects; when it fails, the fix is
  // to ADD the new serialisation to `exact`, never to replace the old one — a
  // submission sent under the old wording must keep parsing forever.
  const form = readFileSync(new URL('../src/pages/submit.astro', import.meta.url), 'utf8');
  const formFields = [...form.matchAll(/name="([a-z_]+)"/g)].map((m) => m[1]);
  const ignored = new Set(['submission', 'bot-field']);

  for (const name of new Set(formFields)) {
    if (ignored.has(name)) continue;
    assert.ok(
      FIELD_LABELS[name],
      `the form collects "${name}" and the parser has no label for it — add one to FIELD_LABELS`
    );
  }
});

// --- The declared-value rule, as the door applies it -----------------------

test("the covering note’s \"A\" is not a valid tier code, which is why it is never stored", async () => {
  // THE RULE'S TEETH. "Accepted as written, stored only if valid, never mapped
  // by guess" only means something if the invalid case is actually rejected —
  // and the covering note in the one real email says "Involvement Tier: A".
  // validateTierCode refuses it because tier codes are lowercase, so the email
  // door leaves the field null and flags it rather than inventing "ai".
  const { validateTierCode } = await import('../src/lib/tier-codes.mjs');
  assert.equal(validateTierCode('ai'), null, 'a valid code must pass');
  assert.notEqual(validateTierCode('A'), null, 'the covering note value must NOT pass');
  assert.notEqual(validateTierCode('nonsense'), null);
});
