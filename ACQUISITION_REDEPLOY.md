# Restore acquisition tracking — redeploy checklist (Nan)

## Root cause (verified 2026-10-19)

Production is **deploy drift**, not a code regression on `main` and not a Durable Object rename.

Evidence:

| Check | Result |
| --- | --- |
| `main` `worker/analytics.mjs` `report()` | Still returns `acquisitionEnabledAt` + `rowsV2` |
| DO name in code | Still `site-v1` (`getByName('site-v1')`) |
| Snapshot 2026-10-12 | Had `acquisitionEnabledAt` + `rowsV2` (20 rows); `startedAt` = `2026-09-26T10:06:12.427Z` |
| Snapshot 2026-10-15+ | Same `startedAt`, but **omits** both acquisition fields → Worker script rolled back |
| Live `https://git4data.ai/assets/js/analytics.js` | Byte-identical to pre-acquisition commit `bc6007d` (PR #4), no UTM capture |
| Live `/privacy` | Missing acquisition disclosure from PR #5/#6 |

Same Durable Object is still live (`startedAt` unchanged). Redeploying current `main` reattaches the v2 Worker class to `site-v1` and **does not wipe** `totals` / `totals_v2`.

`wrangler.jsonc`: Worker `git4data-ai`, DO binding `SITE_ANALYTICS` → class `SiteAnalytics`, migration tag `site-analytics-v1`. Deploy path is **Workers static assets** (`npx wrangler deploy`), not a separate Cloudflare Pages project.

## What this PR also fixes (on top of redeploy)

1. Client allowlists in `assets/js/analytics.js` were never updated by PR #6 — synced with `worker/acquisition-tracking.mjs` (`mo-blog`, Slack/Discord community sources, `profile` medium, etc.).
2. Campaign slugs used in promos (`agent-db-write`, `four-verbs`, `playground`, `evergreen`, …) already match the campaign pattern; covered by tests.
3. Server no longer rewrites client referrer buckets via `https://{bucket}.com` (which mapped `direct`/`search` → `other`).
4. Cache buster `analytics.js?v=1` → `?v=2` so browsers pick up the restored client after deploy.

## Deploy steps (requires Cloudflare auth — this agent cannot run them)

From a clean checkout of the merged PR (or `main` after merge):

```bash
cd /path/to/git4data.ai
git pull
npm ci
npx wrangler whoami          # must show the account that owns git4data.ai
npx wrangler deploy          # deploys Worker + static assets together
```

Secrets already on the Worker stay put. **Do not** run:

- `wrangler delete` / recreate the Worker
- DO migration renames / new class names
- anything that creates a new DO name other than `site-v1`
- SQL deletes against `totals` / `totals_v2`

If `wrangler deploy` asks about migrations: keep existing tag `site-analytics-v1`; do not add a migration that drops or recreates `SiteAnalytics`.

## Verify after deploy

```bash
# 1) Client is the acquisition build (not the 2.9KB pre-UTM file)
curl -sS 'https://git4data.ai/assets/js/analytics.js?v=2' | head -c 200
# Expect: mentions extractAcquisition / ALLOWED_SOURCES / utm_source

# 2) Report includes acquisition fields again
curl -sS 'https://git4data.ai/api/analytics/report?days=7' \
  -H "Authorization: Bearer $ANALYTICS_READ_TOKEN" | jq '{
    startedAt,
    acquisitionEnabledAt,
    rowsV2_len: (.rowsV2|length),
    has_rowsV2: (.rowsV2!=null),
    keys: keys
  }'
```

Success criteria:

- JSON includes **`acquisitionEnabledAt`** (should remain `2026-10-01T12:44:38.833Z` if the same DO metadata row survived; if missing in metadata, Worker inserts on next cold start — empty `rowsV2` is OK).
- JSON includes **`rowsV2`** (array; may be empty for recent days until traffic arrives with the new client).
- `startedAt` still `2026-09-26T10:06:12.427Z` → confirms DO was not wiped.

Optional smoke: open  
`https://git4data.ai/?utm_source=x&utm_medium=social&utm_campaign=agent-db-write`  
then re-fetch the report and look for a `rowsV2` row with those dimensions (respect DNT/GPC).

## If fields are still missing after deploy

1. Confirm deploy targeted Worker name `git4data-ai` in the correct Cloudflare account.
2. Confirm custom domains `git4data.ai` / `www.git4data.ai` still bind to that Worker (see `wrangler.jsonc` `routes`).
3. Confirm you did not accidentally point DNS at a stale Pages project.
4. Re-check live `analytics.js?v=2` content; CDN/browser cache should miss with the new query string.
