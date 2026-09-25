# 10M catalog / 20 Codex tasks proof

Synthetic supplier catalog, real MatrixOne database operations. Twenty independent Codex tasks
write bounded repair plans (five issue classes × four 2.5M-row shards); the coordinator reviews
and executes those SQL plans with three concurrent connections. This is bulk SQL authored by
agents, not ten million LLM calls. Agent task instructions and returned plans are retained.

The coordinator deliberately injects 14 price changes into one branch after repair to demonstrate
policy rejection. Those changes must not be described as spontaneous agent mistakes. Business
validation and approval belong to this harness; native branch, diff, PICK and MERGE run in MO.

Run from the repository root with Node.js 22 and dependencies installed. Export `MO_HOST`, `MO_PORT`,
`MO_USER`, `MO_PASSWORD` and `MO_CA_FILE` through your secret manager or interactive shell. Never put
credentials in command arguments, committed files, or run artifacts.

To reproduce the committed run without overwriting its evidence, first choose a fresh output directory:

```sh
export CATALOG_OUTPUT=outputs/catalog-proof-rerun
mkdir -p "$CATALOG_OUTPUT/agents"
cp outputs/catalog-proof/agents/*.json "$CATALOG_OUTPUT/agents/"
```

This reuses the retained Codex plans. To measure a new AI planning run instead, generate new plans
following `AGENT_TASK.md`. The seed, execute and baseline-check scripts honor `CATALOG_OUTPUT`;
the publication/video scripts intentionally use the canonical completed evidence directory.

1. `node scripts/catalog-proof/seed.mjs`: creates a uniquely named experiment database and ten million rows.
   On a seed interruption it resumes from the existing count. Never points at the public demo tables.
2. Generate the 20 independent agent plans in `outputs/catalog-proof/agents/` following `AGENT_TASK.md`.
3. Review every plan, then `node scripts/catalog-proof/execute.mjs`. Plans are trusted experiment inputs;
   its sanity checks are not a public SQL security boundary. Never expose this script as a public API.
4. Inspect `run.json`, `events.jsonl`, and `execution.json`. Keep actual failures as evidence.

Execution creates 20 full logical branches of the 10M-row baseline plus an approval branch. Low-confidence
proposals are held for review; injected price violations are excluded. Accepted keys are copied with
`DATA BRANCH PICK ... KEYS (SELECT ...) WHEN CONFLICT FAIL`, then the approval branch is merged once.
Main stays unchanged until merge. Final checks must show 10M rows, no price changes, and no unreviewed
changes. Do not blindly replay a merge after an interruption; inspect its recorded state first.

The synthetic issue predicates are intentionally disjoint so independent task merges do not contend
on the same primary key. Conflict behavior is tested separately. This workload is not evidence that
all multi-agent workloads are conflict-free, nor is one free-tier run a general performance benchmark.

The database and snapshots are retained for follow-up filming/review. Remove only the exact snapshot
and database names in the run manifest when no longer needed. `outputs/` is excluded from website assets.
