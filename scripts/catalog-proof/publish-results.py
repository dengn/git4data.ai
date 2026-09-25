"""Publish only measurements from a successfully completed run; never credentials or endpoint details."""
import json, html
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
r=json.loads((ROOT/'outputs/catalog-proof/execution.json').read_text());run=json.loads((ROOT/'outputs/catalog-proof/run.json').read_text())
assert r['state']=='merged'
events=[json.loads(x) for x in (ROOT/'outputs/catalog-proof/events.jsonl').read_text().splitlines()]
def native_updates(rows):
    row=next(x for x in rows if x['metric']=='UPDATED')
    return sum(int(v) for k,v in row.items() if k!='metric')
for a in r['agents']:
    assert native_updates(a['summary'])==a['counts']['changed']
assert native_updates(r['approvedDiff'])==r['totals']['passed']
assert native_updates(r['finalDiff'])==r['totals']['passed']
assert int(r['afterMerge']['changed_prices'])==0
assert int(r['afterMerge']['unreviewed_changes'])==0
integrity=json.loads((ROOT/'outputs/catalog-proof/before-merge-integrity.json').read_text())
assert integrity['unchanged'] is True
summary={'mainUnchangedBeforeMerge':integrity,'title':'10 Million Products + 20 Codex Agents','date':run['createdAt'][:10],'databaseVersion':run['version'],'syntheticData':True,'catalogRows':run['rows'],'agentCount':20,'maxConcurrentAgents':3,'maxConcurrentSqlWorkers':3,'modelWork':'20 independent Codex tasks authored bounded repair SQL; coordinator reviewed and executed plans','baseline':run['baseline'],'totals':r['totals'],'afterMerge':r['afterMerge'],'faultInjection':r['faultInjection'],'limits':['Issue predicates are disjoint; conflict rejection tested separately on a small fixture.','Source confidence is synthetic; application validation and approval are implemented by the harness.','Unproposed low-confidence rows remain unchanged in addition to the review queue.','Single run on a shared free-tier instance; timings are observations, not general performance promises.','Video is an edited replay of measured results, not an uncut screen recording.'],'timings':{x['label']:x['ms'] for x in events if x['label'].endswith(':branch') or x['label'].endswith(':approve_pick') or x['label'] in ['merge_approved','approved_diff','final_diff']},'agents':[{k:a[k] for k in ['agent','task','shard','affected','elapsedMs','counts']} for a in r['agents']]}
(ROOT/'data/catalog-run.json').write_text(json.dumps(summary,indent=2)+'\n')
index=ROOT/'index.html';index.write_text(index.read_text().replace('MEASURED_COUNT',f"{r['totals']['passed']:,}"))
rows=''.join(f'<tr><td>{html.escape(a[0])}</td><td>{a[1]:,}</td></tr>' for a in [('Catalog rows',run['rows']),('Proposed changed rows',r['totals']['changed']),('Passed and merged',r['totals']['passed']),('Proposed rows held for review',r['totals']['review']),('Injected price violations excluded',14),('Unreviewed changes in main',0),('Price changes in main',0)])
merge_ms=next(x['ms'] for x in events if x['label']=='merge_approved')
pick_ms=sum(x['ms'] for x in events if x['label'].endswith(':approve_pick'))
page=f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>10M Catalog Run — Git4Data</title><meta name="description" content="Measured results from 20 Codex tasks, 10 million synthetic products, and real MatrixOne branch, diff, PICK and MERGE operations."><link rel="canonical" href="https://git4data.ai/catalog-run"><link rel="stylesheet" href="assets/css/style.css?v=8"><link rel="icon" href="assets/img/favicon.svg?v=4"></head>
<body><main class="run-evidence wrap"><a class="pill" href="index.html">← git4data.ai</a><p class="kick" style="margin-top:32px">REAL DATABASE RUN · {summary['date']}</p><h1>10 Million Products.<br>20 Codex Agents.</h1><p>Twenty independent Codex tasks authored catalog-repair SQL. We reviewed and executed those plans on twenty isolated branches of a real 10-million-row MatrixOne table, then selected approved rows and merged the approval branch into main.</p>
<video controls playsinline preload="none" poster="assets/video/catalog-agents-poster.jpg?v=1"><source src="assets/video/catalog-agents.mp4?v=1" type="video/mp4"><track kind="captions" src="assets/video/catalog-agents.en.vtt?v=1" srclang="en" label="English"></video>
<p>The video is a 60-second replay reconstructed from the completed run, with time compressed. The UI is a walkthrough of the script-driven experiment. The public SQL Playground is a separate, smaller tutorial.</p>
<p style="margin-top:18px"><a class="text-link" href="blog/10-million-products-20-codex-agents">How we ran the experiment →</a> · <a class="text-link" href="blog/10-million-products-20-codex-agents-zh" lang="zh-Hans">阅读完整中文实录 →</a></p>
<h2>Actual results</h2><table><thead><tr><th>Measurement</th><th>Rows</th></tr></thead><tbody>{rows}</tbody></table>
<h2>What actually ran</h2><ul><li>Synthetic catalog: 20% missing attributes, 5% wrong categories, 100,000 duplicate SKUs, one million inconsistent brands, and one million poor descriptions.</li><li>Five repair types × four ID shards; each branch contains the entire logical 10M-row baseline. Codex tasks ran in waves of up to three. Database update workers were also capped at three.</li><li>Repairs copy factual supplier fields. SKU repair restores the canonical identifier for distinct product IDs; it does not delete products.</li><li>MatrixOne native diff counts were checked against SQL counts. Both quality counts and native diff confirmed that main stayed identical to the baseline before merge.</li><li>Application policy holds source confidence below 0.80 and excludes price changes. Fourteen price edits were deliberately injected by the test harness after agent execution; they were not spontaneous Codex mistakes.</li><li>Native <code>DATA BRANCH PICK ... KEYS (SELECT ...)</code> copies approved rows into an approval branch. Native <code>DATA BRANCH MERGE ... WHEN CONFLICT FAIL</code> then applies that branch to main.</li></ul>
<h2>Observed timing</h2><p>On this single {html.escape(run['version'])} run, the 20 sequential approval PICK operations took {pick_ms/1000:,.2f} seconds in total. The final merge took {merge_ms/1000:,.2f} seconds. These include client-observed query time; they are not generalized performance claims. The video compresses these waits.</p>
<h2>Scope and boundaries</h2><p>The fixture gives each task a disjoint set of affected primary keys. We separately verified that a conflicting merge is rejected and that selecting a safe row leaves an unselected price change out of main. The approval workflow and business checks are application code around the native database operations. Some Codex tasks declined low-confidence proposals upfront; those unchanged rows are additional to the reported proposed-review queue.</p>
<p>The small capability probe also observed that re-merging the original source after a prior PICK can raise a conflict in this instance. This measured workflow avoids that path: it assembles one approval branch and merges it once. It does not claim arbitrary retry or conflict-free concurrent-merge behavior.</p>
<h2>Evidence and reproduction</h2><p><a class="btn btn-ghost" href="data/catalog-run.json">Download measured results (JSON)</a> <a class="btn btn-ghost" href="https://github.com/dengn/git4data.ai/tree/catalog-merge-proof/scripts/catalog-proof">Read the reproduction scripts</a></p><p style="margin-top:20px"><a class="btn btn-primary" href="playground.html">Try the live SQL Playground →</a></p>
<h2>中文摘要</h2><p>本次使用 1,000 万行合成商品数据和 20 个独立 Codex 任务，真实执行分支、差异、按行选择和合并。共提出 {r['totals']['changed']:,} 行修改，合并 {r['totals']['passed']:,} 行；{r['totals']['review']:,} 行提案保留待审，14 条主动注入的价格违规被排除。主表价格改动和未经审查的改动均为 0。视频为实测结果的压缩回放，应用层负责业务校验与审批，数据库原生执行 PICK 和 MERGE。</p></main></body></html>'''
(ROOT/'catalog-run.html').write_text(page)
vtt='''WEBVTT

00:00.000 --> 00:08.000
You have a 10-million-row product catalog with missing attributes, wrong categories, duplicate SKUs, inconsistent brands, and bad descriptions.

00:08.000 --> 00:22.000
Twenty independent Codex plans run on twenty isolated data branches. Five repair tasks, four shards each. Main stays unchanged.

00:22.000 --> 00:34.000
'''+f"{r['totals']['changed']:,} rows proposed. {r['totals']['passed']:,} passed validation. {r['totals']['review']:,} need review. 14 price violations are blocked from merge."+'''

00:34.000 --> 00:44.000
The branch changes a price from $100.20 to $99.00. This was deliberately injected to test the policy. Main is unchanged.

00:44.000 --> 00:53.000
Select approved row keys into an approval branch with DATA BRANCH PICK. Merge that branch with WHEN CONFLICT FAIL.

00:53.000 --> 01:00.000
'''+f"{r['totals']['passed']:,} approved rows merged. Zero price changes and zero unreviewed changes reached main. Measured results on synthetic data; edited replay.\n"
(ROOT/'assets/video/catalog-agents.en.vtt').write_text(vtt)
print('Published measured summary, evidence page, captions and homepage count')
