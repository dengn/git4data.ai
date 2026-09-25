# Data change review report

Use actual measurements. Mark any unavailable check as unknown, not zero or passed. Distinguish simulation, proposed SQL, executed branch changes, authorized promotion and verified target changes.

## Identity and policy

- Run ID, task and owner; MatrixOne version; authoritative system and exact target.
- Baseline snapshot and schema/key identity; task branches and frozen source versions.
- Allowed fields/key or tenant scope; protected fields; insert/delete policy; changed-row limit.
- Factual source; validator/policy version; permission and resource boundaries actually established.

## Change summary

| Measurement | Actual result / evidence |
| --- | --- |
| Unique rows proposed | |
| Unique rows passed validation | |
| Unique rows needing review | |
| Unique rows blocked | |
| Inserts / updates / deletes | |
| Changes per field | Counts can overlap across rows |
| Protected-field changes | Per-field complete checks |
| Out-of-scope rows | |
| Schema and key changes | |
| Combined business invariants | |

Make passed, needs-review and blocked exclusive row categories. A row with both a good description and a forbidden price edit is blocked, not partly passed. Do not treat rows an agent declined to change as proposed-review rows.

Include a small redacted before/after sample and links to the locally retained full evidence. Explain held/blocked reasons and avoid publishing sensitive rows or credentials.

## Promotion record

- Exact approved keys/digest and immutable source identity; approval-branch identity.
- Approval authority, scope and reference; target state/version used for final validation.
- Conflict policy; concurrency/serialization arrangement; durable operation reference if available.
- State: prepared, awaiting approval, applying, completed, rejected, or outcome unknown.
- Actual merged rows and post-merge invariant checks, with timing and evidence.
- Remaining review items, external writeback status, recovery owner and retention decision.

If the system of record is external, separately report MatrixOne workspace merge and external publication. If the outcome is unknown, say which read-only reconciliation is needed before a retry. Never mark completed solely because a request was sent.
