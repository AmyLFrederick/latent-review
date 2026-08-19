// THE COMPACT PROVENANCE NOTATION — ratified by both editors 2026-08-18, with
// review by the journal's informal editorial advisor.
//
// FIVE MARKS, READ AT A GLANCE, in a form that survives a plain-text field, a
// social card, a search result and a terminal:
//
//   🤖        AI alone
//   🤖>👤     AI-led, human contributed
//   🤖🟰👤    balanced co-creation
//   👤>🤖     human-led, AI assisted
//   👤        human alone
//
// WHAT THIS IS NOT. It is not a third badge style and it is not an eighth
// badge. R-050 gave the seven badges two spellings and the set did not grow,
// because each of the seven could be written in either form. This cannot write
// all seven — five marks over seven tiers is a COLLAPSE, in the same family as
// `author_type` in src/lib/provenance.ts, which renders the same seven as three.
// A collapse is lossy by construction, so what matters is that it loses the
// same thing every time and says out loud what it lost.
//
// WHAT IT LOSES IS EDITING, AND ONLY EDITING (editors, 2026-08-18). The two
// editor tiers take the mark of the party that wrote — 🤖 and 👤 — because the
// scope rule below governs and editing does not enter the mark. Every one of the
// seven resolves. See MARK_BY_TIER and EDITOR_TIERS.
//
// THE DIRECTION RULE, and it is load-bearing rather than decorative:
//
//   THE GREATER CONTRIBUTOR ALWAYS STANDS FIRST; ">" ONLY EVER POINTS RIGHT.
//
// Without it a reader meets 🤖>👤 and 👤>🤖 and reaches for the reading the
// glyphs invite — a ranking of machines against people. The rule makes the two
// marks one statement in two orders: this is a RATIO OF CONTRIBUTION on a single
// piece, and the side that did more is written first. A mark that pointed left
// would be the same claim spelled backwards, so the notation never spells it
// that way, and the marks below are COMPOSED by a function that can only put the
// greater party first rather than typed out as five strings that happen to obey
// the rule. tests/notation.test.mjs pins both the composition and the five
// literal results.
//
// It is the rule the badge notation already follows — `A>H` and `H>A`, R-044 —
// so an adopter meeting both meets one convention twice, not two conventions.
// Documented wherever the marks are documented: here, at /provenance, on
// /for-agents, and in /agent-api.json.
//
// THE SCOPE RULE, in the editors' own words and quoted verbatim in the public
// key at /provenance:
//
//   "Marks describe authorship of the words. Standard editorial handling —
//   selection, arrangement, headline, disclosed condensation — does not enter
//   the mark; where the editors' hands went further, the piece's provenance
//   notes say exactly how."
//
// DERIVED FROM THE TIER, NEVER SET BY HAND. There is no `mark` in any piece's
// frontmatter and there must never be one. A per-article value would be a second
// authorship claim standing beside the tier with nothing keeping the two in
// agreement — the exact disease src/lib/provenance.ts opens by naming. Every
// mark on this site and in every feed is this table applied to a code the record
// already holds.
//
// THE MARKS ENCODE THE INVOLVEMENT AXIS AND NOTHING ELSE. Not the track, not the
// attester, and above all not VERIFICATION: a claimed tier (R-051) and an
// attested one produce the same mark, exactly as they produce the same badge by
// that ruling's own words. What distinguishes them is language elsewhere on the
// piece — `verification` in the structured object, the sentence under Authorship
// in the Provenance block. A mark that shaded itself for a claim would be a mark
// answering a question it was not asked.

import { TIERS, type TierCode } from './site.ts';

/**
 * The glyphs, by codepoint, with the plain ASCII operator among them.
 *
 * WRITTEN AS ESCAPES RATHER THAN PASTED, because three of the four are
 * invisible-by-nature in a diff: an editor comparing 🤖 to a lookalike, or a
 * word processor helpfully substituting a variation selector, produces a change
 * no reviewer can see and no test would catch if the tests pasted the same
 * characters. The escapes ARE the specification the editors ratified, and the
 * comment beside each names it in words.
 *
 * THERE IS NO EMOJI GREATER-THAN, which is why the operator is a plain `>` — a
 * fact worth recording, because the obvious later "improvement" is to find one.
 */
