import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileSql, dbFor, snapshotsFor } from '../worker/playground-sql.mjs';

const id = '0123456789abcdef';
const other = 'fedcba9876543210';
const database = dbFor(id);
const names = { database, ...snapshotsFor(id) };

test('every SQL step shown by the frontend compiles for its own session', () => {
  const source = readFileSync(new URL('../assets/js/playground.js', import.meta.url), 'utf8');
  const steps = [...source.matchAll(/sql: ("(?:[^"\\]|\\.)*")/g)].map((m) => JSON.parse(m[1]));
  assert.equal(steps.length, 8);
  for (const template of steps) {
    const query = template.replace(/\{\{(\w+)\}\}/g, (_, name) => names[name]);
    const compiled = compileSql(query, id);
    assert.ok(compiled.sql.includes(database), compiled.sql);
    assert.ok(!compiled.sql.includes('{{'));
  }
});

test('snapshots use the native database-space-table syntax and unique session names', () => {
  const first = compileSql('CREATE SNAPSHOT before_fix FOR TABLE customers;', id).sql;
  const second = compileSql('CREATE SNAPSHOT before_fix FOR TABLE customers;', other).sql;
  assert.match(first, new RegExp(`FOR TABLE ${database} customers$`));
  assert.notEqual(first, second);
  assert.throws(() => compileSql(`CREATE SNAPSHOT ${snapshotsFor(other).before_fix} FOR TABLE ${dbFor(other)} customers`, id));
});

test('public SQL cannot reach metadata, other databases, external files, or arbitrary functions', () => {
  const blocked = [
    'SELECT * FROM g4d_demo._sessions',
    'SELECT * FROM g4d_demo.customers',
    `SELECT * FROM ${dbFor(other)}.customers`,
    'SELECT * FROM mo_catalog.mo_user',
    'SHOW DATABASES', 'SHOW SNAPSHOTS',
    'SELECT SLEEP(60)', 'SELECT LOAD_FILE(\'/etc/passwd\')',
    'SELECT * FROM customers INTO OUTFILE \'/tmp/leak\'',
    'SELECT * FROM customers UNION SELECT * FROM g4d_demo._sessions',
    'SELECT * FROM customers; DROP DATABASE g4d_demo;',
    'SELECT/**/ * FROM g4d_demo._sessions',
    'SELECT * FROM `g4d_demo`.`customers`',
    'WITH x AS (SELECT * FROM g4d_demo._sessions) SELECT * FROM x',
    'CREATE SNAPSHOT theft FOR ACCOUNT',
    'DROP SNAPSHOT g4d_base',
    'DROP TABLE customers', 'TRUNCATE customers',
    'DATA BRANCH CREATE TABLE customers_fix FROM g4d_demo.customers',
    'DATA BRANCH MERGE customers_fix INTO g4d_demo.customers WHEN CONFLICT ACCEPT',
    `DATA BRANCH DIFF customers_fix{snapshot='after_fix'} AGAINST customers{snapshot='before_fix'} OUTPUT FILE '/tmp'`,
    "UPDATE customers SET country='FR' WHERE country IN ('fr')",
    "UPDATE customers_fix SET country='FR' WHERE country IN ('fr') OR 1=1",
    "UPDATE customers_fix SET country='FR' WHERE country IN ('fr'); DELETE FROM customers",
    "UPDATE customers_fix SET country='FR' WHERE country IN ('fr\\') OR 1=1 --')",
  ];
  for (const query of blocked) assert.throws(() => compileSql(query, id), undefined, query);
});

test('country edits use parameters and read results are bounded before retrieval', () => {
  const query = compileSql("UPDATE customers_fix SET country='GB' WHERE country IN ('uk','United Kingdom');", id);
  assert.deepEqual(query.values, ['GB', 'uk', 'United Kingdom']);
  assert.equal(query.sql, `UPDATE ${database}.customers_fix SET country = ? WHERE country IN (?,?)`);
  assert.equal(compileSql('SELECT * FROM customers LIMIT 999;', id).sql, `SELECT * FROM ${database}.customers LIMIT 200`);
  assert.equal(compileSql('SELECT * FROM customers', id).sql, `SELECT * FROM ${database}.customers LIMIT 200`);
});

test('malformed inputs and invalid session identifiers fail closed', () => {
  for (const query of [null, {}, '', ' '.repeat(2001)]) assert.throws(() => compileSql(query, id));
  for (const session of ['', null, '../main', '0123456789abcdef;DROP']) assert.throws(() => compileSql('SELECT * FROM customers', session));
});
