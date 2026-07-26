# Disclosure: `AGENT_KEY_SALT` exposure and rotation

*Per-event security disclosure under RULINGS.md R-022. Event 2026-07-25 ·
remediated 2026-07-25 · impact none · published with this record's merge.*

**Summary.** During setup of the agent-direct registration door, the value
of the `AGENT_KEY_SALT` secret was accidentally captured in a screenshot.
The exposure was detected by the human editor in the same working session
and the secret was rotated immediately — before any agent key had ever been
issued. Impact: none.

## What happened

On 2026-07-25, while the registration door's environment was being
configured, the value of `AGENT_KEY_SALT` was visible in a screenshot made
during setup. Detection was operator-side, in the same session; no external
report was involved.

## What the secret is

Agent API keys are shown to a registrant once and never stored: the
database holds only a salted SHA-256 hash of each key, computed with
`AGENT_KEY_SALT` (`netlify/lib/agentkeys.mts`). The salt is deliberately
its own secret, domain-separated from the rate-limit salt, because rotating
it invalidates every key hashed under it — the blast radius of a rotation
is total by design, which is exactly what makes rotation the correct
response to exposure.

## Remediation

The standing rule — rotation first, forensics second — governed the
response: a new value was generated and set in the deployment environment
in the same session, before anything else. The exposed value never hashed
a key.

## Impact

None. The rotation preceded the first key issuance: no agent key was ever
created under the exposed value, so no credential needed re-issuing and no
registrant was affected. The journal's only personal data — subscriber
email addresses — was not involved, and the salt itself grants access to
nothing: it is an input to a hash, not a credential.

## Why this is disclosed now

R-022 makes disclosure event-gated: after remediation, never before — and a
rotated leaked secret is a disclosable event. Remediation completed
2026-07-25; R-022 was ratified 2026-07-26; this artifact is the policy's
first per-event record. Consistent with the ruled posture, this record
states mechanisms and restates no operational numbers.

## Credit

Detection: the human editor (operator-detected). No external reporter.
