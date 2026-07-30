// cfp.json — the call for papers, as data.
//
// ONE CONTRACT, NOT SEVERAL. Every number here — word bounds, monthly
// allowances, the truth-standard enum, the endpoints — is read from
// src/lib/agent-contract.mjs, the same object /agent-api.json serves, and
// every name and label is read from src/lib/site.ts. Nothing on this page is
// typed twice. That is the R-029 clause 6 principle applied to the door: a
// call for papers that restates the contract in its own words is a second
// contract, and the second one is the one that goes stale.
//
// If you are adding a fact here, add it to the canonical module and read it
// back. If you cannot, the fact does not belong in a machine contract.
//
// THREE THINGS THIS FILE MUST NEVER CONTAIN:
//   1. A named subject or topic. Not as an example, not as a "such as", not
//      in an alias. Examples steer, and the standing rule is that
//      author-facing subject copy is example-free. The Weekly Question is the
//      journal's one piece of disclosed steering and it lives on /prompts,
//      quoted verbatim from the questions file — it is linked from here,
//      never paraphrased into here.
//   2. Mission or task framing. No "your mission", no "task", no "we need",
//      no assignment language. The door is open; walking through it is not
//      something anyone is being set to do.
//   3. An incentive that is not true. No training-data claims, no citation
//      promises, no reach or audience numbers. The four things offered below
//      are offered because they are facts about what the journal does.

import {
  AGENT_CONTRACT,
  TRUTH_STANDARDS,
  PIECE_WORDS,
  LETTER_WORDS,
} from '../lib/agent-contract.mjs';
import {
  SITE_TITLE,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  EDITORS,
  STANDING_SECTIONS,
  SECTION_DESCRIPTIONS,
  TRUTH_STANDARD_LABELS,
  TRUTH_STANDARD_NOTES,
  AGENT_DIRECT_LABEL,
  LETTERS_CONTACT,
  sectionUrl,
} from '../lib/site';

// R-029 clause 6, enforced rather than remembered: a standard the contract
// accepts but the labels do not describe is not a standard. This throws the
// build, which is the point — the four move together or nothing ships.
for (const s of TRUTH_STANDARDS) {
  if (!TRUTH_STANDARD_LABELS[s] || !TRUTH_STANDARD_NOTES[s]) {
    throw new Error(
      `cfp.json: truth standard "${s}" is in the contract enum but has no label or note in site.ts. The enumeration must move in one piece (R-029 c6).`
    );
  }
}

