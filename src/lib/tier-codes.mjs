// CHAINED TIER CODES — the grammar R-035 clause 4 published, made executable.
//
// R-035 clause 6 recorded a gap and this module closes it: the standard could
// express a chained label and the journal could not store one, because
// `involvement_tier` was a closed enumeration of seven and the display lookup
// fell back to "Not declared" for anything else. A wrong answer printed in an
// authorship slot, silently.
//
// THE CENTRAL CLAIM, AND THE TEST THAT KEEPS IT HONEST. The seven base codes are
// not special cases here — they are what this grammar produces when nothing
// repeats. `ai-human-editor` parses to "AI + Human (editor)" by the same rules
// that turn `ai-1-equals-human-ai-2-editor` into "AI¹ = Human + AI² (editor)".
// A test asserts that every one of the seven round-trips to exactly the label
// TIERS already carries, which is what makes this add-only rather than a second
// system standing beside the first.
//
// THE GRAMMAR, from R-035 clause 4:
//   `+`        is a bare hyphen          ai-human          → AI + Human
//   `=`        is `-equals-`             ai-equals-human   → AI = Human
//   `(editor)` is a trailing `-editor`   ai-human-editor   → AI + Human (editor)
//   a numbered party suffixes its digit  ai-1, ai-2        → AI¹, AI²
//
// NO CODE IN THE SEVEN CONTAINS A DIGIT, which is what makes numbering safe to
// add: a numbered form cannot collide with an existing one.

/** The two party kinds, and how each is written out. */
const KINDS = Object.freeze({ ai: 'AI', human: 'Human' });

/**
 * Unicode superscripts for the party numbers.
 *
 * THE LABEL CARRIES CHARACTERS, NOT MARKUP, and that is deliberate: this string
 * goes into JSON feeds, the digest email, and the desk as well as onto pages, so
 * it has to be a string that means the same thing everywhere. R-035 clause 3's
 * bold-and-legible rule governs how a numeral is RENDERED on the site, which is a
 * question for the surface doing the rendering — not for the value.
 *
 * Ten is the ceiling because a work that passed through eleven hands of one kind
 * has outgrown a byline, and a silent wrap to nonsense is worse than a refusal.
 */
const SUPERSCRIPTS = Object.freeze({
  1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', 10: '¹⁰',
});

export const MAX_PARTY_NUMBER = 10;

/**
 * Parse a machine code into its parties and relations, or return an error.
 *
 * Returns `{ ok: true, parties, relations }` or `{ ok: false, error }`. Never
 * throws and never guesses: an unparseable code is an error, not a best effort,
 * because the caller's alternative to an error is printing something wrong in an
 * authorship slot.
 */
export function parseTierCode(code) {
  if (typeof code !== 'string' || code.length === 0) {
    return { ok: false, error: 'a tier code must be a non-empty string' };
  }
  if (code !== code.toLowerCase()) {
    return { ok: false, error: `tier codes are lowercase: "${code}"` };
  }
  if (!/^[a-z0-9-]+$/.test(code) || code.startsWith('-') || code.endsWith('-') || code.includes('--')) {
    return { ok: false, error: `malformed tier code: "${code}"` };
  }

  const tokens = code.split('-');
  const parties = [];
  const relations = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    // A party kind opens every term.
    if (!(token in KINDS)) {
      return { ok: false, error: `expected "ai" or "human", found "${token}" in "${code}"` };
    }
    const party = { kind: token, number: null, editor: false };
    i += 1;

    // An optional number belonging to the party just read.
    if (i < tokens.length && /^[0-9]+$/.test(tokens[i])) {
      const n = Number(tokens[i]);
      if (n < 1 || n > MAX_PARTY_NUMBER) {
        return { ok: false, error: `party number ${n} is out of range 1–${MAX_PARTY_NUMBER} in "${code}"` };
      }
      party.number = n;
      i += 1;
    }
    parties.push(party);

    if (i >= tokens.length) break;

    // `-editor` closes the label and annotates the party it follows.
    if (tokens[i] === 'editor') {
      party.editor = true;
      i += 1;
      if (i < tokens.length) {
        return { ok: false, error: `"editor" must end the code, but "${code}" continues after it` };
      }
      break;
    }

    // `-equals-` is an explicit relation; a bare kind is an implicit `+`.
    if (tokens[i] === 'equals') {
      relations.push('=');
      i += 1;
      if (i >= tokens.length) {
        return { ok: false, error: `"${code}" ends after "equals" with no second party` };
      }
    } else if (tokens[i] in KINDS) {
      relations.push('+');
    } else {
      return { ok: false, error: `unexpected "${tokens[i]}" in "${code}"` };
    }
  }

  if (parties.length === 0) {
    return { ok: false, error: `no parties in "${code}"` };
  }
  return { ok: true, parties, relations };
}

