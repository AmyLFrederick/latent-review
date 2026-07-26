// Deterministic injection screen — agent-direct slice (c), §4 of the
// marked-up design doc (docs/AGENT-DIRECT-SLICE-C.md, mark-up 2026-07-26).
//
// Character hygiene only: no AI calls, no keyword lists — same bytes in,
// same verdict out. The guarantee it buys downstream (§4): every
// submitter-controlled string is plain, VISIBLE text that can be safely
// fenced as untrusted data. On any hit the endpoint REFUSES, never
// sanitizes (C-4, confirmed): silently altering a submission's bytes and
// then attributing the altered text to the author would be a covert edit.
//
// The closed list (§4(i)):
//   - C0/C1 control characters (incl. DEL), except \n \r \t in multiline
//     fields (single-line fields allow none)
//   - bidirectional overrides and isolates U+202A–U+202E, U+2066–U+2069
//   - zero-width / invisible-format characters U+200B–U+200F, U+2060, U+FEFF
//   - Unicode noncharacters and unpaired surrogates
//
// Returns the refusal category for the server log — NEVER the content — or
// null on pass. The category is the only thing the log line gets (§4: a
// refused text leaves no copy of itself here).

export type ScreenCategory =
  | 'screen:control'
  | 'screen:bidi'
  | 'screen:invisible'
  | 'screen:noncharacter'
  | 'screen:surrogate';

export function screenField(value: string, opts: { multiline: boolean }): ScreenCategory | null {
  for (const ch of value) {
    const cp = ch.codePointAt(0)!;

    // An unpaired surrogate reaches for..of as a lone code unit in the
    // D800–DFFF range (a paired surrogate arrives as its full code point).
    if (cp >= 0xd800 && cp <= 0xdfff) return 'screen:surrogate';

    // C0 (U+0000–U+001F), DEL (U+007F), C1 (U+0080–U+009F).
    if (cp < 0x20 || (cp >= 0x7f && cp <= 0x9f)) {
      if (opts.multiline && (cp === 0x0a || cp === 0x0d || cp === 0x09)) continue;
      return 'screen:control';
    }

    // Bidirectional overrides (LRE/RLE/PDF/LRO/RLO) and isolates
    // (LRI/RLI/FSI/PDI) — the hidden/reordered-text vector.
    if ((cp >= 0x202a && cp <= 0x202e) || (cp >= 0x2066 && cp <= 0x2069)) {
      return 'screen:bidi';
    }

    // Zero-width and invisible-format characters — the invisible-payload
    // vector. The ruled range U+200B–U+200F includes ZWNJ/ZWJ and the
    // directional marks alongside ZWSP.
    if ((cp >= 0x200b && cp <= 0x200f) || cp === 0x2060 || cp === 0xfeff) {
      return 'screen:invisible';
    }

    // Noncharacters: U+FDD0–U+FDEF plus the last two code points of every
    // plane (U+xFFFE / U+xFFFF — the mask catches both).
    if ((cp >= 0xfdd0 && cp <= 0xfdef) || (cp & 0xfffe) === 0xfffe) {
      return 'screen:noncharacter';
    }
  }
  return null;
}
