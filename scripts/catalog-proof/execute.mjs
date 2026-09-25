import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {connect,query,output,identifier} from './db.mjs';
const run=JSON.parse(readFileSync(resolve(output,'run.json'),'utf8'));
const db=identifier(run.database);
assert.equal(run.state,'seeded');
const agents=readdirSync(resolve(output,'agents')).filter(x=>x.endsWith('.json')).sort().map(file=>JSON.parse(readFileSync(resolve(output,'agents',file),'utf8')));
assert.equal(agents.length,20,'Wait until all 20 Codex plans have arrived');
const reportPath=resolve(output,'execution.json');
if(existsSync(reportPath)) throw new Error('Execution report exists; resume explicitly rather than duplicate mutations.');
const fields={brand:'brand',category:'category',attributes:'attributes',description:'description',dedup:'sku'};
const predicates={brand:'MOD(b.id,10)=2',category:'MOD(b.id,20)=1',attributes:'MOD(b.id,5)=0',description:'MOD(b.id,10)=3',dedup:'MOD(b.id,100)=4'};
for(const p of agents){
 assert.ok(fields[p.task]);assert.ok(Number.isInteger(p.shard)&&p.shard>=0&&p.shard<4);
 assert.deepEqual(p.range,[p.shard*2500000+1,(p.shard+1)*2500000]);
 assert.match(p.sql,new RegExp('^UPDATE \\{\\{branch\\}\\} SET '+fields[p.task]+'\\s*=','i'));
 assert.ok(!/;|--|\/\*|\b(DROP|DELETE|INSERT|GRANT|LOAD|OUTFILE)\b/i.test(p.sql));
 assert.ok(!/\bprice\s*=/i.test(p.sql));
 assert.match(p.validation_sql,/^SELECT COUNT\(\*\) AS remaining FROM \{\{branch\}\}/i);
}
const report={database:db,startedAt:new Date().toISOString(),rows:run.rows,agents:[],faultInjection:{rows:14,description:'Coordinator deliberately modifies price on 14 brand-0 rows after agent SQL, to test policy rejection; not spontaneous model behavior.'},state:'running'};
const save=()=>writeFileSync(reportPath,JSON.stringify(report,null,2));save();
const control=await connect();
try{
 for(const p of agents){
  const table=identifier(`agent_${p.task}_${p.shard}`);
  await query(control,`${p.agent}:branch`,`DATA BRANCH CREATE TABLE ${db}.${table} FROM ${db}.main{snapshot='${run.baselineSnapshot}'}`);
  p.table=table;
 }
 await query(control,'approved_branch',`DATA BRANCH CREATE TABLE ${db}.approved FROM ${db}.main{snapshot='${run.baselineSnapshot}'}`);
 let cursor=0;
 async function lane(){const conn=await connect();try{while(cursor<agents.length){const p=agents[cursor++];const full=`${db}.${p.table}`;const start=Date.now();
  const result=await query(conn,`${p.agent}:repair`,p.sql.replaceAll('{{branch}}',full));
  const validation=await query(conn,`${p.agent}:validation`,p.validation_sql.replaceAll('{{branch}}',full));
  assert.equal(Number(validation[0].remaining),0,`${p.agent} validation`);
  if(p.task==='brand'&&p.shard===0) await query(conn,'inject_14_price_violations',`UPDATE ${full} SET price=99 WHERE id IN (${Array.from({length:14},(_,i)=>2+i*10).join(',')})`);
  const f=fields[p.task];
  const from=`FROM ${full} b JOIN ${db}.main m ON b.id=m.id WHERE b.id BETWEEN ${p.range[0]} AND ${p.range[1]} AND (NOT(b.${f}<=>m.${f}) OR NOT(b.price<=>m.price))`;
  const counts=(await query(conn,`${p.agent}:counts`,`SELECT COUNT(*) AS changed,SUM(CASE WHEN b.price<>m.price THEN 1 ELSE 0 END) AS blocked,SUM(CASE WHEN b.price=m.price AND b.source_confidence<0.80 THEN 1 ELSE 0 END) AS review,SUM(CASE WHEN b.price=m.price AND b.source_confidence>=0.80 THEN 1 ELSE 0 END) AS passed ${from}`))[0];
  const summary=await query(conn,`${p.agent}:native_diff`,`DATA BRANCH DIFF ${full} AGAINST ${db}.main{snapshot='${run.baselineSnapshot}'} OUTPUT SUMMARY`);
  const samples=await query(conn,`${p.agent}:sample_diff`,`DATA BRANCH DIFF ${full} AGAINST ${db}.main{snapshot='${run.baselineSnapshot}'} OUTPUT LIMIT 3`);
  report.agents.push({agent:p.agent,task:p.task,shard:p.shard,table:p.table,affected:result.affectedRows,elapsedMs:Date.now()-start,counts:Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,Number(v)])),summary,samples});save();
 }}finally{await conn.end();}}
 const settled=await Promise.allSettled([lane(),lane(),lane()]);
 for(const r of settled)if(r.status==='rejected')throw r.reason;
 report.beforeMerge=(await query(control,'main_unchanged',`SELECT COUNT(*) AS total,SUM(CASE WHEN attributes IS NULL THEN 1 ELSE 0 END) AS missing_attributes,SUM(CASE WHEN category='Misc' THEN 1 ELSE 0 END) AS wrong_category,SUM(CASE WHEN NOT(brand<=>source_brand) THEN 1 ELSE 0 END) AS inconsistent_brand,SUM(CASE WHEN description='Great product. Buy now!' THEN 1 ELSE 0 END) AS bad_description,SUM(CASE WHEN MOD(id,100)=4 THEN 1 ELSE 0 END) AS duplicate_skus FROM ${db}.main`))[0];
 assert.deepEqual(report.beforeMerge,run.baseline);
 report.totals=report.agents.reduce((a,p)=>{for(const k of ['changed','blocked','review','passed'])a[k]+=p.counts[k];return a;},{changed:0,blocked:0,review:0,passed:0});
 assert.equal(report.totals.blocked,14);assert.equal(report.totals.changed,report.totals.blocked+report.totals.review+report.totals.passed);save();
 for(const p of agents){
  const full=`${db}.${p.table}`, f=fields[p.task];
  const keys=`SELECT b.id FROM ${full} b JOIN ${db}.main m ON b.id=m.id WHERE b.id BETWEEN ${p.range[0]} AND ${p.range[1]} AND ${predicates[p.task]} AND NOT(b.${f}<=>m.${f}) AND b.source_confidence>=0.80 AND b.price=m.price`;
  await query(control,`${p.agent}:approve_pick`,`DATA BRANCH PICK ${full} INTO ${db}.approved KEYS (${keys}) WHEN CONFLICT FAIL`);
 }
 report.approvedDiff=await query(control,'approved_diff',`DATA BRANCH DIFF ${db}.approved AGAINST ${db}.main{snapshot='${run.baselineSnapshot}'} OUTPUT SUMMARY`);
 report.state='approved';save();
 await query(control,'merge_approved',`DATA BRANCH MERGE ${db}.approved INTO ${db}.main WHEN CONFLICT FAIL`);
 report.afterMerge=(await query(control,'final_safety_check',`SELECT COUNT(*) AS total,SUM(CASE WHEN price<>100+MOD(id,100)/10 THEN 1 ELSE 0 END) AS changed_prices,SUM(CASE WHEN source_confidence<0.80 AND ((MOD(id,5)=0 AND attributes IS NOT NULL) OR (MOD(id,20)=1 AND category<>'Misc') OR (MOD(id,10)=2 AND brand=source_brand) OR (MOD(id,10)=3 AND description<>'Great product. Buy now!') OR (MOD(id,100)=4 AND sku=CONCAT('SKU-',LPAD(CAST(id AS CHAR),10,'0')))) THEN 1 ELSE 0 END) AS unreviewed_changes FROM ${db}.main`))[0];
 assert.equal(Number(report.afterMerge.total),run.rows);assert.equal(Number(report.afterMerge.changed_prices),0);assert.equal(Number(report.afterMerge.unreviewed_changes),0);
 report.finalDiff=await query(control,'final_diff',`DATA BRANCH DIFF ${db}.main AGAINST ${db}.main{snapshot='${run.baselineSnapshot}'} OUTPUT SUMMARY`);
 report.finishedAt=new Date().toISOString();report.state='merged';save();
 console.log(JSON.stringify({state:report.state,totals:report.totals,afterMerge:report.afterMerge}));
}catch(e){report.error=e.message;save();throw e;}finally{await control.end();}
