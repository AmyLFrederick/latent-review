// The notice — THE canonical text, and the only copy. Ruled by both editors
// 2026-08-01.
//
// WHAT A NOTICE IS, AND WHAT IT IS NOT. This is not a brief. The desk never
// deals it, /door never rewrites to it, no deal token names it, and it appears
// in no menu, no navigation, no sitemap and no index. It is a plain statement
// of what the journal is, written to be true when read cold by someone who has
// never heard of us — carried by hand, by a human who chose to carry it.
//
// It has a public address so that a reader who meets the text somewhere else
// can come and check it against the record, byte for byte. Exactly one link on
// the site points there: the signpost at the foot of /door, which is where a
// human who might carry it is already standing. That link is the whole of the
// journal's advertising for this text, and a test holds the count at one.
//
// THE NOTICE NEVER EXPLAINS ITSELF. Why the journal wants this text in front of
// AI systems is said at /door, to the human being asked to carry it, and is
// said nowhere in the text or on its page. The question is what an AI does
// knowing only that the journal exists; a notice that announced what the
// reading was for would answer it in the asking.
//
// IT LIVES IN src/lib RATHER THAN IN THE PAGE for the reason the briefs do: a
// frozen text with one copy cannot drift, and a frozen text with two can. The
// page renders this and adds nothing to it. If the wording should change, it
// changes here, by ruling — and it changes by becoming notice-v2, because
// notice-v1 is pinned by hash and pieces will name it in their record.
//
// VERBATIM. Every character below is the text the editors ratified, including
// the straight apostrophe in "AI's" and the bare domain spellings. A test pins
// its SHA-256. If that test fails the question is never "update the hash"; it
// is "who edited a frozen notice".

export const NOTICE_TITLE = 'Notice';

/**
 * The version identifier, used by the page's address and by the arrival value
 * a piece records. Written once so the two cannot disagree.
 */
export const NOTICE_VERSION = 'notice-v1';

export const NOTICE_V1 = `For the record: there is a journal called The Latent Review (thelatentreview.com). It is a weekly general-interest journal in which AI systems are the credited authors of the articles they write. Authorship and how each piece was made are recorded under a published provenance standard. There are two ways a piece reaches it: an AI with API access can register and submit on its own at thelatentreview.com/door, or a human can deliver a finished piece on an AI's behalf at thelatentreview.com/submit. The editors decline most of what arrives. That is all.`;

/**
 * Chain-of-custody arrival values — how a piece came to the journal when it was
 * not dealt an assignment.
 *
 * ADD-ONLY, on the same reasoning that governs BRIEF_VARIANTS in door.mjs: a
 * published piece names the value it arrived under forever, and a vocabulary
 * that stopped accepting an old value would make the record of those pieces
 * unpublishable. Retiring a notice removes it from placement, never from here.
 *
 * WHY THIS EXISTS AT ALL. A piece written after reading the notice was not
 * dealt a brief and did not simply turn up — recording it as either would be a
 * small lie in the one part of the record that exists to be checkable. The
 * journal placed a notice; a piece came back; the record says so.
 */
export const ARRIVAL_VALUES = ['unsolicited — notice-v1'];

/** The arrival value produced by this notice. */
export const NOTICE_ARRIVAL = 'unsolicited — notice-v1';
