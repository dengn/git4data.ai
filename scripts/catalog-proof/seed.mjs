import {writeFileSync,existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {connect,query,output,identifier} from './db.mjs';
const manifest=resolve(output,'run.json');
const previous=existsSync(manifest)?JSON.parse(readFileSync(manifest,'utf8')):null;
if(previous && previous.state!=='seeding') throw new Error('Dataset already seeded; refusing replacement.');
const database=identifier(previous?.database || 'g4d_catalog_'+Date.now());
const rows=10000000;
const run=previous || {database,rows,baselineSnapshot:database+'_base',createdAt:new Date().toISOString(),agentExecution:'20 independent Codex-authored bulk SQL plans; coordinator executes reviewed SQL',synthetic:true,concurrency:3,state:'seeding'};
writeFileSync(manifest,JSON.stringify(run,null,2));
const conn=await connect();
try{
 run.version=(await query(conn,'version','SELECT version() AS version'))[0].version;
 if(!previous) {
 await query(conn,'create_database',`CREATE DATABASE ${database}`);
 await query(conn,'create_main',`CREATE TABLE ${database}.main (id BIGINT PRIMARY KEY,sku VARCHAR(40),brand VARCHAR(40),category VARCHAR(40),attributes VARCHAR(160),description VARCHAR(240),price DECIMAL(10,2),source_brand VARCHAR(40),source_category VARCHAR(40),source_attributes VARCHAR(160),source_description VARCHAR(240),source_confidence DECIMAL(3,2))`);
 }
 const existing=previous?Number((await query(conn,'resume_count',`SELECT COUNT(*) AS n FROM ${database}.main`))[0].n):0;
 for(let lo=existing+1;lo<=rows;lo+=200000){
 const hi=Math.min(rows,lo+199999);
 await query(conn,`seed_${lo}_${hi}`,`INSERT INTO ${database}.main SELECT id,
 CONCAT('SKU-',LPAD(CAST(CASE WHEN MOD(id,100)=4 THEN id-1 ELSE id END AS CHAR),10,'0')),
 CASE WHEN MOD(id,10)=2 THEN CONCAT(LOWER(source_brand),' ') ELSE source_brand END,
 CASE WHEN MOD(id,20)=1 THEN 'Misc' ELSE source_category END,
 CASE WHEN MOD(id,5)=0 THEN NULL ELSE source_attributes END,
 CASE WHEN MOD(id,10)=3 THEN 'Great product. Buy now!' ELSE source_description END,
 100+MOD(id,100)/10,source_brand,source_category,source_attributes,source_description,
 CASE WHEN MOD(id,97)=0 THEN 0.60 ELSE 0.99 END
 FROM (SELECT result AS id,
 CASE MOD(result,4) WHEN 0 THEN 'Acme' WHEN 1 THEN 'Northstar' WHEN 2 THEN 'Bluebird' ELSE 'Summit' END AS source_brand,
 CASE MOD(result,4) WHEN 0 THEN 'Drinkware' WHEN 1 THEN 'Cookware' WHEN 2 THEN 'Storage' ELSE 'Utensils' END AS source_category,
 '{"material":"stainless steel","color":"silver"}' AS source_attributes,
 CONCAT('Supplier item ',CAST(result AS CHAR),'. Stainless steel, silver finish. Care: hand wash.') AS source_description
 FROM generate_series(${lo},${hi}) g) seed`);
 run.seededRows=hi;writeFileSync(manifest,JSON.stringify(run,null,2));
 }
 run.baseline=(await query(conn,'baseline_quality',`SELECT COUNT(*) AS total,SUM(CASE WHEN attributes IS NULL THEN 1 ELSE 0 END) AS missing_attributes,SUM(CASE WHEN category='Misc' THEN 1 ELSE 0 END) AS wrong_category,SUM(CASE WHEN NOT(brand <=> source_brand) THEN 1 ELSE 0 END) AS inconsistent_brand,SUM(CASE WHEN description='Great product. Buy now!' THEN 1 ELSE 0 END) AS bad_description,SUM(CASE WHEN MOD(id,100)=4 THEN 1 ELSE 0 END) AS duplicate_skus FROM ${database}.main`))[0];
 if(Number(run.baseline.total)!==rows)throw new Error('Unexpected row count');
 await query(conn,'baseline_snapshot',`CREATE SNAPSHOT ${run.baselineSnapshot} FOR TABLE ${database} main`);
 run.state='seeded';writeFileSync(manifest,JSON.stringify(run,null,2));
}finally{await conn.end();}
