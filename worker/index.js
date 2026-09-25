/**
 * git4data.ai — playground API.
 *
 * Every visitor gets their own branch of the same demo table, created with
 * DATA BRANCH CREATE TABLE. A closed tutorial compiler scopes all visitor
 * operations to that session, including globally named snapshots.
 *
 * Only /api/* reaches this Worker (see run_worker_first in wrangler.jsonc);
 * every static file is served straight from the asset store, free and
 * unmetered, so a launch-day spike never turns into Worker invocations.
 *
 * Production credentials live in Hyperdrive. Direct Node.js connections use
 * secrets, never credentials committed to this repo:
 *   MO_HOST  MO_PORT  MO_USER  MO_PASSWORD   (wrangler secret put …)
 * They are kept as four separate values on purpose — a MatrixOne Cloud
 * username contains colons, which makes a mysql:// DSN ambiguous to parse.
 */

import mysql from 'mysql2/promise';
import { compileSql, idOk, dbFor, snapshotsFor } from './playground-sql.mjs';

const BASE_DB = 'g4d_demo';
const BASE_TABLE = 'customers';
const BASE_SNAPSHOT = 'g4d_base';

const SESSION_TTL_MS = 20 * 60 * 1000;  // idle time before a session expires
const QUERY_BUDGET = 80;                // statements per session
const QUERY_TIMEOUT_MS = 5000;
const MAX_ROWS = 200;
const SWEEP_PER_CALL = 5;               // bound the work one request can do

/* ── connection ──────────────────────────────────────────────── */
function missingConfig(env) {
  if (env.HYPERDRIVE) return [];
  return ['MO_HOST', 'MO_PORT', 'MO_USER', 'MO_PASSWORD'].filter((k) => !env[k]);
}

