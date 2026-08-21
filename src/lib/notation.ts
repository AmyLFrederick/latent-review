// THE COMPACT PROVENANCE NOTATION — ratified by both editors 2026-08-18, with
// review by the journal's informal editorial advisor, and AMENDED BY BOTH
// EDITORS 2026-08-19 (dual yes) to add the pencil operator and the two marks it
// makes possible.
//
// SEVEN MARKS, READ AT A GLANCE, in a form that survives a plain-text field, a
// social card, a search result and a terminal:
//
//   🤖         AI alone
//   🤖✏️👤     AI-written, human-edited or prompted
//   🤖>👤      AI-led, human contributed
//   🤖🟰👤     balanced co-creation
//   👤>🤖      human-led, AI assisted
//   👤✏️🤖     human-written, AI-edited or prompted
//   👤         human alone
//
// WHAT THIS IS NOT. It is not a third badge style and it is not an eighth badge.
// R-050 gave the seven badges two spellings and the set did not grow, because
// each of the seven could be written in either form. This notation writes all
// seven as well, so the same holds of it: the involvement axis gains a third
// spelling, and no new claim.
//
// IT IS NO LONGER A COLLAPSE, AND THAT IS THE WHOLE OF THE AMENDMENT. For one
// day this notation had five marks over seven tiers and was lossy by
// construction: the two edited tiers took the bare mark of the party that wrote,
// and the module said so out loud, because a collapse that hides what it drops
// is the dishonest kind. The pencil ends that. `author_type` in
// src/lib/provenance.ts is still a collapse — seven values rendered as three —
// and is still documented as one; this is not, and the two are no longer the
// same kind of instrument.
//
// THE PENCIL IS A NON-RELATIONAL OPERATOR, and that is why it can say what ">"
// could not. ">" RANKS: it states that one party contributed more than the
// other, which is a claim about contribution, and it is exactly the claim an
// edited tier declines to make. ✏️ ranks nothing. It marks HELP THAT SHAPED THE
// WORK WITHOUT DOING THE WRITING — editing, or prompting and steering — and
// asserts no contribution at all. So the human beside an AI-written piece can be
// named without implying they wrote any of it, and a tier no longer has to be
// spelled with the party it names dropped out of the mark.
//
// THE DIRECTION RULE, and it is load-bearing rather than decorative:
//
//   THE GREATER CONTRIBUTOR ALWAYS STANDS FIRST; ">" ONLY EVER POINTS RIGHT.
//   ACROSS THE PENCIL THE AUTHOR STANDS FIRST AND THE HELPING PARTY SECOND —
//   read left to right as "written by X, edited or prompted by Y."
//
// Without the first half a reader meets 🤖>👤 and 👤>🤖 and reaches for the
// reading the glyphs invite — a ranking of machines against people. The rule
// makes the two marks one statement in two orders: this is a RATIO OF
// CONTRIBUTION on a single piece, and the side that did more is written first.
//
// The second half extends the ORDER to the pencil without extending the ranking.
// Order still carries meaning there — which party wrote, which party helped —
// but the operator between them makes no comparison, so 🤖✏️👤 says who did what
// rather than who did more.
//
// A mark that pointed left, or that put the helping party first, would be a
// different claim spelled with the same glyphs. So the marks below are COMPOSED
// by functions that can only put the authoring party first, rather than typed
// out as seven strings that happen to obey the rule. tests/notation.test.mjs
// pins both the composition and the seven literal results.
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
// THE SCOPE RULE IS UNCHANGED BY THE AMENDMENT, and the two are easy to run
// together. It governs this journal's ORDINARY HANDLING of the pieces it
// publishes — selecting them, arranging them, giving them a headline, condensing
// them with the condensation disclosed — and none of that puts a pencil in a
// mark or moves a piece to an editor tier. What a pencil renders is a TIER the
// piece already carries, set at acceptance. Only the tier changes the mark.
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
 * WRITTEN AS ESCAPES RATHER THAN PASTED, because four of the five are
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
 * U+FE0F VARIATION SELECTOR-16, which asks for the emoji drawing of a character
 * that would otherwise be drawn as text.
 *
 * NAMED HERE BECAUSE IT IS DELIBERATE IN EXACTLY ONE PLACE and an accident
 * everywhere else. The three glyphs above are Emoji_Presentation=Yes — they draw
 * as emoji unasked, and a selector appended to one of them by a clipboard is a
 * change no reviewer can see and every parser can. The pencil is not; see below.
 */
