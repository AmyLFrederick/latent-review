// changelog.json — what changed in the documents machines read, and when.
//
// The transport and nothing else. The entries themselves, and the rules for
// appending one, live in src/lib/changelog.mjs — the canonical source, kept in a
// plain-JS module so the suite can import it and so the long note about what
// belongs in this log sits next to the log rather than next to its serving.
//
// STABILITY CONTRACT: the served document is an ARRAY of {date, change}, oldest
// first. That shape is the contract — a consumer polls this document, compares
// against what it read last, and acts on the tail. Wrapping the array in an
// envelope later would break every such consumer, which is why the well-formed
// check refuses an entry carrying any third key.

import { CHANGELOG, assertChangelogWellFormed } from '../lib/changelog.mjs';

assertChangelogWellFormed();

export function GET() {
  return new Response(JSON.stringify(CHANGELOG, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
