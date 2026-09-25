// The public playground accepts a small, bounded tutorial dialect. Never
// forward visitor SQL to the provisioning connection, even after a deny-list.
export const idOk = (id) => typeof id === 'string' && /^[a-f0-9]{16}$/.test(id);
export function dbFor(id) {
  if (!idOk(id)) throw new Error('Invalid session.');
  return `g4d_s_${id}`;
}
export const snapshotsFor = (id) => ({
  before_fix: `${dbFor(id)}_before_fix`,
  after_fix: `${dbFor(id)}_after_fix`,
});

export function compileSql(raw, id) {
  const db = dbFor(id);
  const snapshots = snapshotsFor(id);
  const reject = () => { throw new Error('Use the guided statements, SELECT * or DESCRIBE on customers/customers_fix, or a country update from the tutorial. Other SQL is not available in this public playground.'); };
  if (typeof raw !== 'string' || !raw.trim() || raw.length > 2000) return reject();
  const sql = raw.trim().replace(/;\s*$/, '').replace(/\s+/g, ' ');
  if (sql.includes(';') || /--|\/\*|\*\/|#/.test(sql)) return reject();
  const table = (name) => {
    name = name.toLowerCase();
    if (name.startsWith(db + '.')) name = name.slice(db.length + 1);
    return ['customers', 'customers_fix'].includes(name) ? name : null;
  };
  const snapshot = (name, alias) => name === alias || name === snapshots[alias];
  let m;
  if ((m = /^SELECT country, COUNT\(\*\) AS rows_with_it FROM ([\w.]+) GROUP BY country ORDER BY rows_with_it DESC$/i.exec(sql)) && table(m[1])) {
    return { sql: `SELECT country, COUNT(*) AS rows_with_it FROM ${db}.${table(m[1])} GROUP BY country ORDER BY rows_with_it DESC LIMIT 200`, values: [] };
  }
  if ((m = /^SELECT \* FROM ([\w.]+)(?: LIMIT (\d{1,3}))?$/i.exec(sql)) && table(m[1])) {
    return { sql: `SELECT * FROM ${db}.${table(m[1])} LIMIT ${Math.min(Number(m[2] || 200), 200)}`, values: [] };
  }
  if ((m = /^SELECT COUNT\(\*\)(?: AS total)? FROM ([\w.]+)$/i.exec(sql)) && table(m[1])) {
    return { sql: `SELECT COUNT(*) AS total FROM ${db}.${table(m[1])}`, values: [] };
  }
  if ((m = /^DESC(?:RIBE)? ([\w.]+)$/i.exec(sql)) && table(m[1])) {
    return { sql: `DESCRIBE ${db}.${table(m[1])}`, values: [] };
  }
  if ((m = /^CREATE SNAPSHOT (\w+) FOR TABLE (?:(\w+) )?(\w+)$/i.exec(sql))) {
    const alias = m[3].toLowerCase() === 'customers' ? 'before_fix' : 'after_fix';
    if ((!m[2] || m[2].toLowerCase() === db) && table(m[3]) && snapshot(m[1], alias)) {
      return { sql: `CREATE SNAPSHOT ${snapshots[alias]} FOR TABLE ${db} ${table(m[3])}`, values: [] };
    }
  }
  if ((m = /^DATA BRANCH CREATE TABLE ([\w.]+) FROM ([\w.]+)\{\s*snapshot\s*=\s*'(\w+)'\s*\}$/i.exec(sql)) && table(m[1]) === 'customers_fix' && table(m[2]) === 'customers' && snapshot(m[3], 'before_fix')) {
    return { sql: `DATA BRANCH CREATE TABLE ${db}.customers_fix FROM ${db}.customers{snapshot='${snapshots.before_fix}'}`, values: [] };
  }
  if ((m = /^UPDATE ([\w.]+) SET country\s*=\s*'([A-Za-z ]{1,32})' WHERE country IN\s*\((.+)\)$/i.exec(sql)) && table(m[1]) === 'customers_fix' && /^'[A-Za-z ]{1,32}'(?:\s*,\s*'[A-Za-z ]{1,32}')*$/.test(m[3])) {
    const countries = [...m[3].matchAll(/'([^']+)'/g)].map((v) => v[1]);
    if (countries.length > 12) return reject();
    return { sql: `UPDATE ${db}.customers_fix SET country = ? WHERE country IN (${countries.map(() => '?').join(',')})`, values: [m[2], ...countries] };
  }
  if ((m = /^DATA BRANCH DIFF ([\w.]+)\{\s*snapshot\s*=\s*'(\w+)'\s*\} AGAINST ([\w.]+)\{\s*snapshot\s*=\s*'(\w+)'\s*\}$/i.exec(sql)) && table(m[1]) === 'customers_fix' && snapshot(m[2], 'after_fix') && table(m[3]) === 'customers' && snapshot(m[4], 'before_fix')) {
    return { sql: `DATA BRANCH DIFF ${db}.customers_fix{snapshot='${snapshots.after_fix}'} AGAINST ${db}.customers{snapshot='${snapshots.before_fix}'} OUTPUT LIMIT 200`, values: [] };
  }
  if ((m = /^DATA BRANCH MERGE ([\w.]+)\{\s*snapshot\s*=\s*'(\w+)'\s*\} INTO ([\w.]+) WHEN CONFLICT FAIL$/i.exec(sql)) && table(m[1]) === 'customers_fix' && snapshot(m[2], 'after_fix') && table(m[3]) === 'customers') {
    return { sql: `DATA BRANCH MERGE ${db}.customers_fix{snapshot='${snapshots.after_fix}'} INTO ${db}.customers WHEN CONFLICT FAIL`, values: [] };
  }
  return reject();
}