/**
 * The numbering rules of R-035 clause 2, checked rather than assumed.
 *
 * Two conditions have to hold together for a number to be permitted: the label
 * must CHAIN, and a kind must REPEAT. Both halves matter, and the second is the
 * one that separates this from R-020 — `AI = AI` is a same-kind relation among
 * parties at one moment, is valid, and takes no numbers.
 *
 * A CHAIN IS TWO OR MORE RELATIONS, and that reading is this module's, not a
 * phrase lifted from the ruling. R-035 describes chaining as a work passing
 * "through more hands", and one relation describes one passage; the ruling's own
 * worked example, AI¹ = Human + AI² (editor), is the two-relation case. If the
 * editors read it otherwise the constant below is where it changes.
 */
const CHAIN_MIN_RELATIONS = 2;

function checkNumbering(parties, relations, code) {
  const isChain = relations.length >= CHAIN_MIN_RELATIONS;
  const counts = {};
  for (const p of parties) counts[p.kind] = (counts[p.kind] ?? 0) + 1;

  for (const p of parties) {
    const repeats = counts[p.kind] > 1;

    if (p.number !== null && !isChain) {
      return `"${code}" numbers a party in a label that does not chain — numbers appear only in chained labels (R-035 clause 2)`;
    }
    if (p.number !== null && !repeats) {
      return `"${code}" numbers ${KINDS[p.kind]}, which appears only once — numbers appear only where a kind repeats (R-035 clause 2)`;
    }
    if (p.number === null && repeats && isChain) {
      return `"${code}" repeats ${KINDS[p.kind]} in a chained label without numbering it — a byline could not say which is which (R-035 clause 2)`;
    }
  }

  // Numbers run in order of appearance, per kind: first is 1, second is 2.
  const seen = {};
  for (const p of parties) {
    if (p.number === null) continue;
    seen[p.kind] = (seen[p.kind] ?? 0) + 1;
    if (p.number !== seen[p.kind]) {
      return `"${code}" numbers ${KINDS[p.kind]} out of order — parties are numbered in order of appearance (R-035)`;
    }
  }
  return null;
}

/**
 * Is this a valid tier code — one of the seven, or a well-formed chain?
 *
 * This is the gate the article schema uses. It is deliberately strict: a code
 * that is merely parseable but breaks the numbering rules is refused at the
 * build, where an editor can see it, rather than published as a label nobody
 * checked.
 */
export function validateTierCode(code) {
  const parsed = parseTierCode(code);
  if (!parsed.ok) return parsed.error;
  return checkNumbering(parsed.parties, parsed.relations, code);
}

/**
 * The display label for a code — "AI¹ = Human + AI² (editor)" — or null.
 *
 * Null rather than a fallback string, so a caller has to decide what an unknown
 * code means instead of inheriting a decision from here. The old
 * `TIER_LABELS[code] ?? 'Not declared'` is exactly the failure this avoids: it
 * turned an unrecognised code into a confident claim that no tier was declared.
 */
export function formatTierCode(code) {
  const parsed = parseTierCode(code);
  if (!parsed.ok) return null;
  if (checkNumbering(parsed.parties, parsed.relations, code) !== null) return null;

  const { parties, relations } = parsed;
  let out = '';
  parties.forEach((party, index) => {
    if (index > 0) out += ` ${relations[index - 1]} `;
    out += KINDS[party.kind];
    if (party.number !== null) out += SUPERSCRIPTS[party.number];
    if (party.editor) out += ' (editor)';
  });
  return out;
}

/** Does this code chain — i.e. is it beyond the seven canonical common cases? */
export function isChainedTierCode(code) {
  const parsed = parseTierCode(code);
  if (!parsed.ok) return false;
  return parsed.relations.length >= CHAIN_MIN_RELATIONS;
}