const VS16 = '\u{FE0F}';

/**
 * ✏️ — U+270F PENCIL followed by U+FE0F. The non-relational operator, added by
 * the editors' amendment of 2026-08-19.
 *
 * THE VARIATION SELECTOR IS PART OF THE MARK, and this is the one glyph in the
 * notation where that is true. U+270F is a Unicode 1.1 dingbat with
 * Emoji_Presentation=No, so on its own it draws as a monochrome text pencil —
 * ✏ — which would set one text glyph among four emoji in every mark that uses
 * it. The editors specified ✏️, the emoji form, so the canonical mark carries the
 * selector and this escape says so rather than leaving it to survive a paste.
 *
 * THE BARE CHARACTER IS AN ACCEPTED EQUIVALENT FORM, on the same footing as the
 * plain ASCII equals: see PENCIL_TEXT_FORMS.
 */
const PENCIL = `\u{270F}${VS16}`;

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
 * A pencil mark, composed so the second half of the direction rule cannot be
 * broken by typing either.
 *
 * The parameters are named for the ROLES rather than for the sides — `author`
 * wrote the words, `helper` edited or prompted — because that is the whole of
 * what the order means here, and there is no argument order in which this
 * function could write the helping party first.
 *
 * IT MAKES NO COMPARISON, unlike led(). That is the point of the operator: this
 * composes a mark that says who wrote and who helped, and never who did more.
 */
function shaped(author: string, helper: string): string {
  return `${author}${PENCIL}${helper}`;
}

/**
 * The seven marks. Keys are the journal's own names for them; the values are
 * what a reader sees.
 *
 * IN THE TIER TABLE'S ORDER, most-AI to most-human — which since the amendment
 * is exactly the order of TIERS itself, seven marks over seven tiers, one for
 * one. MARK_ORDER reads this order rather than restating it.
 */
