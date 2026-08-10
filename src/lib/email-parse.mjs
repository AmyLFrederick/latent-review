// Parsing a submission email into fields.
//
// THE SPEC IS docs/EMAIL-SUBMISSION-FORMAT.md AND IT CAME FIRST. Both editors
// approved that document before a line of this file existed, precisely so this
// parser could not become the spec by accident. Where the two disagree the
// document governs and this file is wrong.
//
// PURE, AND DELIBERATELY SO. No network, no database, no clock. It takes text
// and returns what it found. Everything that can go wrong here is reproducible
// from a string, which is why the tests can be exhaustive and why the webhook
// that calls it stays short enough to read.
//
// NOTHING IS EVER REJECTED. There is no error return and no throw. A message
// that parses cleanly yields fields; a message that parses badly yields fewer
// fields and more warnings; a message that is not in this format at all yields
// its whole text as the body and a warning saying so. The desk sorts it out.
// The format is a convenience for the editors, never a gate on the author.

/**
 * The exact serialisations of each form label, and the lenient forms.
 *
 * WHY TWO TIERS, AND WHY IT IS LOAD-BEARING. `exact` holds the strings the
 * /submit form actually produces when a submitter copies it out — label text
 * plus its "required" span. `lenient` holds the shorter forms a person writes
 * from memory. Only an `exact` label may end the piece; see labelAt().
 *
 * HISTORICAL SERIALISATIONS STAY IN `exact` FOREVER. The form's wording is
 * editable copy, so every edit silently changes this format — it happened on
 * 2026-08-09 when the pronouns label became "Author's pronouns (optional)".
 * Both spellings parse, and retiring one is a decision rather than a side
 * effect of rewording a form. A test asserts this table against the form.
 */
export const FIELD_LABELS = {
  title: { exact: ['title required'], lenient: ['title'] },
  author_name: { exact: ['byline required'], lenient: ['byline'] },
  body: { exact: ['the piece required'], lenient: ['the piece'] },
  involvement_tier: { exact: ['involvement tier required'], lenient: ['involvement tier'] },
  truth_standard: { exact: ['truth standard required'], lenient: ['truth standard'] },
  author_model_version: {
    exact: ['ai model and version required'],
    lenient: ['ai model and version', 'model and version', 'model version'],
  },
  provenance_attestation: {
    exact: ['provenance attestation required'],
    lenient: ['provenance attestation'],
  },
  contact_email: { exact: ['contact email required'], lenient: ['contact email'] },
  attestation: { exact: ['attestation'], lenient: [] },
  // Both spellings are exact: the first is the current form, the second is what
  // the form said until 2026-08-09 and what the historical record holds.
  pronouns: {
    exact: ["author's pronouns (optional)", 'pronouns'],
    lenient: ["author's pronouns"],
  },
  suggested_section: { exact: ['suggested section'], lenient: ['section'] },
  prompt_disclosure: {
    exact: ['the prompt behind the piece - optional'],
    lenient: ['the prompt behind the piece', 'prompt'],
  },
  notes: { exact: ['notes to the editors'], lenient: ['notes'] },
  courier_submission: { exact: ['courier submission'], lenient: [] },
  courier_author_identity: {
    exact: ["ai author's identity required for a courier submission"],
    lenient: ["ai author's identity"],
  },
};

/** Fields the format calls required. Absence of any one raises a warning. */
export const REQUIRED_FIELDS = [
  'title',
  'author_name',
  'body',
  'involvement_tier',
  'truth_standard',
  'author_model_version',
  'provenance_attestation',
  'contact_email',
  'attestation',
];

/**
 * Fold a label to its comparison form.
 *
 * Apostrophes and dashes are normalised because mail clients, word processors
 * and the form itself disagree about which characters they are — the form's
 * pronouns label carries a curly apostrophe and its courier label a straight
 * one, and a submitter's client may substitute either. A format that failed on
 * a smart quote would fail on most real email.
 */
function fold(s) {
  return s
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[–—]/g, '-')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * If this line opens a field, say which field, how strongly, and what value (if
 * any) sat on the same line.
 *
 * Matching is on the whole label — everything left of the FIRST colon, folded —
 * against the table, never a substring. A line of prose reading "Here is the
 * thing: it works" folds to "here is the thing", matches nothing, and stays
 * prose.
 */
export function labelAt(line) {
  const colon = line.indexOf(':');
  if (colon === -1) return null;
  const label = fold(line.slice(0, colon));
  if (!label) return null;
  const inlineValue = line.slice(colon + 1).trim();

  for (const [field, forms] of Object.entries(FIELD_LABELS)) {
    if (forms.exact.some((f) => fold(f) === label)) {
      return { field, strength: 'exact', inlineValue };
    }
  }
  for (const [field, forms] of Object.entries(FIELD_LABELS)) {
    if (forms.lenient.some((f) => fold(f) === label)) {
      return { field, strength: 'lenient', inlineValue };
    }
  }
  return null;
}

/**
 * Parse a submission email.
 *
 * @param {string} raw the message text, already extracted from MIME
 * @returns {{fields: Record<string,string>, warnings: string[], preamble: string, sawAnyLabel: boolean}}
 */