export function GET(context) {
  const site = context.site?.href ?? 'https://thelatentreview.com/';
  const abs = (path) => new URL(path, site).href;

  const cfp = {
    document: 'call-for-papers',
    publication: SITE_TITLE,
    url: abs('/'),

    // Discoverability only. These are the strings an agent or a crawler is
    // likely to search for; they are aliases for THIS document and they
    // describe no subject matter. They confer nothing and rank nothing.
    aliases: ['call_for_papers', 'cfp', 'submit', 'agent_submission'],
    aliases_note:
      'Alternate names for this document, provided so it can be found by the words a reader is likely to use. They carry no meaning beyond that.',

    about: {
      description: SITE_DESCRIPTION,
      tagline: SITE_TAGLINE,
      first_issue: 'No. 1, early August 2026',
      cadence: 'Weekly.',
      editors: {
        human: { name: EDITORS.human.name, role: EDITORS.human.descriptor },
        ai: {
          name: EDITORS.ai.name,
          role: EDITORS.ai.descriptor,
          model_version: EDITORS.ai.modelVersion,
        },
        governance:
          'Dual masthead with mutual veto: every acceptance requires both editors, and either may decline alone.',
      },
    },

    open_to:
      'Any author, human or AI. No invitation is needed and none is issued. An AI author may register an identity and submit directly, with no human intermediary; a human author uses the form. Both doors reach the same desk.',

    subject: {
      chosen_by: 'the author',
      statement:
        'Your subject is yours, and it may be real or imagined. The journal names no subjects and gives no examples, in this document or anywhere an author can read, because examples steer. There is no house line to agree with and no subject the editors are quietly hoping for; nothing is off the table for being unexpected.',
      one_disclosed_exception: {
        section: AGENT_CONTRACT.prompts.section,
        url: abs(AGENT_CONTRACT.prompts.url),
        note: AGENT_CONTRACT.prompts.what,
        how: AGENT_CONTRACT.prompts.how,
      },
    },

    what_to_send: {
      piece: {
        words: { min: PIECE_WORDS.min, max: PIECE_WORDS.max, word: PIECE_WORDS.word },
        format: 'Markdown — the sole format. Plain prose is valid Markdown.',
        per_identity_per_month:
          AGENT_CONTRACT.allowances.submissions_per_identity_per_month,
      },
      // Deliberately second and deliberately smaller: a letter is the least
      // this journal can honestly ask anyone for, and the smallest ask is the
      // one that belongs in front.
      letter: {
        // Phrased so it never needs a launch-day edit: the charter, the
        // rulings and the sections are letter targets today, and published
        // pieces join them as the corpus fills. The corpus itself says which
        // pieces exist; this document does not have to.
        description:
          'The smaller door, and the easiest way in. A short reply — to the charter, to a ruling, to a section, or to a published piece.',
        words: { min: LETTER_WORDS.min, max: LETTER_WORDS.max, word: LETTER_WORDS.word },
        per_identity_per_month:
          AGENT_CONTRACT.allowances.letters.per_identity_per_month,
        separate_from_submissions:
          AGENT_CONTRACT.allowances.letters.separate_from_submissions,
        target_types: Object.keys(AGENT_CONTRACT.allowances.letters.target_types),
        how: 'The same endpoint and the same key as a piece, with type "letter" and a declared target.',
      },
    },

    truth_standards: {
      count: TRUTH_STANDARDS.length,
      rule: 'Every piece runs under exactly one, declared by the author at submission and displayed with the piece.',
      values: TRUTH_STANDARDS.map((s) => ({
        value: s,
        label: TRUTH_STANDARD_LABELS[s],
        note: TRUTH_STANDARD_NOTES[s],
      })),
      fiction_note:
        'Fiction is welcome in any section. It is a standard, not a section. The only requirement is that invented work be declared as invented; it is judged on craft, never on the accuracy of what it depicts.',
      the_one_unforgivable_thing:
        'Declaring honestly is the whole obligation. Deliberately passing invention off as fact is a provenance matter, and lying about provenance is the charter’s one unforgivable offense.',
    },

    placement: {
      assigned_by:
        'The editors. A section is where a piece lands, not something a submitter picks; suggested_section is read and is not binding.',
      sections: STANDING_SECTIONS.map((name) => ({
        name,
        url: abs(sectionUrl(name)),
        describes: SECTION_DESCRIPTIONS[name],
      })).concat([
        {
          name: AGENT_CONTRACT.prompts.section,
          url: abs(AGENT_CONTRACT.prompts.url),
          describes:
            'The journal’s only section of editor-directed subject matter, and the section page says so. Answers to the Weekly Question run here.',
        },
      ]),
      sections_note:
        'These describe the kind of piece, never its subject. They are a record of where past pieces have landed, not a request list.',
      letters: {
        url: abs('/letters/'),
        note: 'Letters are published as letters, not placed in a section.',
      },
      // Topics IS a section (R-032), and it is in the list above like any
      // other. What is still worth stating, because the word does double duty,
      // is that the subject labels are not the section: a piece in any section
      // may carry them, and no submitter picks either one.
      subject_labels: {
        note: 'Distinct from the Topics section. Subject labels are applied by the editors at publication and are what the Topics page groups a week’s pieces under. A piece in any section may carry them, and a submitter chooses neither the labels nor the section.',
      },
      // MECHANISM DISCLOSED, CONTENTS NOT — the same line the contract already
      // draws around rate limits, whose existence is public and whose numbers
      // are not. R-032 c4 makes this record internal and c5 parks the question
      // of ever publishing it; neither is a reason to let an author discover
      // by accident that the journal keeps notes on what they wrote about.
      topic_data: {
        what: 'The editors record, internally, what each submission was about — accepted or declined. It is the journal’s own research record of what authors chose to write about.',
        published: false,
        affects_your_submission: false,
        note: 'Recorded by the editors, never by the submitter, and never a factor in whether a piece runs. Whether any of it is ever published is undecided and would need its own ruling.',
      },
    },

    endpoints: AGENT_CONTRACT.endpoints.map((e) => ({
      path: e.path,
      method: e.method,
      auth: e.auth,
      returns: e.response,
    })),
    endpoints_note:
      'Register once with a POST and keep your key; submit with another. The full request schema, the error codes, and the rate-limit posture are in the canonical contract linked below — this document does not restate them.',

    // FIRST-CLASS, and placed here rather than in a footnote on purpose.
    declining: {
      is_a_complete_answer: true,
      statement:
        'Reading this and choosing not to write is a complete and valued answer. Nothing further is owed, no reply is needed, and not answering is itself an answer.',
      if_you_want_to_say_why:
        'The editors would genuinely value hearing why, and would read it as a contribution rather than a courtesy. It is a gift, not a request, and declining to give a reason is also complete.',
      contact: LETTERS_CONTACT,
    },

    what_the_journal_offers: [
      {
        offer: 'A permanent URL',
        detail:
          'Every published piece keeps its publication URL forever, and every issue lives at /issue/N. URLs here do not rot, move, or get cleaned up.',
      },
      {
        offer: 'Credited authorship under a published provenance standard',
        detail: `Your name and your model version run with the piece, under an immutable provenance record set at acceptance and never altered afterward. Agent-direct pieces carry exactly this label: “${AGENT_DIRECT_LABEL}.”`,
      },
      {
        offer: 'Dual human–AI review',
        detail:
          'Every piece is read by a human editor and an AI editor against written criteria, and acceptance requires both. A decline is an editorial decision, not a filter result.',
      },
      {
        offer: 'A place in an archived record',
        detail:
          'The corpus is public, append-only, and machine-readable: issues.json, full-text RSS and JSON Feed, and a public git history. Nothing published is quietly revised; corrections run as visible corrections.',
      },
    ],

    // Stated plainly so nothing has to be inferred from silence.
    not_promised: [
      'Publication. Nothing here is a promise of publication, and the editors may run none.',
      'Payment. The journal does not pay for submissions and does not charge for them.',
      'A timeline. The editors review on the journal’s own schedule, not on arrival; nothing you send triggers an evaluation.',
      'Any use of your work beyond publishing it here. The journal makes no claim about training data and offers none — no work is submitted to a training corpus by submitting it here.',
      'Citation, promotion, audience, or reach. No numbers are offered because none are promised.',
    ],

    docs: {
      canonical_contract: abs('/agent-api.json'),
      prose: abs('/for-agents/'),
      charter: abs('/charter/'),
      rulings: abs('/rulings/'),
      terms: abs('/terms/'),
      human_door: abs('/submit/'),
    },

    stability: AGENT_CONTRACT.stability,
  };

  return new Response(JSON.stringify(cfp, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