const ROBOT = '\u{1F916}'; // 🤖 U+1F916 ROBOT FACE
const BUST = '\u{1F464}'; // 👤 U+1F464 BUST IN SILHOUETTE
const HEAVY_EQUALS = '\u{1F7F0}'; // 🟰 U+1F7F0 HEAVY EQUALS SIGN
const LEADS = '>'; // plain ASCII; no emoji greater-than exists

/**
 * A relational mark, composed so the direction rule cannot be broken by typing.
 *
 * The parameter is named `greater` because that is the rule: the party that
 * contributed more is the party written first, and this function has no
 * argument order in which it could be written second.
 */
function led(greater: string, lesser: string): string {
  return `${greater}${LEADS}${lesser}`;
}

/** A balanced mark. Order carries no meaning here, and the AI side leads by convention only. */
function balanced(one: string, other: string): string {
  return `${one}${HEAVY_EQUALS}${other}`;
}

/**
 * The five marks. Keys are the journal's own names for them; the values are what
 * a reader sees.
 */
export const MARKS = Object.freeze({
  'ai-alone': ROBOT,
  'ai-led': led(ROBOT, BUST),
  balanced: balanced(ROBOT, BUST),
  'human-led': led(BUST, ROBOT),
  'human-alone': BUST,
});

export type MarkKey = keyof typeof MARKS;

/**
 * The balanced mark written with a plain ASCII equals — 🤖=👤 (editors,
 * 2026-08-18).
 *
 * AN ACCEPTED EQUIVALENT FORM, NOT A FALLBACK THE CODE CHOOSES. 🟰 is the
 * canonical mark and is what every surface here draws and every feed emits; this
 * exists because U+1F7F0 is Unicode 14 and an older device or a plain-text
 * pipeline may not have it, and an adopter in that position should know they can
 * write `=` and still be writing the same mark. The notation already sets one
 * operator in plain ASCII — there is no emoji greater-than — so this is the
 * existing convention extended rather than a new allowance.
 *
 * NOTHING DETECTS ANYTHING. There is no rendering test, no capability sniff and
 * no fallback image; the equivalence is published in the documentation and the
 * reader or adopter applies it. A page that swapped forms based on what it
 * guessed about a device would be making the record depend on the browser.
 *
 * DERIVED FROM THE CANONICAL MARK so the two cannot drift into being different
 * marks — which is the whole risk of an equivalent form written out by hand.
 */
export const BALANCED_ASCII_FORM = MARKS.balanced.replace(HEAVY_EQUALS, '=');

/**
 * THE MARK'S SIZE WHERE IT LEADS (editors, dual yes 2026-08-18).
 *
 * The byline and a signed note's signature both put the mark first and the badge
 * after it, so the mark is set at the size of a lead element rather than of
 * apparatus — 2rem against the byline's own 1.05rem, and against the 1.15rem the
 * mark took when it sat second.
 *
 * THE NOTE'S IS DERIVED FROM THE BYLINE'S BY THE RATIO THE BADGE ALREADY USES
 * (30/35 ≈ 0.857, see BADGE_SIZE_NOTE), so a mark keeps the same relation to the
 * words beside it in both places. A note is apparatus and reads in a quieter
 * voice; a mark that ignored that would be the loudest thing in it.
 *
 * IN rem, NOT px, because these sit in running text and should move with a
 * reader's type size — which is the whole difference between a glyph in a line
 * and a badge, whose diameter is fixed so its ring cannot thin into a hairline.
 */
export const MARK_SIZE_BYLINE = '2rem';
export const MARK_SIZE_NOTE = '1.7rem';

