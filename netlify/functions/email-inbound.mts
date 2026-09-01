import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Config } from '@netlify/functions';
import { serviceClient, describeDbError } from '../lib/supabase.mts';
import { overLimit, identifierHash } from '../lib/ratelimit.mts';
import { requireEnv } from '../lib/env.mts';
import { screenField } from '../lib/screen.mts';
import { parseSubmissionEmail, detectForwardedDate } from '../../src/lib/email-parse.mjs';
import { validateTierCode } from '../../src/lib/tier-codes.mjs';

// The email door. An email sent to the intake address becomes a submissions row
// with its fields parsed, visible on /admin like any other submission.
//
// Approved by both editors 2026-08-10 against docs/SCRATCH-EMAIL-INTAKE-FINDINGS.md
// (mechanism, cost, failure modes, the numbers below) and
// docs/EMAIL-SUBMISSION-FORMAT.md (the format, approved before the parser existed).
//
// WHAT THIS ENDPOINT IS FOR. The editors' inbox was a parallel records system:
// three of five published pieces have no submission record in the repository and
// one exists only as an email. This closes that, and it is the on-ramp for a
// future desk review of email-borne pieces.
//
// IT WRITES ROWS AND NOTHING ELSE. No model is called here, no model is called by
// anything this imports, and tests/no-llm-in-intake.test.mjs walks the import
// graph to keep it that way. The CLAUDE.md rule that submissions never
// auto-trigger API calls holds here by construction rather than by absence: an
// attacker who floods this door burns database rows, not tokens.
//
// NOTHING SENT IN GOOD FAITH IS EVER DROPPED. There is no rejection path for
// content. A message that does not parse becomes a row with its full text and a
// warning; a message over the rate cap becomes a stub row that names the
// provider id so it can be fetched later. The only 4xx here is for a caller who
// cannot prove it is Resend.

export const config: Config = { path: '/api/email-inbound' };

requireEnv(
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
  'RESEND_API_KEY',
  'RESEND_WEBHOOK_SECRET',
  'RATE_LIMIT_SALT'
);

// Door discipline, approved 2026-08-10. The per-sender pair bounds one
// correspondent; the global pair bounds everyone. The global daily figure lives
// in `agent_caps` and the constant below is only the fallback for a database
// that cannot answer — see dailyCap().
const SENDER_BURST_MAX = 5; // per hour
const SENDER_BURST_WINDOW_MIN = 60;
const SENDER_DAILY_MAX = 20; // per 24 hours
const SENDER_DAILY_WINDOW_MIN = 24 * 60;
const GLOBAL_HOURLY_MAX = 60;
const GLOBAL_DAILY_FALLBACK = 200;

const MAX_RAW_BYTES = 256 * 1024;
const MAX_BODY_CHARS = 40_000;

/**
 * The arrival value an email-borne piece carries forever. Add-only vocabulary.
 *
 * WRITTEN ONLY WHERE THE JOURNAL ACTUALLY OBSERVED THIS DOOR — corrected
 * 2026-08-31. `arrival` means how the PIECE reached the journal, not how the
 * MESSAGE reached the webhook, and for a carried piece those are two different
 * facts. This constant used to go onto every row unconditionally, which was
 * true while the email door was the only door that produced a row and stopped
 * being true the moment the editors began carrying form submissions in: the two
 * Monthly Question answers of 2026-08-27 came through /submit and the desk said
 * they came by email, because this line said so and nothing else ever spoke.
 *
 * A forward is the one carry this door can see. Where the raw shows forwarded
 * framing, the door did not witness the author's door and says nothing —
 * `arrival` is left NULL and flagged, on exactly the terms an undeclared tier or
 * truth standard is. Declared or absent, never supplied.
 */
const ARRIVAL_EMAIL = 'email';

/** Flagged when the message is a carry, so the desk knows a door needs attesting. */
const ARRIVAL_UNESTABLISHED = 'arrival-unestablished';

/**
 * Does the raw message show that someone forwarded it to us?
 *
 * The same framings detectForwardedDate() reads, asked as a yes/no — a forward
 * whose date is unreadable is still a forward, and the date question and the
 * custody question are not the same question. Kept next to its caller rather
 * than in email-parse.mjs because it is one regex over one already-parsed
 * string, and the parser's job is fields.
 */
const FORWARD_MARKER = /^-+\s*(Forwarded message|Original Message)\s*-+$/im;

