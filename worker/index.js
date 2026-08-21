/**
 * git4data.ai — playground API.
 *
 * Every visitor gets their own branch of the same demo table, created with
 * DATA BRANCH CREATE TABLE. That is the whole isolation model: a branch costs
 * metadata rather than a copy, so thousands of sandboxes fit on one instance —
 * the playground's architecture is the product claim.
 *
 * Only /api/* reaches this Worker (see run_worker_first in wrangler.jsonc);
 * every static file is served straight from the asset store, free and
 * unmetered, so a launch-day spike never turns into Worker invocations.
 *
 * Credentials live in secrets, never in this repo:
 *   MO_HOST  MO_PORT  MO_USER  MO_PASSWORD   (wrangler secret put …)
 * They are kept as four separate values on purpose — a MatrixOne Cloud
 * username contains colons, which makes a mysql:// DSN ambiguous to parse.
 */

import mysql from 'mysql2/promise';

const BASE_DB = 'g4d_demo';
const BASE_TABLE = 'customers';
const BASE_SNAPSHOT = 'g4d_base';

const SESSION_TTL_MS = 20 * 60 * 1000;  // idle time before a branch is reclaimed
const QUERY_BUDGET = 80;                // statements per session
const QUERY_TIMEOUT_MS = 5000;
const MAX_SQL_LEN = 2000;
const MAX_ROWS = 200;
const SWEEP_PER_CALL = 5;               // bound the work one request can do

/* ── statement gate ──────────────────────────────────────────────
   Allow-list the leading verb, then deny anything that could reach
   outside the session's own database. Strict by design: a playground
   that occasionally refuses a legitimate query is fine, one that lets
   a visitor touch the account is not. */
const ALLOWED = [
  /^select\b/i, /^with\b/i, /^show\b/i, /^desc(ribe)?\b/i, /^explain\b/i,
  /^insert\b/i, /^update\b/i, /^delete\b/i, /^replace\b/i,
  /^create\s+snapshot\b/i, /^drop\s+snapshot\b/i,
  /^data\s+branch\b/i, /^restore\s+table\b/i,
  /^create\s+table\b/i, /^alter\s+table\b/i, /^truncate\b/i, /^drop\s+table\b/i,
];

const DENIED = [
  /\bcreate\s+database\b/i, /\bdrop\s+database\b/i, /\bcreate\s+schema\b/i,
  /\b(create|drop|alter)\s+(user|account|role)\b/i,
  /\bgrant\b/i, /\brevoke\b/i,
  /\bload\s+data\b/i, /\binto\s+(outfile|dumpfile)\b/i,
  /\bmo_catalog\b/i, /\bmysql\s*\.\s*user\b/i,
  /\bset\s+global\b/i, /\bshutdown\b/i, /\bkill\b/i,
  /\buse\s+/i,
];

function checkSql(raw) {
  if (typeof raw !== 'string') return 'No SQL supplied.';
  const sql = raw.trim().replace(/;+\s*$/, '');
  if (!sql) return 'No SQL supplied.';
  if (sql.length > MAX_SQL_LEN) return `Statement is longer than ${MAX_SQL_LEN} characters.`;
  if (sql.includes(';')) return 'One statement at a time in the playground.';
  if (!ALLOWED.some((re) => re.test(sql))) {
    return 'That statement is not available here. The playground runs queries, DML, and the Git4Data verbs — snapshot, branch, diff, merge, restore.';
  }
  const hit = DENIED.find((re) => re.test(sql));
  if (hit) return 'That statement reaches outside your branch, so the playground blocks it. Run MatrixOne locally to try it — the install command is on the home page.';
  return null;
}

/* ── connection ──────────────────────────────────────────────── */
function missingConfig(env) {
  return ['MO_HOST', 'MO_PORT', 'MO_USER', 'MO_PASSWORD'].filter((k) => !env[k]);
}