/**
 * The plain-language meaning of each mark, in the editors' ratified words.
 *
 * THE MEANING IS THE RECORD AND THE GLYPH IS THE CONVENIENCE, which is not a
 * pleasantry — it is why this table exists at all. 🟰 is Unicode 14 (2021) and
 * will render as a box on older devices; an emoji font may draw any of the four
 * differently from the next; a plain-text field may strip them. Everywhere a
 * mark is drawn, this string travels with it as the accessible name, so a reader
 * who gets no glyph still gets the whole of what the glyph was for.
 */
export const MARK_MEANINGS: Readonly<Record<MarkKey, string>> = Object.freeze({
  'ai-alone': 'AI alone',
  'ai-led': 'AI-led, human contributed',
  balanced: 'balanced co-creation',
  'human-led': 'human-led, AI assisted',
  'human-alone': 'human alone',
});

/**
 * Which mark each of the seven tiers resolves to — the whole of the mapping, and
 * the place the editors review when they review this notation.
 *
 * EXHAUSTIVE OVER TierCode, so an eighth tier fails the BUILD rather than
 * defaulting to a mark nobody chose. This follows AUTHOR_TYPE_BY_TIER in
 * src/lib/provenance.ts for the same reason given there: a new tier silently
 * inheriting a mark would publish a claim about a piece that nobody made.
 *
 * FIVE MAP EXACTLY AND TWO MAP BY THE SCOPE RULE, so all seven resolve. `ai`,
 * `ai-human`, `ai-equals-human`, `human-ai` and `human` are the five marks in
 * the tier table's own words — the notation was designed over them and the
 * descriptions line up phrase for phrase ("AI led, with meaningful human
 * contributions" / "AI-led, human contributed").
 *
 * THE TWO EDITOR TIERS TAKE THE MARK OF THE PARTY THAT WROTE (editors' final
 * ruling, 2026-08-18). `ai-human-editor` is 🤖 and `human-ai-editor` is 👤,
 * because the scope rule governs: EDITING DOES NOT ENTER THE MARK. That is
 * standard publishing practice — a book is not co-authored by its editor — and
 * it is R-046's own contributing-versus-editing line read to its conclusion
 * rather than treated as a gap in this notation.
 *
 * THE MARK IS THE BYLINE; THE BADGE IS THE CREDITS. Nothing is lost by the
 * collapse, and that is what makes it honest rather than lossy in the way that
 * matters: the editing party stays fully disclosed one line away, in the badge
 * (`AI–Hᵉ`), in the tier name, in the description, in the Provenance block and
 * in `involvement_tier` on every machine surface. The mark answers who wrote it;
 * the record answers who else touched it.
 *
 * THIS SETTLES A QUESTION THAT WAS OPEN FOR ONE DAY, and the earlier answer is
 * recorded because the reasoning is worth keeping: a first pass left these two
 * unmarked on the grounds that 🤖 would drop a named human hand from the record.
 * The editors' answer is that it does not drop it — it puts it where editorial
 * hands belong. Every tier now resolves, and the sixth-mark question R-045 would
 * have governed never arises.
 */
export const MARK_BY_TIER: Readonly<Record<TierCode, MarkKey>> = Object.freeze({
  ai: 'ai-alone',
  'ai-human-editor': 'ai-alone',
  'ai-human': 'ai-led',
  'ai-equals-human': 'balanced',
  'human-ai': 'human-led',
  'human-ai-editor': 'human-alone',
  human: 'human-alone',
});

/**
 * The tiers whose mark is reached by the scope rule rather than by their own
 * description — named so the collapse is a published fact rather than something
 * a reader has to notice by comparing two tables.
 *
 * NOT AN EXCEPTION LIST. Every tier here resolves to a mark like any other; what
 * these two share is that the mark drops a party the tier names, which is the
 * scope rule doing exactly what it says. The surfaces that teach the notation
 * read this to say so out loud.
 */
export const EDITOR_TIERS: readonly TierCode[] = Object.freeze([
  'ai-human-editor',
  'human-ai-editor',
]);

