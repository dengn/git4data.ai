# SQL workflow: branch → diff → PICK → MERGE

This is an annotated template for a single-table, update-only workflow with explicit primary key `id`. It is not a script to paste against production. Replace the illustrative `catalog` database and run-specific names only after inspecting the actual schema. An authorized provisioner creates the workspace; a separate trusted merger promotes it.

The core syntax below was observed in the published `8.0.30-MatrixOne-v4.2.1` experiment. Verify support on a small disposable fixture before use on another version. There is no need to seed millions of rows.

## 1. Provision from a named baseline

```sql
SELECT version();
SHOW CREATE TABLE catalog.products;

-- Provisioner: snapshot syntax separates database and table with a space.
CREATE SNAPSHOT catalog_run42_base FOR TABLE catalog products;
DATA BRANCH CREATE TABLE catalog.agent_run42
  FROM catalog.products{snapshot='catalog_run42_base'};
DATA BRANCH CREATE TABLE catalog.approved_run42
  FROM catalog.products{snapshot='catalog_run42_base'};
```

`run42` is illustrative: choose a unique run identifier and record all object names. Do not overwrite an existing run. The provisioner verifies branch grants before the agent receives its restricted connection.

## 2. Change the task branch, then freeze it

Example authorized task: canonicalize two known brand spellings for a specified key range. Bind values and key boundaries in the actual client; identifiers must come from the trusted run manifest.

```sql
UPDATE catalog.agent_run42 SET brand = 'Acme'
WHERE id BETWEEN 1001 AND 1100 AND brand IN ('acme ', 'ACME');
```

Before review, stop task writers and revoke writes through the trusted provisioner. Use that frozen table for all following checks and PICK. If using a proposal snapshot instead, establish that version's snapshot-qualified PICK behavior first; do not silently review a snapshot and pick the live table.

## 3. Inspect complete scope and protected values

```sql
DATA BRANCH DIFF catalog.agent_run42
  AGAINST catalog.products{snapshot='catalog_run42_base'} OUTPUT SUMMARY;
DATA BRANCH DIFF catalog.agent_run42
  AGAINST catalog.products{snapshot='catalog_run42_base'} OUTPUT LIMIT 20;

-- Illustrative protected-field check; expand to EVERY protected column.
SELECT COUNT(*) AS protected_changes
FROM catalog.agent_run42 b
JOIN catalog.products{snapshot='catalog_run42_base'} m ON b.id = m.id
WHERE NOT (b.price <=> m.price);
```

For an update-only contract, require native DIFF inserted/deleted counts to be zero and verify schema/key stability. The join above cannot detect inserted/deleted keys; it is one check, not the validator. Also verify tenant/key scope, all protected fields, types, uniqueness, required values, factual support, row budgets and cross-row/table invariants. Compare with the named baseline even if the live target has moved. The presentation sample never substitutes for complete checks.

Record the exact unique keys that passed review in trusted, immutable evidence. If any field on a row is blocked, exclude the row. Do not let the proposal author populate or change the approved-key set after review.

## 4. Assemble and revalidate approved rows

```sql
-- Trusted reviewer only. These key literals stand for the reviewed key set.
DATA BRANCH PICK catalog.agent_run42 INTO catalog.approved_run42
  KEYS (1001, 1002) WHEN CONFLICT FAIL;

DATA BRANCH DIFF catalog.approved_run42
  AGAINST catalog.products{snapshot='catalog_run42_base'} OUTPUT SUMMARY;
```

PICK can take `KEYS (SELECT ...)` for larger approved sets; the query must reference trusted frozen evidence. It copies row changes, so an allowlist of fields in a report cannot remove a forbidden field from a picked row. Recheck the entire combined approval branch after all task PICKs. Two approved branches can violate a uniqueness or aggregate invariant when combined.

Do not include deletion propagation, inserts, composite keys or schema changes without a contract and a version-specific fixture that covers their semantics. The example's narrow scope does not establish those behaviors.

## 5. Promote once and reconcile

Immediately before promotion, the authorized merger checks the frozen proposal, approved keys, current target and business constraints. If the target moved, reassess. Row-conflict detection alone does not protect invariants spanning unrelated rows.

```sql
-- Separate merge executor; requires scoped approval for this exact proposal.
DATA BRANCH MERGE catalog.approved_run42 INTO catalog.products
  WHEN CONFLICT FAIL;
```

Record start/completion and the actual result. Affected-row counts alone may not express native MERGE changes; reconcile with native DIFF and SQL checks. If other production writers are active, use a serialized promotion window or a version-aware audit so unrelated writes are not attributed to this merge.

Do not automatically retry after a timeout, replace `FAIL` with `ACCEPT`, or merge the original task branch to “finish” a prior PICK. Inspect the destination and operation state. Keep the baseline and approval artifacts until the recovery/retention owner accepts cleanup.

## Sources

- [Measured run and method](https://git4data.ai/catalog-run)
- [MatrixOne DATA BRANCH PICK reference](https://docs.matrixorigin.cn/mo/en/v26.4.2.4/MatrixOne/Reference/SQL-Reference/Data-Definition-Language/data-branch-pick.html)
- [MatrixOrigin branch/diff/merge walkthrough](https://github.com/matrixorigin/matrixorigin-blog/blob/main/matrixorigin/git4data-part2-hands-on/index.md)