async function connect(env, database) {
  const opts = {
    host: env.MO_HOST,
    port: Number(env.MO_PORT) || 6001,
    user: env.MO_USER,
    password: env.MO_PASSWORD,
    connectTimeout: 8000,
    multipleStatements: false,
    // MatrixOne returns DECIMAL as a string; keep it that way so the UI
    // shows what the database actually stores rather than a lossy float.
    decimalNumbers: false,
  };
  if (database) opts.database = database;
  if (String(env.MO_TLS || '').toLowerCase() !== 'off') {
    opts.ssl = { rejectUnauthorized: String(env.MO_TLS || '').toLowerCase() === 'strict' };
  }
  return mysql.createConnection(opts);
}

async function withConn(env, database, fn) {
  const conn = await connect(env, database);
  try {
    return await fn(conn);
  } finally {
    try { await conn.end(); } catch { /* connection already gone */ }
  }
}

function timeout(promise, ms, onTimeout) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => { onTimeout?.(); reject(new Error(`Query exceeded ${ms / 1000}s and was cancelled.`)); }, ms);
    }),
  ]);
}

/* ── sessions ────────────────────────────────────────────────── */
const idOk = (id) => typeof id === 'string' && /^[a-f0-9]{16}$/.test(id);
const dbFor = (id) => `g4d_s_${id}`;

async function sweep(conn) {
  const cutoff = Date.now() - SESSION_TTL_MS;
  const [stale] = await conn.query(
    'SELECT id FROM _sessions WHERE last_seen < ? LIMIT ?', [cutoff, SWEEP_PER_CALL]
  );
  for (const row of stale) {
    if (!idOk(row.id)) continue;
    try { await conn.query(`DROP DATABASE IF EXISTS ${dbFor(row.id)}`); } catch { /* keep sweeping */ }
    try { await conn.query('DELETE FROM _sessions WHERE id = ?', [row.id]); } catch { /* ditto */ }
  }
  return stale.length;
}

async function createSession(env) {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const db = dbFor(id);
  const now = Date.now();

  return withConn(env, BASE_DB, async (conn) => {
    await sweep(conn);
    await conn.query(`CREATE DATABASE ${db}`);

    // The one statement this whole page exists to demonstrate.
    const t0 = Date.now();
    await conn.query(
      `DATA BRANCH CREATE TABLE ${db}.${BASE_TABLE} ` +
      `FROM ${BASE_DB}.${BASE_TABLE}{snapshot='${BASE_SNAPSHOT}'}`
    );
    const branchMs = Date.now() - t0;

    await conn.query(
      'INSERT INTO _sessions (id, created, last_seen, queries) VALUES (?, ?, ?, 0)',
      [id, now, now]
    );
    return { id, database: db, branchMs, expiresIn: SESSION_TTL_MS, budget: QUERY_BUDGET };
  });
}

async function resetSession(env, id) {
  const db = dbFor(id);
  return withConn(env, BASE_DB, async (conn) => {
    const [rows] = await conn.query('SELECT id FROM _sessions WHERE id = ?', [id]);
    if (!rows.length) return null;
    await conn.query(`DROP DATABASE IF EXISTS ${db}`);
    await conn.query(`CREATE DATABASE ${db}`);
    const t0 = Date.now();
    await conn.query(
      `DATA BRANCH CREATE TABLE ${db}.${BASE_TABLE} ` +
      `FROM ${BASE_DB}.${BASE_TABLE}{snapshot='${BASE_SNAPSHOT}'}`
    );
    await conn.query('UPDATE _sessions SET last_seen = ?, queries = 0 WHERE id = ?', [Date.now(), id]);
    return { id, database: db, branchMs: Date.now() - t0 };
  });
}