/**
 * What goes in `contact_email` when there is nothing true to put there.
 *
 * The column is NOT NULL and regex-checked (20260717120000), so the door cannot
 * decline to answer, and a message whose envelope address is unreadable must
 * still become a row — nothing sent in good faith is dropped. `.invalid` is the
 * reserved TLD for exactly this (RFC 2606): it can never be a real address, so
 * nobody can mistake it for one and no mail can ever be sent to it.
 *
 * IT IS NEVER STORED SILENTLY. Approved 2026-08-10 on that condition: every row
 * that receives it also carries CONTACT_SENTINEL_WARNING, so the desk shows it
 * and an editor knows the real address has to come out of the raw message.
 */
const CONTACT_SENTINEL = 'unknown@invalid.local';
const CONTACT_SENTINEL_WARNING = 'envelope from failed validation; sentinel stored';

/** The column's own CHECK, mirrored so a row is never sent that cannot land. */
const CONTACT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The truth standards the submissions CHECK accepts, widened to four by
 * 20260730130000. Held here rather than imported so this door cannot start
 * accepting a value the database will reject at insert time — the list and the
 * constraint move together or not at all.
 */
const TRUTH_STANDARDS = ['reported', 'opinion', 'first-person', 'fiction'];

/**
 * Verify the caller is Resend, using Svix's scheme, with no new dependency.
 *
 * PLAIN NODE CRYPTO, MATCHING THE HOUSE STYLE that netlify/lib/email.mts set
 * ("Plain fetch — no SDK dependency"). Adding a package is an ask-first action
 * and this is thirty lines of HMAC; if the editors would rather carry the `svix`
 * library for its maintenance guarantees, this function is the only thing that
 * changes.
 *
 * THE RAW BODY STRING IS REQUIRED. The signature covers exact bytes, so this
 * runs before any JSON.parse. Parsing and re-serialising re-orders keys and
 * changes whitespace, and the verification then fails for a request that was
 * perfectly genuine — the single most common way this integration breaks.
 */
function verifySvix(rawBody: string, headers: Headers, secret: string): boolean {
  const id = headers.get('svix-id');
  const timestamp = headers.get('svix-timestamp');
  const signature = headers.get('svix-signature');
  if (!id || !timestamp || !signature) return false;

  // Replay window. Svix signs the timestamp, so an attacker cannot move it, but
  // a captured request could otherwise be resent forever.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', secretBytes)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest('base64');
  const expectedBytes = Buffer.from(expected, 'base64');

  // The header carries a space-delimited list so a secret can be rotated with
  // both old and new signatures live. Any match is a pass.
  for (const part of signature.split(' ')) {
    const [version, value] = part.split(',');
    if (version !== 'v1' || !value) continue;
    const candidate = Buffer.from(value, 'base64');
    if (candidate.length !== expectedBytes.length) continue;
    if (timingSafeEqual(candidate, expectedBytes)) return true;
  }
  return false;
}

/** The editors' daily ceiling, read from the table they tune it in. */
async function dailyCap(supabase: ReturnType<typeof serviceClient>): Promise<number> {
  const { data, error } = await supabase
    .from('agent_caps')
    .select('value')
    .eq('key', 'global_email_daily')
    .maybeSingle();
  if (error || !data) return GLOBAL_DAILY_FALLBACK;
  return typeof data.value === 'number' ? data.value : GLOBAL_DAILY_FALLBACK;
}

