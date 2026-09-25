# git4data.ai

The marketing site for **Git4Data** — a database-native workspace for proposed data changes from AI agents.
Agents can work on an isolated table branch; teams can inspect row-level diffs and merge with an explicit
conflict policy. Git4Data is implemented in [MatrixOne](https://github.com/matrixorigin/matrixone).

The homepage film replays a measured 10-million-row catalog run with 20 independent Codex tasks.
`catalog-run.html` and `data/catalog-run.json` document actual results, synthetic data, deliberately
injected price violations, and execution limits. The public Playground is a separate 124-row live
SQL tutorial with a branch per visitor.

Static frontend with a MySQL-backed Cloudflare Worker API. Deployment requires Node.js 22 or later.

```
index.html            landing page
playground.html       live SQL sandbox — one branch per visitor
benchmark.html        BranchBench results, jsonbench-style
worker/index.js       playground API and public skill download/statistics routes
scripts/seed-playground.sql   one-time dataset setup for the playground
data/branchbench.json every number shown on the benchmark page
assets/css/style.css  the whole design system
assets/js/dag.js      animated git-DAG canvas backdrop
assets/js/i18n.js     EN / 中文 overlay (English lives in the HTML)
assets/js/bench.js    renders the benchmark tables from the JSON
assets/js/main.js     nav, reveal-on-scroll, copy buttons, step switcher
assets/img/og.png     social card (regenerate: see below)
404.html              themed not-found page
wrangler.jsonc        Cloudflare Workers static-assets config
.assetsignore         files that stay out of the deployed bundle
_headers              CSP + cache policy
```

## Local development

No build step. Serve the folder over HTTP — `benchmark.html` fetches `data/branchbench.json`,
so `file://` will not work.

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

## Deploying to Cloudflare

The repo is configured for **Cloudflare Workers static assets**, which is the flow the dashboard
offers today (*Workers & Pages → Create → Import a repository*).

| Field | Value |
| --- | --- |
| Project name | `git4data-ai` |
| Build command | *(leave empty)* |
| Deploy command | `npx wrangler deploy` |

`wrangler.jsonc` does the rest:

* `assets.directory: "./"` — the repo root is the site; no build step, no output directory.
* `html_handling: "auto-trailing-slash"` — `/benchmark` serves `benchmark.html`, which is what the
  canonical tags and `sitemap.xml` assume.
* `not_found_handling: "404-page"` — unknown paths render `404.html`.
* `.assetsignore` keeps `README.md`, `LICENSE`, `wrangler.jsonc`, `package.json` and `scripts/` out
  of the deployed bundle.
* `_headers` sets the CSP and cache policy — Workers static assets honours it, same as Pages.

Deploy from your laptop instead:

```bash
npx wrangler deploy
```

### Pointing git4data.ai at it

Nothing to click — `wrangler.jsonc` declares the custom domain:

```jsonc
"routes": [{ "pattern": "git4data.ai", "custom_domain": true }]
```

Every deploy binds both hostnames and creates their DNS records. Without this the Worker deploys
fine but `git4data.ai` has no DNS record at all and the site is unreachable, which is easy to
mistake for a build failure.

`www` serves the same assets rather than redirecting. The canonical tags point to the apex.
For a true redirect, configure a Cloudflare Redirect Rule in the dashboard.

### If you use Cloudflare Pages instead

Pages can serve the static frontend (framework **None**, build output `/`), but the live playground
requires the Worker API and its secrets. Use the Workers configuration above for the complete site.

## The playground

`playground.html` is a live SQL console. Each visitor gets their own branch of one demo table:

```sql
DATA BRANCH CREATE TABLE g4d_s_<id>.customers
  FROM g4d_demo.customers{snapshot='g4d_base'};
```

The public console accepts a bounded tutorial dialect compiled by `worker/playground-sql.mjs`.
Visitor SQL is never forwarded directly: the server constructs each supported statement with a
session-scoped database and snapshot names, and parameterizes country values. Supported operations
are the eight guided steps, `SELECT *`, `SELECT COUNT(*)`, and `DESCRIBE` on the two demo tables.
Other SQL, including access to other sessions or the seed, is rejected.

Sessions expire after 20 minutes idle. New sessions reclaim up to five expired sessions; a scheduled
job runs every ten minutes to reclaim up to 30, including their snapshots. Admission pauses when
30 session records already exist (this is a load guard, not an atomic concurrency limit).
Queries have a five-second timeout, a 200-row result cap, and an 80-statement session budget.

Only `/api/*` reaches the Worker (`run_worker_first` in `wrangler.jsonc`); every other path is served
straight from the asset store, so page views never become Worker invocations.

### Pointing it at a database

**1 — seed the instance, once.** This creates `g4d_demo.customers`, the `_sessions` bookkeeping table,
and the `g4d_base` snapshot every visitor branches from. The seed script replaces the sample table;
run it only for initial setup on a dedicated demo instance:

```bash
mysql -h <host> -P 6001 -u <user> -p < scripts/seed-playground.sql
```

**2 — configure the production Hyperdrive binding.** The deployed Worker uses `HYPERDRIVE` for
its database connection; origin credentials are stored in Cloudflare, never in this repository.
Disable Hyperdrive query caching so snapshots, session bookkeeping and reads after writes are current.
Use `g4d_demo` as the origin database. The Worker uses fully qualified names because Hyperdrive does
not support changing the connection database with `USE`.

The current demo connection uses Hyperdrive's `REQUIRED` TLS mode. The instance presents a
self-signed server certificate with `CA:FALSE`, which Cloudflare rejects as an uploaded CA.
This configuration provides encryption but does not provide the explicit certificate/hostname
verification of `VERIFY_IDENTITY`. For that mode, obtain a compatible CA-signed certificate chain
from the instance operator, upload its CA, and update the Hyperdrive TLS configuration.

For a different Cloudflare account, create your own Hyperdrive and replace its ID in `wrangler.jsonc`.
Direct MySQL TLS from Workers is not supported by this driver/runtime combination; use Hyperdrive.

For a Node.js backend or direct local development, the API also supports `MO_HOST`, `MO_PORT`,
`MO_USER`, and `MO_PASSWORD`, plus `MO_CA_CERT` for a trusted PEM certificate. This path verifies
certificates and hostnames by default; `MO_TLS=off` is only for local plain connections. Production
prefers the Hyperdrive binding when both configurations are present.

**3 — check it.** `/api/health` reports exactly which step is failing:

```bash
curl https://git4data.ai/api/health
```

`stage: "config"` means a secret is missing, `"connect"` means the host is unreachable, `"seed"` means
the dataset is not there, and `"snapshot"` means the seed ran but the snapshot did not.

### Database permissions

Use a dedicated demo instance/account with no business data. The service needs to create and drop
session databases and snapshots, branch from the seed snapshot, and run diff/merge. Snapshot
permissions depend on the MatrixOne release and may require an administrative role. Keep that
credential server-side in Cloudflare secrets; the public compiler is the application access boundary.
Do not expose arbitrary SQL through the provisioning connection.

### Local development

`wrangler dev` serves the site and the API together on port 3000. Without the secrets set, the
playground renders its offline state — a notice with the Docker command instead of an error — which
is also what visitors see if the instance goes down.

```bash
npm ci
npm run dev
```

For local Hyperdrive, set its `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`
environment variable as described in Cloudflare documentation. To use direct `MO_*` values in an
ignored `.dev.vars`, remove the Hyperdrive binding from a separate local Wrangler configuration. Run `npm test` for the tutorial compiler
checks, including cross-session access rejection.

## Editing the benchmark data

`data/branchbench.json` is the single source of truth for the results page. One **suite** corresponds
to one table in one paper:

```jsonc
{
  "id": "macro",
  "unit": "s",
  "lowerIsBetter": true,
  "source": "CIDR '27 Git4Data, Table 4",
  "modes": [{ "id": "cold", "name": "Cold run" }, { "id": "warm", "name": "Warm run" }],
  "cols": [{ "id": "git4data", "name": "Git4Data", "self": true }, { "id": "dolt", "name": "DoltDB" }],
  "rows": [{
    "id": "software_dev",
    "values": { "warm": { "git4data": 122.1, "dolt": 1925.6 } }
  }]
}
```

* Suites without `modes` put their values under the key `"_"`.
* A value may be a number, or `{ "v": 0.314, "label": "314 KB" }` when the printed unit differs.
* A missing value renders as `—`, never as zero.
* `self: true` marks the column that gets the accent colour.

### Where the numbers come from

| Source | Used for |
| --- | --- |
| *Git4Data: Database-Native Version Control for AI Agents* (CIDR '27) — MatrixOrigin & Purdue | Tables 1–5: clone, diff, merge, BranchBench macro runtimes, scaling |
| *BranchBench: An Extensible Benchmark for Agentic Database Branching* ([arXiv:2604.17180](https://arxiv.org/abs/2604.17180)) | Benchmark definition, third-party capability matrix |

Every value is transcribed from a printed table. Where a paper only plots a figure, the metric is
left out rather than estimated from the chart.

## Regenerating the social card

```bash
python3 scripts/make-og.py
```

Requires Pillow. Writes `assets/img/og.png` at 1200×630.

## Translations

English copy lives directly in the HTML. `assets/js/i18n.js` holds the Chinese overlay, keyed by the
`data-i18n` attribute on each element. To add a string: put the English in the markup with a
`data-i18n="some.key"`, then add `'some.key': '中文'` to the `ZH` object.

## Licence

Site code MIT (see `LICENSE`). MatrixOne itself is Apache 2.0.

## Cache busting

`_headers` marks `/assets/*` as immutable for a year, so every asset URL carries a `?v=N` query.
When you change a file under `assets/`, bump `N` in **every** HTML file (`index.html`,
`playground.html`, `benchmark.html`, `404.html`) and in the `fetch()` call inside
`assets/js/bench.js` when the dataset changes — otherwise returning visitors keep the old copy.
Bump it *after* you finish editing, not before: republishing different content under a version
number a browser has already cached is the same as not bumping at all.

## Catalog film

See `scripts/catalog-proof/README.md` for the measured experiment and `outputs/catalog-proof/` for
its retained task plans, query log and results. After a successful run, `publish-results.py` creates
the public evidence and `render-video.py` renders the captioned 60-second replay. The renderer uses
Pillow, FFmpeg and macOS system fonts. The film contains no audio and starts only on user action.

## Downloadable Agent Skill and impact measurement

`/agent-skill` provides the bilingual installation guide for `skills/matrixone-safe-data-changes/`.
The versioned ZIP is hosted as a **GitHub Release asset** so its download count survives Worker
redeployments. `/api/skill/download` redirects to the fixed release asset; `/api/skill/stats` reads
that asset's public `download_count`, cached for 15 minutes at each edge location. These endpoints
run before any database configuration checks and do not depend on MatrixOne availability. No new
Cloudflare storage, analytics subscription, or OAuth scope is required. API rate limits/outages
reuse a timestamped last-good observation for up to 24 hours when available, or render an unavailable
count; neither path invents a zero. GitHub can rate-limit shared Cloudflare egress IPs. Downloads
continue via the release link. The apex and www hostnames share the same per-release cache key. The browser falls back to
GitHub's public release API without cookies or a referrer if that cache is unavailable; this
third-party metadata request is disclosed on the download page and allowed by CSP.

The current-version count includes repeated requests, bots and our verification downloads. It does
not deduplicate people or prove installation or use. Source clones, mirrors and copied instructions
are not counted. The installed package contains no telemetry. GitHub handles asset downloads under
its own policies; we do not collect identity, database credentials, SQL or runtime events for metrics.

### Publish a version

1. Update `metadata.version` in the skill and the version/tag/asset in `data/agent-skill.json`.
2. Run `python3 scripts/package-agent-skill.py`; it writes a deterministic ZIP and `SHA256SUMS` to
   `outputs/skill-release/`, and the hash/size to the public manifest. Update the download page's version,
   release/source links, size, checksum, and translations from that manifest when releasing a new version.
3. Commit the source and manifest, push, and create a release at that exact commit with both artifacts:
   `gh release create skill-v0.1.0 outputs/skill-release/* --target <commit> --title "MatrixOne Agent Skill v0.1.0" --notes-file <notes-file>`.
   Substitute the new version for future releases. Upload before deploying website links. Never replace
   an existing version's ZIP: create a new version to preserve integrity and historical counts.
4. Deploy the website. Read-only verification downloads count as downloads; report them as such.

### Measure influence without tracking installations

Run `node scripts/skill-metrics.mjs` to obtain current and historical release-asset download counts,
plus repository stars/forks. It reads only public GitHub metadata; optional `GH_TOKEN` raises API limits.
Save periodic JSON snapshots outside the deployed assets to calculate weekly changes. This is an
on-demand command; no background scheduler is installed.

Keep these signals separate:

| Stage | Signal | Interpretation |
| --- | --- | --- |
| Awareness | Website analytics, if configured separately | Visits, not adoption; this change adds no browser analytics beacon |
| Distribution | Release ZIP downloads by version | Requests, not unique users or installations |
| Interest | Repository stars/forks | Covers the whole site repository, not only this skill |
| Activation | Voluntary GitHub experience reports | Self-reported successful branch → review → merge |
| Adoption | Consented case studies / repeat reports | Qualitative evidence of sustained use |

The website invites voluntary public GitHub reports without asking for confidential data. Do not
call downloads MAU, paid conversion, or production adoption. Add opt-in aggregate usage events only
if users explicitly choose them in a future executable tool; a documentation skill should stay offline.

### Tool roadmap

This release ships instructions, SQL guidance, permission/approval design and a review-report template.
An operator can use an existing MySQL client and separate branch/merge credentials. A custom CLI/API/MCP
becomes useful for unattended or multi-user execution: it must enforce workspace scope, immutable
proposals, policy, approvals, target-version checks, resource limits and durable operation state. MCP
is an interface option, not an access-control guarantee. Self-hosting supports either approach.