async function runQuery(env, id, sql) {
  const db = dbFor(id);

  const gate = await withConn(env, BASE_DB, async (conn) => {
    const [rows] = await conn.query('SELECT last_seen, queries FROM _sessions WHERE id = ?', [id]);
    if (!rows.length) return { error: 'expired' };
    if (Date.now() - Number(rows[0].last_seen) > SESSION_TTL_MS) return { error: 'expired' };
    if (Number(rows[0].queries) >= QUERY_BUDGET) return { error: 'budget' };
    await conn.query('UPDATE _sessions SET last_seen = ?, queries = queries + 1 WHERE id = ?', [Date.now(), id]);
    return { queries: Number(rows[0].queries) + 1 };
  });
  if (gate.error) return gate;

  const conn = await connect(env, db);
  const t0 = Date.now();
  try {
    const [result, fields] = await timeout(
      conn.query({ sql }), QUERY_TIMEOUT_MS, () => { try { conn.destroy(); } catch { /* already down */ } }
    );
    const ms = Date.now() - t0;

    if (Array.isArray(result)) {
      const columns = (fields || []).map((f) => f.name);
      const rows = result.slice(0, MAX_ROWS).map((r) => columns.map((c) => r[c]));
      return {
        kind: 'rows', columns, rows, ms,
        total: result.length,
        truncated: result.length > MAX_ROWS,
        queries: gate.queries,
      };
    }
    return {
      kind: 'ok', ms,
      affected: result?.affectedRows ?? 0,
      info: result?.info || '',
      queries: gate.queries,
    };
  } finally {
    try { await conn.end(); } catch { /* destroyed by the timeout */ }
  }
}

/* ── health ──────────────────────────────────────────────────── */
async function health(env) {
  const missing = missingConfig(env);
  if (missing.length) {
    return { ok: false, stage: 'config', missing, hint: 'Set them with: wrangler secret put <NAME>' };
  }
  try {
    return await withConn(env, null, async (conn) => {
      const [[v]] = await conn.query('SELECT version() AS version');
      const out = { ok: true, stage: 'connected', version: v.version, host: env.MO_HOST };
      try {
        const [[c]] = await conn.query(`SELECT COUNT(*) AS n FROM ${BASE_DB}.${BASE_TABLE}`);
        out.baseRows = Number(c.n);
      } catch (e) {
        out.ok = false; out.stage = 'seed';
        out.error = `${BASE_DB}.${BASE_TABLE} is not readable — run scripts/seed-playground.sql first. (${e.message})`;
        return out;
      }
      try {
        await conn.query(`SELECT COUNT(*) AS n FROM ${BASE_DB}.${BASE_TABLE}{snapshot='${BASE_SNAPSHOT}'}`);
        out.snapshot = BASE_SNAPSHOT;
      } catch (e) {
        out.ok = false; out.stage = 'snapshot';
        out.error = `Snapshot '${BASE_SNAPSHOT}' is missing — the tail of scripts/seed-playground.sql creates it. (${e.message})`;
      }
      return out;
    });
  } catch (e) {
    return { ok: false, stage: 'connect', error: e.message, host: env.MO_HOST, port: env.MO_PORT };
  }
}

/* ── routing ─────────────────────────────────────────────────── */
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    try {
      if (url.pathname === '/api/health') return json(await health(env));

      const missing = missingConfig(env);
      if (missing.length) {
        return json({ error: 'unconfigured', missing }, 503);
      }

      if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
      const body = await request.json().catch(() => ({}));

      if (url.pathname === '/api/session') {
        return json(await createSession(env));
      }

      if (url.pathname === '/api/reset') {
        if (!idOk(body.session)) return json({ error: 'expired' }, 400);
        const r = await resetSession(env, body.session);
        return r ? json(r) : json({ error: 'expired' }, 410);
      }

      if (url.pathname === '/api/query') {
        if (!idOk(body.session)) return json({ error: 'expired' }, 400);
        const bad = checkSql(body.sql);
        if (bad) return json({ error: 'rejected', message: bad }, 400);
        const out = await runQuery(env, body.session, body.sql.trim().replace(/;+\s*$/, ''));
        if (out.error === 'expired') return json({ error: 'expired' }, 410);
        if (out.error === 'budget') {
          return json({ error: 'budget', message: `That is ${QUERY_BUDGET} statements on this branch. Reset it to keep going, or run MatrixOne locally where nothing is capped.` }, 429);
        }
        return json(out);
      }

      return json({ error: 'No such endpoint.' }, 404);
    } catch (e) {
      // Surface the database's own message — on a playground that is the
      // most useful thing we can say, and there is nothing secret in it.
      return json({ error: 'db', message: e.message }, 500);
    }
  },
};
