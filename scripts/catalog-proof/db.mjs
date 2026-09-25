import mysql from 'mysql2/promise';
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
export const output = resolve(process.env.CATALOG_OUTPUT || 'outputs/catalog-proof');
mkdirSync(output, {recursive:true});
export async function connect() {
  for (const key of ['MO_HOST','MO_USER','MO_PASSWORD','MO_CA_FILE']) if (!process.env[key]) throw new Error(`Missing ${key}`);
  return mysql.createConnection({host:process.env.MO_HOST,port:Number(process.env.MO_PORT||6001),user:process.env.MO_USER,password:process.env.MO_PASSWORD,ssl:{rejectUnauthorized:true,verifyIdentity:true,ca:readFileSync(process.env.MO_CA_FILE,'utf8')},connectTimeout:15000,multipleStatements:false, supportBigNumbers:true,bigNumberStrings:true});
}
export async function query(conn, label, sql) {
  const start=Date.now();
  try {
    const [result]=await conn.query(sql);
    const event={at:new Date().toISOString(),label,ms:Date.now()-start,sql,result};
    appendFileSync(resolve(output,'events.jsonl'),JSON.stringify(event)+'\n');
    console.log(JSON.stringify({label,ms:event.ms,...(!Array.isArray(result)?{affected:result.affectedRows}:{result})}));
    return result;
  } catch(e) {
    appendFileSync(resolve(output,'events.jsonl'),JSON.stringify({at:new Date().toISOString(),label,ms:Date.now()-start,sql,error:e.message})+'\n');
    throw e;
  }
}
export function identifier(value) {if(!/^[a-z][a-z0-9_]{0,62}$/.test(value)) throw new Error('Invalid identifier');return value;}
