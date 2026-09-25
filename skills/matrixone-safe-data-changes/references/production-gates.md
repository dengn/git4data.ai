# Production gates and tool boundaries

## Three execution identities

| Identity | Access needed | Boundary |
| --- | --- | --- |
| Provisioner | Read baseline; create snapshots and task branches | Runs outside the proposal agent's credential scope |
| Proposal agent | Read permitted data; update its assigned task branch | No direct or inherited access to mutate production, approval branches, roles or grants |
| Reviewer / merger | Read frozen proposals, assemble approved rows, promote to the exact target | Independent authorization and immutable audit evidence |

A separate role name is insufficient if the agent can select a more privileged role, read a merge password from an environment/file, or call an unrestricted admin SQL tool. Inventory effective roles, credentials, accessible tools and secret stores. Avoid assigning an admin role to a proposal user at all. Do not rely solely on `SET ROLE` or a prompt telling the agent not to use its other privileges.

MatrixOne provides table grants and role membership. Required privileges for snapshot/branch operations can vary by version and deployment. Have an administrator determine them and verify denial of target mutation, grants and branch escape on disposable objects. Provisioning may remain privileged without exposing those privileges to the proposal agent. Never grant `ALL ON *.*` as a compatibility workaround. The instruction package deliberately does not auto-create users or prescribe unverified privilege names for branch operations.

## What a safe execution service must enforce

A service is useful for unattended agents or multiple users. A local CLI, internal API or MCP server can expose the same constrained operations. The transport alone adds no enforcement.

- Create a workspace from an authorized baseline and return an opaque workspace ID. Bind ownership, table identities, allowed operations, field/row scope, expiration and resource limits server-side.
- Apply changes only within that workspace. Use a constrained operation schema and validated identifiers/parameterized values; arbitrary SQL plus string/regex filters is not an adequate production SQL boundary.
- Freeze writers and issue a proposal ID tied to immutable source versions, the full reviewed diff, approved-key set, target version and policy version.
- Have a trusted reviewer issue scoped approval. The proposal agent cannot mint an approval or supply `approved: true` to bypass it.
- Let a separate merge executor atomically acquire the promotion lease, check the proposal/target versions and approval, then promote. If target locking or version checks cannot cover the business invariant, pause target writers or stop promotion.
- Record a durable operation ID and state so an uncertain network result can be reconciled before retry. Do not promise multi-statement atomicity or idempotent MERGE unless verified and implemented.
- Rate-limit resource use, cap changed rows, expire abandoned workspaces, and retain enough evidence for recovery without logging secrets or sensitive datasets unnecessarily.

Example future tool surface (an interface sketch, not tools shipped in this package):

```text
create_workspace(target_id, task_scope)
apply_changes(workspace_id, bounded_changes)
freeze_and_review(workspace_id)
request_approval(proposal_id)
merge_approved(proposal_id, approval_reference)
get_operation(operation_id)
```

The raw production connection is accessible only to the provisioner/merger service. Approval references must be validated there. Wrapping unrestricted production SQL in MCP would preserve the same risks as an unrestricted SQL client.

## Self-hosted use without a custom service

An operator can provision restricted branch credentials, let a local agent use its existing MySQL client, and run reviewed promotion in a separate operator session. This is sufficient to start the workflow without building a new tool. Keep the operator's credentials outside the agent's process and accessible filesystem.

For a disposable tutorial, one operator may execute every stage. Report that limitation clearly. For a production deployment, the permission, review, source-freeze and availability boundaries must actually exist before claiming protection.

## Availability and recovery

Logical branches can share the same compute and storage as production. Limit concurrency and workload size; prefer a separate workspace instance for heavy jobs. In the published run, a 4.55M-row merge took approximately 14 minutes and the shared instance later returned a busy-node error. Those observations do not establish a guaranteed throughput, latency or cause for the later error.

Snapshots are retained evidence, not a complete backup/disaster-recovery design. Keep an operator-approved retention and recovery policy. A rollback must account for production changes made after the merge; never replace the current table wholesale from a stale snapshot as an automatic recovery action.

## Official references

- [MatrixOne GRANT](https://docs.matrixorigin.cn/mo/zh/latest/MatrixOne/Reference/SQL-Reference/Data-Control-Language/grant.html)
- [MatrixOne SET ROLE](https://docs.matrixorigin.cn/en/v25.3.0.4/MatrixOne/Reference/SQL-Reference/Other/Set/set-role/)

Read the documentation matching the installed version and verify effective behavior before trusting a permission boundary.
