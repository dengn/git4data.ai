# git4data.ai

The marketing site for **Git4Data** — database-native version control for AI agents, implemented in
[MatrixOne](https://github.com/matrixorigin/matrixone).

Static, dependency-free, deployed on Cloudflare.

```
index.html            landing page
playground.html       live SQL sandbox — one branch per visitor
benchmark.html        BranchBench results, jsonbench-style
worker/index.js       playground API (the only thing that runs server-side)
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

`www` serves the same assets rather than redirecting. A real 301 would need a Worker script, and
adding `main` forces `run_worker_first` so that every asset request becomes a billable Worker
invocation (100k/day on the free plan) — where an assets-only Worker serves static files free and
unlimited, which is what a launch-day spike needs. The canonical tags already point search engines
at the apex. If you want a true redirect, add a Cloudflare **Redirect Rule** in the dashboard: it
runs ahead of Workers and costs no invocations.

### If you use Cloudflare Pages instead

Pages also works with no changes — framework preset **None**, empty build command, build output
directory `/`. In that case `wrangler.jsonc` and `package.json` are simply ignored.

## The playground

`playground.html` is a live SQL console. Each visitor gets their own branch of one demo table:

```sql
DATA BRANCH CREATE TABLE g4d_s_<id>.customers
  FROM g4d_demo.customers{snapshot='g4d_base'};
```

That is the entire isolation model — a branch costs metadata rather than a copy, so thousands of
sandboxes fit on one instance. Sessions are reclaimed after 20 minutes idle.

Only `/api/*` reaches the Worker (`run_worker_first` in `wrangler.jsonc`); every other path is served
straight from the asset store, so page views never become Worker invocations.

### Pointing it at a database

**1 — seed the instance, once.** This creates `g4d_demo.customers`, the `_sessions` bookkeeping table,
and the `g4d_base` snapshot every visitor branches from:

```bash
mysql -h <host> -P 6001 -u <user> -p<password> < scripts/seed-playground.sql
```

**2 — give the Worker its credentials.** Four separate secrets, not a DSN: a MatrixOne Cloud username
contains colons, which makes a `mysql://` URL ambiguous to parse.

```bash
npx wrangler secret put MO_HOST
npx wrangler secret put MO_PORT
npx wrangler secret put MO_USER
npx wrangler secret put MO_PASSWORD
```

Each command prompts for the value and stores it encrypted on Cloudflare. Nothing is written to this
repo — the repo is public, and a connection string committed here would be scraped within minutes.

Optional: `MO_TLS=off` for a plain connection (local MatrixOne), `MO_TLS=strict` to verify the
server certificate. The default attempts TLS without certificate verification.

**3 — check it.** `/api/health` reports exactly which step is failing:

```bash
curl https://git4data.ai/api/health
```

`stage: "config"` means a secret is missing, `"connect"` means the host is unreachable, `"seed"` means
the dataset is not there, and `"snapshot"` means the seed ran but the snapshot did not.

### Use a least-privilege account

The playground should not connect as `accountadmin`. Give it an account that can read `g4d_demo`,
create and drop its own `g4d_s_*` databases, and nothing else. Even with the statement filter in
`worker/index.js`, the database account is the boundary that actually matters.

### Local development

`wrangler dev` serves the site and the API together on port 3000. Without the secrets set, the
playground renders its offline state — a notice with the Docker command instead of an error — which
is also what visitors see if the instance goes down.

```bash
npm run dev
```

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