/** Retrieve the message body. The webhook carries metadata only, by design. */
async function fetchReceived(id: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as Record<string, unknown>;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  }

  // (1) Raw body first, verification second, parse third. That order is the
  // whole of the signature contract.
  const rawBody = await req.text();
  if (!verifySvix(rawBody, req.headers, process.env.RESEND_WEBHOOK_SECRET as string)) {
    console.error('email-inbound: signature verification failed');
    return new Response('Unauthorized', { status: 401 });
  }

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    console.error('email-inbound: verified request carried unreadable JSON');
    return new Response(null, { status: 204 });
  }

  // Other event types may be delivered to the same endpoint. Acknowledge and
  // ignore — a non-2xx would make Resend retry something we are not interested
  // in, forever.
  if (event.type !== 'email.received') return new Response(null, { status: 204 });

  const data = event.data ?? {};
  const emailId = typeof data.email_id === 'string' ? data.email_id : (data.id as string);
  const from = typeof data.from === 'string' ? data.from : '';
  const subject = typeof data.subject === 'string' ? data.subject : '';
  if (!emailId) {
    console.error('email-inbound: email.received carried no id');
    return new Response(null, { status: 204 });
  }

  const supabase = serviceClient();
  const senderKey = from.trim().toLowerCase() || 'unknown';
  const arrivedAt = new Date().toISOString();

  // (2) Rate limits, narrow before global, so a flood turned away per-sender
  // never also spends the ceiling that protects everyone else. Same ordering
  // reasoning as subscribe.mts.
  let throttled = false;
  try {
    throttled =
      (await overLimit(supabase, 'email-sender', senderKey, SENDER_BURST_MAX, SENDER_BURST_WINDOW_MIN)) ||
      (await overLimit(supabase, 'email-sender-daily', senderKey, SENDER_DAILY_MAX, SENDER_DAILY_WINDOW_MIN)) ||
      (await overLimit(supabase, 'email-global', 'global', GLOBAL_HOURLY_MAX, 60)) ||
      (await overLimit(supabase, 'email-global-daily', 'global', await dailyCap(supabase), 24 * 60));
  } catch (err) {
    // Fail closed on the CHECK itself, but still record the arrival — the
    // limiter being broken is not the sender's fault and must not lose a piece.
    console.error(err);
    throttled = true;
  }

  // (3) OVER THE CAP IS NOT A DROP. A stub row carrying the provider id, and a
  // 200 so Resend does not retry a refusal into a worse flood. The message
  // itself is still on Resend and can be fetched with the id below.
  if (throttled) {
    // EVERY COLUMN THE SCHEMA DEMANDS IS SUPPLIED HERE, and the ones the sender
    // did not give us are named as the journal's own note rather than left
    // blank. `submissions` requires a non-empty body, a provenance attestation
    // and a contact email; an earlier draft of this row omitted all three, so
    // the insert could never succeed and its error was discarded a line later.
    // Every over-cap message would have been dropped in silence — the one
    // outcome this file's header promises is impossible. The parenthetical
    // register is the one author_name already uses: a machine note, legible as
    // a machine note, never a claim made on the sender's behalf.
    //
    // The sentinel is announced here for the reason CONTACT_SENTINEL gives: a
    // placeholder the desk cannot see is an invented value.
    const contactUsable = CONTACT_EMAIL_RE.test(from.trim());
    // THE STUB CLAIMS LESS THAN THE ROW ABOVE IT, because it knows less. The
    // body was never fetched, so nothing here can tell whether this message is
    // an author writing to us or an editor carrying something in — and a door
    // is exactly the fact the fetch would have settled. `arrival` is therefore
    // blank and flagged (2026-08-31); the date is not, because the webhook's own
    // clock is the one thing a throttled message still establishes.
    const stubWarnings = [
      'throttled',
      `resend_id:${emailId}`,
      `sender_hash:${identifierHash(senderKey)}`,
      ARRIVAL_UNESTABLISHED,
    ];
    if (!contactUsable) stubWarnings.push(CONTACT_SENTINEL_WARNING);

    const { error: stubError } = await insertRow(supabase, {
      title: subject || '(over the intake cap — subject unavailable)',
      author_name: '(unparsed — intake throttled)',
      body: `(over the intake cap — the message was not fetched. It is still on Resend as ${emailId} and can be retrieved from there.)`,
      provenance_attestation: '(none received — intake throttled before the message was fetched)',
      contact_email: contactUsable ? from.trim() : CONTACT_SENTINEL,
      raw_email: '',
      arrival: null,
      parse_warning: stubWarnings.join(';'),
      arrived_at: arrivedAt,
      received_date: arrivedAt.slice(0, 10),
      received_date_source: 'direct',
      attachment_note: null,
    });

    // A THROTTLE IS ANSWERED 200; A FAILURE TO RECORD ONE IS NOT. The 200 above
    // exists so Resend does not retry a refusal into a worse flood, and that
    // reasoning covers a message we declined to fetch — not a message we failed
    // to write down. If the stub did not store, nothing anywhere records that
    // this message arrived, and a retry is the only thing standing between that
    // and a silent loss.
    if (stubError) {
      console.error(`email-inbound: throttle stub insert failed: ${stubError}`);
      return new Response('Storage failed', { status: 500 });
    }
    return new Response(null, { status: 200 });
  }

  // (4) Fetch the body. The webhook is metadata-only by design.
  const received = await fetchReceived(emailId);
  const warnings: string[] = [];

  let text = '';
  if (!received) {
    // A 429 or a blip on the retrieve. Record the arrival with what we have and
    // let an editor re-fetch; never discard the row.
    warnings.push('body-fetch-failed');
    warnings.push(`resend_id:${emailId}`);
  } else {
    text = typeof received.text === 'string' ? received.text : '';
    if (!text && typeof received.html === 'string') {
      // No plain-text part. Keep the HTML verbatim rather than converting it —
      // a lossy conversion would put words in the author's mouth. The editor
      // reads the raw.
      text = received.html;
      warnings.push('html-only');
    }
  }

  // (5) ATTACHMENTS ARE NOTED AND NEVER FETCHED. Filenames come from the event
  // metadata; the Attachments API is not called here and appears nowhere in
  // this file. That is the whole of the journal's relationship with them.
  const attachments = Array.isArray(received?.attachments) ? received.attachments : [];
  const attachmentNote =
    attachments.length > 0
      ? `${attachments.length} attachment(s), not opened: ${attachments
          .map((a: Record<string, unknown>) => String(a?.filename ?? 'unnamed'))
          .join(', ')
          .slice(0, 1800)}`
      : null;

  // (6) Bound the raw before storing. Truncate and flag; never refuse.
  let raw = text;
  if (Buffer.byteLength(raw, 'utf8') > MAX_RAW_BYTES) {
    raw = Buffer.from(raw, 'utf8').subarray(0, MAX_RAW_BYTES).toString('utf8');
    warnings.push('truncated:raw');
  }

  // (7) Parse. Pure, and the only place the format is interpreted.
  const parsed = parseSubmissionEmail(raw);
  warnings.push(...parsed.warnings);

  // (8) The date, and how we came to it. Four sources, never conflated — the
  // desk renders them differently so an editor knows which she is vouching for.
  // See docs/EMAIL-SUBMISSION-FORMAT.md §5.
  //
  // `forward` IS A CONCLUSION AND NO LONGER THE STARTING VALUE — corrected
  // 2026-08-31. It used to be what the variable was initialised to, so a message
  // that was not a forward at all landed labelled "forward date — original not
  // found" and wearing the desk's unresolved styling, on a date that was in fact
  // machine-certain. That styling was built to make an editor act; pointing it at
  // rows where nothing is wrong is how it stops working. The commonest case now
  // has its own value: `direct`, our own webhook's observation of the day the
  // message reached us, which is the one date here nobody has to vouch for.
  const isForward = FORWARD_MARKER.test(raw);
  const forwarded = detectForwardedDate(raw);
  let receivedDate = arrivedAt.slice(0, 10);
  let receivedDateSource: 'parsed' | 'forward' | 'direct' = 'direct';
  if (forwarded) {
    receivedDate = forwarded.date;
    receivedDateSource = 'parsed';
  } else if (isForward) {
    // It IS a forward and we could not read its date — a different, louder fact
    // than an ordinary submission arriving today. This is the only path that
    // reaches `forward`, which is what the value was always meant to mean.
    receivedDateSource = 'forward';
    warnings.push('date-unparsed');
  }

  // WHOSE DOOR THIS ROW MAY CLAIM. See ARRIVAL_EMAIL. A forward is a carry: the
  // piece reached the journal by some door we did not see, and the honest record
  // of that is a blank field and a flag, not a confident wrong answer.
  let arrival: string | null = ARRIVAL_EMAIL;
  if (isForward) {
    arrival = null;
    warnings.push(ARRIVAL_UNESTABLISHED);
  }

  // (9) Screen the submitter-controlled strings — and WARN rather than refuse,
  // which is where this door parts company with agent-submit. There, a screen
  // hit refuses the request, because an agent can be told to try again. Here
  // the sender is gone and the piece is in our hands: refusing would discard a
  // submission over a false positive on the word "ignore". The desk is told,
  // the row is written, and a human decides.
  for (const [value, multiline] of [
    [parsed.fields.title, false],
    [parsed.fields.author_name, false],
    [parsed.fields.author_model_version, false],
    [parsed.fields.pronouns, false],
    [parsed.fields.provenance_attestation, true],
    [parsed.fields.body, true],
  ] as Array<[string | undefined, boolean]>) {
    if (!value) continue;
    const hit = screenField(value, { multiline });
    if (hit) {
      warnings.push(`screen:${hit}`);
      break;
    }
  }

  const body = (parsed.fields.body ?? '').slice(0, MAX_BODY_CHARS);
  if ((parsed.fields.body ?? '').length > MAX_BODY_CHARS) warnings.push('truncated:body');

  // The declared address, else the envelope's, else the sentinel — and the
  // sentinel is announced. Same rule as the throttled stub above, and it belongs
  // on this path too: `contact_email` is NOT NULL and regex-checked, so a sender
  // whose address the column would refuse must not cost us the submission.
  const declaredContact = parsed.fields.contact_email?.trim();
  let contactEmail = CONTACT_SENTINEL;
  if (declaredContact && CONTACT_EMAIL_RE.test(declaredContact)) {
    contactEmail = declaredContact;
  } else if (CONTACT_EMAIL_RE.test(from.trim())) {
    contactEmail = from.trim();
    if (declaredContact) warnings.push('contact-email-unreadable; envelope from stored');
  } else {
    warnings.push(CONTACT_SENTINEL_WARNING);
  }

  // (10) ACCEPTED AS WRITTEN, STORED ONLY IF VALID, NEVER MAPPED BY GUESS.
  //
  // The desk does not assign tiers, so a parser that helpfully translated the
  // covering note's "A" into a machine code would be assigning one — and
  // validateTierCode refuses exactly that, because tier codes are lowercase.
  // A declared value that IS valid goes through; anything else is left null,
  // stays legible in the raw, and is flagged for an editor. The failure mode is
  // an editor typing a tier, never the journal inventing one.
  let tier: string | null = null;
  const declaredTier = parsed.fields.involvement_tier?.trim();
  if (declaredTier) {
    if (validateTierCode(declaredTier) === null) {
      tier = declaredTier;
    } else {
      warnings.push('tier-unrecognised');
    }
  } else {
    // Flagged on the same terms as an undeclared truth standard below. Silence
    // about a tier is a fact about the submission and the desk should see it;
    // until 20260810120000 §1c the database refused to store a human-attested
    // row without one, which is what turned every undeclared tier into a 500.
    warnings.push('missing:involvement_tier');
  }

  // Same rule, closed vocabulary, and NULL WHERE THE AUTHOR WAS SILENT.
  //
  // An earlier draft defaulted an undeclared standard to 'reported' on the
  // grounds that it claims the least. The editors ruled that out on 2026-08-10
  // and were right to: least-claiming is still claiming, and a value the author
  // never wrote does not become the journal's to supply by being modest. The
  // column was made nullable in the same migration so this could be honest.
  let truthStandard: string | null = null;
  const declaredTruth = parsed.fields.truth_standard?.trim().toLowerCase();
  if (declaredTruth) {
    if (TRUTH_STANDARDS.includes(declaredTruth)) {
      truthStandard = declaredTruth;
    } else {
      warnings.push('truth-standard-unrecognised');
    }
  } else {
    warnings.push('missing:truth_standard');
  }

  const { error } = await insertRow(supabase, {
    title: parsed.fields.title ?? subject ?? '(no title parsed)',
    author_name: parsed.fields.author_name ?? '(no byline parsed)',
    body,
    author_model_version: parsed.fields.author_model_version ?? null,
    provenance_attestation: parsed.fields.provenance_attestation ?? '',
    contact_email: contactEmail,
    pronouns: parsed.fields.pronouns ?? null,
    suggested_section: parsed.fields.suggested_section ?? null,
    prompt_disclosure: parsed.fields.prompt_disclosure ?? null,
    involvement_tier: tier,
    truth_standard: truthStandard,
    raw_email: raw,
    arrival,
    parse_warning: warnings.length ? warnings.join(';') : null,
    attachment_note: attachmentNote,
    arrived_at: arrivedAt,
    received_date: receivedDate,
    received_date_source: receivedDateSource,
  });

  if (error) {
    console.error(`email-inbound: insert failed: ${error}`);
    // 500 so Resend retries — the message is still on its side and a retry is
    // the cheapest recovery. This is the one failure worth retrying, because it
    // is ours and it is likely transient.
    return new Response('Storage failed', { status: 500 });
  }

  return new Response(null, { status: 200 });
}

async function insertRow(
  supabase: ReturnType<typeof serviceClient>,
  row: Record<string, unknown>
): Promise<{ error: string | null }> {
  const { error, status, statusText } = await supabase.from('submissions').insert({
    submission_track: 'human-attested',
    type: 'submission',
    status: 'new',
    ...row,
  });
  return { error: error ? describeDbError(error, status, statusText) : null };
}