export const MARKS = Object.freeze({
  'ai-alone': ROBOT,
  'ai-human-helped': shaped(ROBOT, BUST),
  'ai-led': led(ROBOT, BUST),
  balanced: balanced(ROBOT, BUST),
  'human-led': led(BUST, ROBOT),
  'human-ai-helped': shaped(BUST, ROBOT),
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
 * The contents listing's mark — the front page and /issue/N (2026-08-21).
 *
 * SMALLER THAN BOTH, BECAUSE A LISTING LINE IS NOT A BYLINE. The byline's 2rem
 * is a lead element, sized to be the first thing met on the page and asserted
 * as such by test. A contents row is apparatus in a mono metadata line set at
 * 0.78rem, and a mark scaled off the byline would be nearly three times its
 * line and the loudest thing on the front page — repeated once per piece, which
 * compounds what a single byline can carry.
 *
 * IT IS NAMED RATHER THAN LEFT TO THE STYLESHEET'S DEFAULT, which happens to be
 * this same value. A placement that inherits its size has not chosen one, and
 * the next edit to that default would move a surface nobody was thinking about.
 * Every other placement names its size here; this one does too.
 *
 * THE RATIO IS THE NOTE'S, NOT THE BYLINE'S. Against 0.78rem this is 1.47×,
 * where a note's 1.7rem is 1.62× the body it sits in — apparatus scale, quieter
 * than a byline and still large enough that 🤖🟰👤 resolves as three glyphs
 * rather than a smudge, which is the floor the three-part marks impose.
 */
export const MARK_SIZE_LISTING = '1.15rem';

/**
 * The two pencil marks with the variation selector stripped — 🤖✏👤 and 👤✏🤖.
 *
 * THE SAME ALLOWANCE THE ASCII EQUALS ALREADY HAS, for the same reason and with
 * the same limits: an accepted equivalent form, published so an adopter knows
 * where the line is, and never a form this code chooses. Every surface here
 * draws the canonical ✏️ and every feed emits it.
 *
 * IT EXISTS BECAUSE THIS ONE IS LOST BY ACCIDENT RATHER THAN BY CHOICE. A
 * variation selector is invisible and plain-text pipelines strip it — which is
 * precisely the setting this notation was designed for. A consumer that received
 * 🤖✏👤 and could not match it against the published enum would conclude the
 * mark was unknown, when what actually happened is that a zero-width character
 * did not survive a copy. So the equivalence is stated rather than left to be
 * guessed at.
 *
 * DERIVED FROM THE CANONICAL MARKS, never typed, so the pair cannot drift.
 */
export const PENCIL_TEXT_FORMS: Readonly<
  Record<'ai-human-helped' | 'human-ai-helped', string>
> = Object.freeze({
  'ai-human-helped': MARKS['ai-human-helped'].replace(VS16, ''),
  'human-ai-helped': MARKS['human-ai-helped'].replace(VS16, ''),
});

/**
 * The plain-language meaning of each mark, in the editors' ratified words.
 *
 * THE MEANING IS THE RECORD AND THE GLYPH IS THE CONVENIENCE, which is not a
 * pleasantry — it is why this table exists at all. 🟰 is Unicode 14 (2021) and
 * will render as a box on older devices; ✏️ asks for its emoji form with a
 * variation selector a plain-text pipeline may strip; an emoji font may draw any
 * of them differently from the next; a plain-text field may lose them entirely.
 * Everywhere a mark is drawn, this string travels with it as the accessible
 * name, so a reader who gets no glyph still gets the whole of what the glyph was
 * for.
 */
export const MARK_MEANINGS: Readonly<Record<MarkKey, string>> = Object.freeze({
  'ai-alone': 'AI alone',
  'ai-human-helped': 'AI-written, human-edited or prompted',
  'ai-led': 'AI-led, human contributed',
  balanced: 'balanced co-creation',
  'human-led': 'human-led, AI assisted',
  'human-ai-helped': 'human-written, AI-edited or prompted',
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
 * ONE FOR ONE SINCE THE AMENDMENT OF 2026-08-19. Every tier has its own mark and
 * no two tiers share one, so nothing is dropped in the rendering and no tier is
 * spelled by leaving out a party it names. The five solo and relational marks
 * line up with their tiers phrase for phrase — the notation was designed over
 * the tier table's own words ("AI led, with meaningful human contributions" /
 * "AI-led, human contributed") — and the two pencil marks now do the same for
 * the two tiers the notation previously could not say.
 *
 * WHAT THE AMENDMENT REPLACED, recorded because the reasoning is worth keeping
 * and because a later reader will meet the earlier answer in the git history and
 * need to know which one governs. For one day the two editor tiers took the bare
 * mark of the party that WROTE — `ai-human-editor` was 🤖, `human-ai-editor` was
 * 👤 — on the scope rule read broadly and on standard publishing practice, a
 * book not being co-authored by the person who edited it.
 *
 * THAT READING WAS RIGHT ABOUT AUTHORSHIP AND IS KEPT WHERE AUTHORSHIP IS THE
 * QUESTION: `author_type` still derives `ai` from `ai-human-editor` and `human`
 * from `human-ai-editor`, because editing does not confer authorship. It was the
 * wrong answer for a MARK, because a mark is not only an authorship claim — it
 * is the whole of what a reader meets in a byline, and a reader shown 🤖 on an
 * edited piece was not told something true in shorter form, they were told less
 * than the tier says. The pencil lets a mark name the second party without
 * claiming they wrote any of it, which is the thing ">" could never have done.
 */
export const MARK_BY_TIER: Readonly<Record<TierCode, MarkKey>> = Object.freeze({
  ai: 'ai-alone',
  'ai-human-editor': 'ai-human-helped',
  'ai-human': 'ai-led',
  'ai-equals-human': 'balanced',
  'human-ai': 'human-led',
  'human-ai-editor': 'human-ai-helped',
  human: 'human-alone',
});

/**
 * The two tiers the pencil serves — the tiers whose second party edited or
 * prompted rather than contributed.
 *
 * NAMED SO THE SURFACES THAT TEACH THE NOTATION CAN POINT AT THEM rather than
 * hard-coding two codes apiece, and so a test can assert the property that
 * actually matters about them: both parties stand in the mark, and the operator
 * between them is the one that makes no comparison.
 *
 * NOT AN EXCEPTION LIST, and since the amendment not a loss list either. Before
 * 2026-08-19 these were the two tiers whose mark dropped a party the tier named,
 * and this export existed to say so out loud. It no longer says that, because it
 * is no longer true of them.
 */
export const EDITOR_TIERS: readonly TierCode[] = Object.freeze([
  'ai-human-editor',
  'human-ai-editor',
]);

/**
 * What the pencil covers, in the editors' ratified words — required verbatim on
 * every surface that teaches the notation.
 *
 * WHOEVER MADE THE SUGGESTION, THE PENCIL IS THE SAME. This is the sentence that
 * keeps the operator from being read as a claim about who held authority in the
 * exchange rather than about who wrote the words. It matters most in the
 * direction this journal's readers will find least familiar: an AI proposing
 * edits or questions on a human's piece is AI editing, and the mark says so.
 *
 * ONE STRING RATHER THAN A PHRASE WRITTEN AT EACH CALL SITE, on the rule the
 * rest of this repository follows: a sentence restated is a sentence that can
 * come apart. The editors gave this as text to publish, not as a summary to
 * paraphrase, and the tests pin it to the character.
 */
export const PENCIL_COVERS =
  'Editing or prompting here includes suggestions made and accepted, whichever party made them — an AI proposing edits or questions on a human’s piece is AI editing, the same as the reverse.';

/**
 * Where the pencil stops and the relational marks begin, in the editors'
 * ratified words — required verbatim on every surface that teaches the notation.
 *
 * IT DECLINES TO DRAW A LINE THE WORLD DOES NOT HAVE, AND SAYS SO, which is the
 * honest form of this and the reason it is published rather than kept as desk
 * guidance. The alternative — a rule with a threshold in it — would be a number
 * nobody could apply and every reader could dispute. What the journal can commit
 * to instead is that the judgment is made by named people, written down where
 * the piece is, and disclosed as close when it was close.
 */
export const PENCIL_VERSUS_CONTRIBUTION =
  'Prompting and contributing are a continuum, not a clean line. The pencil marks light-touch help: direction, framing, questions, suggestions — shaping that guided the work without doing the writing. Where a party’s input grows substantial enough that the piece is meaningfully theirs as well, that is contribution, and the relational marks (🤖>👤, 🤖🟰👤, 👤>🤖) apply. The editors place each piece by judgment and record that judgment in its provenance; where the call was close, the piece’s provenance notes say so.';

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
 * chained code (R-035's grammar composes labels the seven marks cannot express,
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
 * The seven marks in order, most-AI to most-human — the notation on its own,
 * without the tiers, for the key that teaches it.
 *
 * DERIVED FROM MARKS' OWN ORDER rather than retyped. The object literal above is
 * written most-AI to most-human because that is the ratified sequence, and this
 * reads it in that order so a seven-row table and the seven-line design cannot
 * fall out of step.
 */
export const MARK_ORDER: readonly MarkKey[] = Object.freeze(
  Object.keys(MARKS) as MarkKey[]
);
