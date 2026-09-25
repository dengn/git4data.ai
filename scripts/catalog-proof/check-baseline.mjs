import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {connect,query,output,identifier} from './db.mjs';
const run=JSON.parse(readFileSync(resolve(output,'run.json'),'utf8'));
const db=identifier(run.database), conn=await connect();
try{
 const result=await query(conn,'main_native_unchanged',`DATA BRANCH DIFF ${db}.main AGAINST ${db}.main{snapshot='${run.baselineSnapshot}'} OUTPUT SUMMARY`);
 for(const row of result)for(const [k,v]of Object.entries(row))if(k!=='metric')assert.equal(Number(v),0);
 writeFileSync(resolve(output,'before-merge-integrity.json'),JSON.stringify({at:new Date().toISOString(),result,unchanged:true},null,2));
}finally{await conn.end();}