async function connect(env, database) {
  // Hyperdrive owns origin TLS and credentials. Its local socket is private to
  // this Worker, and all statements use explicit database names below.
  if (env.HYPERDRIVE) {
    const h = env.HYPERDRIVE;
    return mysql.createConnection({
      host: h.host, port: h.port, user: h.user, password: h.password,
      database: h.database, disableEval: true, multipleStatements: false,
      connectTimeout: 8000, decimalNumbers: false,
    });
  }
  const opts = {
    host: env.MO_HOST,
    port: Number(env.MO_PORT) || 6001,
    user: env.MO_USER,
    password: env.MO_PASSWORD,
    connectTimeout: 8000,
    multipleStatements: false,
    disableEval: true,
    // MatrixOne returns DECIMAL as a string; keep it that way so the UI
    // shows what the database actually stores rather than a lossy float.
    decimalNumbers: false,
  };
  if (database) opts.database = database;
  if (String(env.MO_TLS || '').toLowerCase() !== 'off') {
    opts.ssl = { rejectUnauthorized: true, verifyIdentity: true, ...(env.MO_CA_CERT ? { ca: env.MO_CA_CERT } : {}) };
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
async function cleanupSession(conn, id) {
  for (const name of Object.values(snapshotsFor(id)).reverse()) {
    await conn.query(`DROP SNAPSHOT IF EXISTS ${name}`);
  }
  await conn.query(`DROP DATABASE IF EXISTS ${dbFor(id)}`);
}

async function sweep(conn, limit = SWEEP_PER_CALL) {
  const cutoff = Date.now() - SESSION_TTL_MS;
  const [stale] = await conn.query(
    'SELECT id FROM g4d_demo._sessions WHERE last_seen < ? LIMIT ?', [cutoff, limit]
  );
  for (const row of stale) {
    if (!idOk(row.id)) continue;
    try {
      await cleanupSession(conn, row.id);
      await conn.query('DELETE FROM g4d_demo._sessions WHERE id = ?', [row.id]);
    } catch { /* retain bookkeeping so a later sweep can retry */ }
  }
  return stale.length;
}

async function createSession(env) {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const db = dbFor(id);
  const now = Date.now();

  return withConn(env, BASE_DB, async (conn) => {
    await sweep(conn);
    const [[active]] = await conn.query('SELECT COUNT(*) AS n FROM g4d_demo._sessions');
    if (Number(active.n) >= 30) throw new Error('The playground is busy. Please try again in a few minutes.');
    await conn.query(`CREATE DATABASE ${db}`);
    try {
      // The one statement this whole page exists to demonstrate.
      const t0 = Date.now();
      await conn.query(
        `DATA BRANCH CREATE TABLE ${db}.${BASE_TABLE} ` +
        `FROM ${BASE_DB}.${BASE_TABLE}{snapshot='${BASE_SNAPSHOT}'}`
      );
      const branchMs = Date.now() - t0;

      await conn.query(
        'INSERT INTO g4d_demo._sessions (id, created, last_seen, queries) VALUES (?, ?, ?, 0)',
        [id, now, now]
      );
      return { id, database: db, snapshots: snapshotsFor(id), branchMs, expiresIn: SESSION_TTL_MS, budget: QUERY_BUDGET };
    } catch (e) {
      await cleanupSession(conn, id).catch(() => {});
      throw e;
    }
  });
}

async function resetSession(env, id) {
  const db = dbFor(id);
  return withConn(env, BASE_DB, async (conn) => {
    const [rows] = await conn.query('SELECT last_seen FROM g4d_demo._sessions WHERE id = ?', [id]);
    if (!rows.length || Date.now() - Number(rows[0].last_seen) > SESSION_TTL_MS) return null;
    await cleanupSession(conn, id);
    await conn.query(`CREATE DATABASE ${db}`);
    const t0 = Date.now();
    await conn.query(
      `DATA BRANCH CREATE TABLE ${db}.${BASE_TABLE} ` +
      `FROM ${BASE_DB}.${BASE_TABLE}{snapshot='${BASE_SNAPSHOT}'}`
    );
    await conn.query('UPDATE g4d_demo._sessions SET last_seen = ?, queries = 0 WHERE id = ?', [Date.now(), id]);
    return { id, database: db, branchMs: Date.now() - t0 };
  });
}

async function runQuery(env, id, statement) {
  const db = dbFor(id);

  const gate = await withConn(env, BASE_DB, async (conn) => {
    const [rows] = await conn.query('SELECT last_seen, queries FROM g4d_demo._sessions WHERE id = ?', [id]);
    if (!rows.length) return { error: 'expired' };
    if (Date.now() - Number(rows[0].last_seen) > SESSION_TTL_MS) return { error: 'expired' };
    if (Number(rows[0].queries) >= QUERY_BUDGET) return { error: 'budget' };
    await conn.query('UPDATE g4d_demo._sessions SET last_seen = ?, queries = queries + 1 WHERE id = ?', [Date.now(), id]);
    return { queries: Number(rows[0].queries) + 1 };
  });
  if (gate.error) return gate;

  const conn = await connect(env, db);
  const t0 = Date.now();
  try {
    const [result, fields] = await timeout(
      conn.query(statement.sql, statement.values), QUERY_TIMEOUT_MS, () => { try { conn.destroy(); } catch { /* already down */ } }
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
      const out = { ok: true, stage: 'connected', version: v.version };
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
    return { ok: false, stage: 'connect', error: 'Database connection failed.' };
  }
}

/* ── routing ─────────────────────────────────────────────────── */
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

export default {
  async scheduled(event, env, ctx) {
    if (!missingConfig(env).length) {
      ctx.waitUntil(withConn(env, BASE_DB, (conn) => sweep(conn, 30)));
    }
  },
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
        let statement;
        try { statement = compileSql(body.sql, body.session); }
        catch (e) { return json({ error: 'rejected', message: e.message }, 400); }
        const out = await runQuery(env, body.session, statement);
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
