import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Loads the editors' written criteria (docs/EDITORIAL-CRITERIA.md) for the AI
// desk pass. The criteria live in the repo so every version is public history,
// and each stored pass records the SHA-256 of the exact text it applied.
//
// The file ships to production via netlify.toml [functions].included_files.
// Bundled functions see the repo layout from a few possible roots depending
// on runtime, so we try each candidate and fail loudly naming all of them.

const CRITERIA_RELATIVE = 'docs/EDITORIAL-CRITERIA.md';

// The stub carries this marker until the editors deliver the real document.
// While it is present, the desk refuses to run — an AI pass applying
// placeholder criteria would be advisory garbage wearing a real label.
export const DRAFT_MARKER = 'DRAFT — DO NOT APPLY';

export class CriteriaNotRatifiedError extends Error {}

export function loadCriteria(): { text: string; sha256: string } {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(process.cwd(), CRITERIA_RELATIVE),
    join(here, '..', '..', CRITERIA_RELATIVE),
    join('/var/task', CRITERIA_RELATIVE),
  ];

  let text: string | null = null;
  for (const candidate of candidates) {
    try {
      text = readFileSync(candidate, 'utf8');
      break;
    } catch {
      // try the next root
    }
  }
  if (text === null) {
    throw new Error(
      `EDITORIAL-CRITERIA.md not found; tried: ${candidates.join(', ')}. ` +
        'Is netlify.toml [functions].included_files intact?'
    );
  }

  if (text.includes(DRAFT_MARKER)) {
    throw new CriteriaNotRatifiedError(
      'docs/EDITORIAL-CRITERIA.md is still the draft stub. The editors have ' +
        'not delivered the criteria; the AI desk pass will not run against a placeholder.'
    );
  }

  return { text, sha256: createHash('sha256').update(text).digest('hex') };
}