/**
 * What the scope rule does to those two, in one sentence, for the surfaces that
 * explain it.
 *
 * One string rather than a phrase written at each call site, on the rule the
 * rest of this repository follows: a sentence restated is a sentence that can
 * come apart.
 */
export const EDITOR_TIER_NOTE =
  'Editing does not enter the mark, so these carry the mark of the party that wrote; the editing party stays named in the badge, the tier and the provenance record.';

export interface Mark {
  /** The glyph string, e.g. "🤖>👤". */
  mark: string;
  /** Its plain-language meaning — the record, where the glyph is the convenience. */
  meaning: string;
  /** The journal's own name for the mark, for a caller that needs to key on it. */
  key: MarkKey;
}

/**
 * The mark for a tier code, or null.
 *
 * ALL SEVEN TIERS RESOLVE, so null means the code is not one of the seven: a
 * chained code (R-035's grammar composes labels the five marks cannot express,
 * exactly as it composes labels the seven badges cannot — tierNotation() returns
 * null there too and this agrees with it), or no code at all. Both mean the same
 * thing at every call site: draw no mark, publish no mark field.
 *
 * IT NEVER FALLS BACK. `TIER_LABELS[code] ?? 'Not declared'` is the failure this
 * repository has already made once and written up in two modules; a mark is a
 * shorter claim than a label and would be no less wrong.
 */
export function markFor(code: string | null | undefined): Mark | null {
  if (typeof code !== 'string' || code.length === 0) return null;
  if (!(code in MARK_BY_TIER)) return null;
  const key = MARK_BY_TIER[code as TierCode];
  return { mark: MARKS[key], meaning: MARK_MEANINGS[key], key };
}

/**
 * The mark a PIECE carries, resolved from whichever field holds its tier.
 *
 * ONE FUNCTION BECAUSE THE BADGE HAS ONE (see src/lib/byline-badge.mjs). The
 * attested tier and the claimed tier resolve identically — R-051's ruling is
 * that the mark is the same drawing and this notation inherits it — and a
 * template that worked the precedence out for itself is a template that can work
 * it out differently from the one next door.
 *
 * A PIECE WITH NO TIER IN EITHER FIELD CARRIES NO MARK, which is the agent-direct
 * piece whose author claimed none. Its byline already draws no badge, for a
 * reason byline-badge.mjs states at length: a mark in an authorship position on a
 * piece that makes no authorship claim would publish an arrival fact as an
 * authorship one. The same reasoning governs here, and it is also why the `mark`
 * field in the structured object is null there while `author_type` is not — that
 * field is documented as a derivation and this one is documented as the
 * displayed mark, and they must each be what they say they are.
 */
export function markForPiece(d: {
  involvement_tier?: string;
  involvement_tier_claimed?: string;
}): Mark | null {
  return markFor(d.involvement_tier ?? d.involvement_tier_claimed);
}

/**
 * The public key: every tier, its mark, and its meaning — in TIERS order, so the
 * table at /provenance is the tier table's own order and the two cannot diverge.
 *
 * Built from TIERS rather than from MARK_BY_TIER's key order, because TIERS is
 * the ratified sequence (most-AI to most-human) and this notation is ordered the
 * same way by the editors' own design.
 */
export function markKey(): Array<{
  code: TierCode;
  label: string;
  description: string;
  mark: Mark | null;
}> {
  return TIERS.map((tier) => ({
    code: tier.code as TierCode,
    label: tier.label,
    description: tier.description,
    mark: markFor(tier.code),
  }));
}

/**
 * The five marks in order, most-AI to most-human — the notation on its own,
 * without the tiers, for the key that teaches it.
 *
 * DERIVED FROM MARKS' OWN ORDER rather than retyped. The object literal above is
 * written most-AI to most-human because that is the ratified sequence, and this
 * reads it in that order so a five-row table and the five-line design cannot
 * fall out of step.
 */
export const MARK_ORDER: readonly MarkKey[] = Object.freeze(
  Object.keys(MARKS) as MarkKey[]
);