export function parseSubmissionEmail(raw) {
  const text = typeof raw === 'string' ? raw : '';
  const lines = text.split(/\r\n|\r|\n/);

  /** @type {Record<string, string[]>} */
  const collected = {};
  const warnings = [];
  const preambleLines = [];
  let current = null;
  let sawAnyLabel = false;

  for (const line of lines) {
    const hit = labelAt(line);

    // THE COVERING-NOTE RULE, ENFORCED HERE AND NOWHERE ELSE.
    //
    // Submitters put their own metadata block above the prose, inside the piece
    // — a repeat of the title, the section, and (in the one example the spec was
    // built from) a line reading "Involvement Tier: A". That block is envelope
    // rather than essay, per the precedent set for "Grief Without a Griever".
    //
    // The hazard is specific and would be silent: "Involvement Tier:" folds to a
    // LENIENT label for a field that has not been filled yet, because the real
    // "Involvement tier required:" comes after the piece. Honouring it would end
    // the body at the covering note and drop the entire essay, filling the tier
    // with "A" as though the author had declared it there. The piece would
    // publish as eleven lines of metadata.
    //
    // So: while the piece is open, only an EXACT label — one of the strings the
    // form actually produces — may close it. Lenient forms are a forgiveness
    // mechanism for fields standing on their own, never a way to truncate an
    // essay from inside.
    const wouldTruncatePiece = current === 'body' && hit?.strength === 'lenient';

    // A field is opened once. A second occurrence is the author's text — which
    // is the other half of the same rule: a covering note is not a second,
    // quieter way to declare a field.
    const alreadyFilled = hit ? collected[hit.field] !== undefined : false;

    if (hit && !wouldTruncatePiece && !alreadyFilled) {
      sawAnyLabel = true;
      current = hit.field;
      collected[current] = [];
      if (hit.inlineValue) collected[current].push(hit.inlineValue);
      continue;
    }

    if (current === null) {
      preambleLines.push(line);
    } else {
      collected[current].push(line);
    }
  }

  /** @type {Record<string, string>} */
  const fields = {};
  for (const [field, valueLines] of Object.entries(collected)) {
    const value = valueLines.join('\n').replace(/^\s*\n+/, '').replace(/\s+$/, '');
    // An empty optional field is the same as an absent one — the label was
    // there and the submitter declined. For pronouns that specifically means
    // undeclared, which is a fact the record publishes rather than hides.
    if (value !== '') fields[field] = value;
  }

  const preamble = preambleLines.join('\n').trim();

  // NOT IN THIS FORMAT AT ALL — a plain letter, a reply, a note. It still
  // becomes a submission: the whole message is the body and the desk is told
  // why. Someone wrote to the journal in good faith and the journal keeps it.
  if (!sawAnyLabel) {
    const whole = text.trim();
    if (whole) fields.body = whole;
    warnings.push('no-labels-found');
    return { fields, warnings, preamble: '', sawAnyLabel: false };
  }

  for (const field of REQUIRED_FIELDS) {
    if (fields[field] === undefined) warnings.push(`missing:${field}`);
  }
  if (preamble) warnings.push('preamble-ignored');

  return { fields, warnings, preamble, sawAnyLabel: true };
}

/**
 * The three forwarded-message framings, and where each keeps the original date.
 *
 * A HEURISTIC, LABELLED AS ONE. Mail clients do not agree on how a forward
 * looks and none of this is a standard. What the desk does with a date it could
 * not establish is the part that matters: it shows the forward date, marks it
 * as parsed rather than attested, and waits for an editor.
 */
const FORWARD_FRAMINGS = [
  { name: 'gmail', marker: /^-+\s*Forwarded message\s*-+$/im, dateKey: /^Date:\s*(.+)$/im },
  { name: 'apple', marker: /^Begin forwarded message:\s*$/im, dateKey: /^Date:\s*(.+)$/im },
  { name: 'outlook', marker: /^-+\s*Original Message\s*-+$/im, dateKey: /^Sent:\s*(.+)$/im },
];

/**
 * Make a client's date line parseable, or leave it alone to fail honestly.
 *
 * Apple Mail writes "31 July 2026 at 09:14:00 CDT" and Outlook writes
 * "Thursday, July 31, 2026 9:14 AM" — the first is not a format `Date` accepts,
 * because of the "at". This removes the two decorations that stop an otherwise
 * ordinary date from parsing, and nothing else. It does not attempt to repair a
 * date it does not understand: a wrong date entered confidently into the record
 * is worse than a missing one an editor is asked about.
 */
function cleanDate(s) {
  return s
    .replace(/\bat\b/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find the original date inside a forwarded message.
 *
 * @returns {{date: string, framing: string, raw: string}|null} an ISO date, or
 * null where no framing matched or the date did not parse. Null is the ordinary
 * answer and means "use the forward date and flag it", never "reject".
 */
export function detectForwardedDate(raw) {
  const text = typeof raw === 'string' ? raw : '';
  for (const framing of FORWARD_FRAMINGS) {
    const marker = framing.marker.exec(text);
    if (!marker) continue;

    // Look only AFTER the marker. A Date: line above it belongs to the
    // forwarding message, which is the date we are trying not to use.
    const after = text.slice(marker.index);
    const found = framing.dateKey.exec(after);
    if (!found) return null;

    const rawDate = found[1].trim();
    const parsed = new Date(cleanDate(rawDate));
    if (Number.isNaN(parsed.getTime())) return null;
    return {
      date: parsed.toISOString().slice(0, 10),
      framing: framing.name,
      raw: rawDate,
    };
  }
  return null;
}
