import {DurableObject} from 'cloudflare:workers';
import catalog from '../data/analytics-catalog.json';

const pageMap = new Map(catalog.pages.map(page => [page.path, page]));
const DAY = 86400000;
const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers: {
  'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
  'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer',
}});

export class SiteAnalytics extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS totals (
      day TEXT NOT NULL, page TEXT NOT NULL, event TEXT NOT NULL, target TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day,page,event,target));
      CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
    this.sql.exec('INSERT OR IGNORE INTO metadata VALUES (?,?)', 'started_at', new Date().toISOString());
    this.cleanedDay = '';
    ctx.blockConcurrencyWhile(async () => {
      if (await ctx.storage.getAlarm() === null) await ctx.storage.setAlarm((Math.floor(Date.now()/DAY)+1)*DAY);
    });
  }
  cleanup() {
    const today = new Date().toISOString().slice(0,10);
    if (this.cleanedDay !== today) {
      this.sql.exec('DELETE FROM totals WHERE day < ?', new Date(Date.now() - 179 * DAY).toISOString().slice(0,10));
      this.cleanedDay = today;
    }
  }
  async alarm() {
    this.cleanedDay = '';
    this.cleanup();
    await this.ctx.storage.setAlarm((Math.floor(Date.now()/DAY)+1)*DAY);
  }
  record(events) {
    this.cleanup();
    const day = new Date().toISOString().slice(0,10);
    this.ctx.storage.transactionSync(() => {
      for (const item of events) this.sql.exec(`INSERT INTO totals(day,page,event,target,count) VALUES (?,?,?,?,1)
        ON CONFLICT(day,page,event,target) DO UPDATE SET count=count+1`, day, item.page, item.event, item.target);
    });
    return {accepted:events.length};
  }
  report(days) {
    this.cleanup();
    const end = new Date().toISOString().slice(0,10);
    const requestedStart = new Date(Date.parse(end+'T00:00:00Z') - (days-1)*DAY).toISOString().slice(0,10);
    const startedAt=this.sql.exec("SELECT value FROM metadata WHERE key='started_at'").one().value;
    const start=requestedStart>startedAt.slice(0,10)?requestedStart:startedAt.slice(0,10);
    return {
      generatedAt:new Date().toISOString(), startedAt, requestedStart,
      start,end,timezone:'UTC',retentionDays:180,
      rows:this.sql.exec('SELECT day,page,event,target,count FROM totals WHERE day >= ? ORDER BY day,page,event,target',start).toArray(),
      pages:catalog.pages,
    };
  }
}

async function authorized(request, secret) {
  if (!secret) return false;
  const value = request.headers.get('authorization') || '';
  if (value.length > 200) return false;
  const hash = async s => new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
  const [actual,expected] = await Promise.all([hash(value),hash('Bearer '+secret)]);
  let diff=0;for(let i=0;i<expected.length;i++) diff |= actual[i]^expected[i];
  return diff===0;
}

async function boundedBody(request) {
  if (Number(request.headers.get('content-length')) > 8192) throw new Error('size');
  if (!request.body) throw new Error('empty');
  const reader=request.body.getReader();let bytes=0;let chunks=[];
  for (;;) {const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>8192){await reader.cancel();throw new Error('size');}chunks.push(value);}
  const combined=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){combined.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(combined));
}

export async function analyticsRoutes(request, env) {
  const url=new URL(request.url);
  if (!env.SITE_ANALYTICS) return json({error:'Analytics unavailable'},503);
  // IP is used transiently by Cloudflare's rate limiter, never saved in analytics.
  const key=(url.pathname.endsWith('/report')?'report:':'collect:')+(request.headers.get('cf-connecting-ip')||'unknown');
  if (env.ANALYTICS_LIMIT && !(await env.ANALYTICS_LIMIT.limit({key})).success) return json({error:'Rate limited'},429);
  if (url.pathname === '/api/analytics/report') {
    if (request.method!=='GET') return json({error:'Use GET'},405);
    if (!await authorized(request,env.ANALYTICS_READ_TOKEN)) return json({error:'Unauthorized'},401);
    const days=Number(url.searchParams.get('days')||30);
    if (![1,7,30,90,180].includes(days)) return json({error:'Invalid period'},400);
    return json(await env.SITE_ANALYTICS.getByName('site-v1').report(days));
  }
  if (url.pathname !== '/api/analytics/events') return json({error:'Not found'},404);
  if (request.method !== 'POST') return json({error:'Use POST'},405);
  if (!['https://git4data.ai','https://www.git4data.ai'].includes(request.headers.get('origin'))) return json({error:'Origin rejected'},403);
  if (request.headers.get('dnt')==='1' || request.headers.get('sec-gpc')==='1') return new Response(null,{status:204});
  if (request.cf?.botManagement?.verifiedBot || /bot|crawler|spider|headless/i.test(request.headers.get('user-agent')||'')) return new Response(null,{status:204});
  let body;try {body=await boundedBody(request);} catch {return json({error:'Invalid body'},400);}
  if (!Array.isArray(body.events) || body.events.length<1 || body.events.length>20) return json({error:'Invalid events'},400);
  const accepted=[];
  for (const event of body.events) {
    if (!event || typeof event!=='object' || Object.keys(event).some(k=>!['page','event','target'].includes(k))) return json({error:'Invalid event'},400);
    const page=pageMap.get(event.page);
    if (!page || typeof event.target!=='string') return json({error:'Invalid page'},400);
    if (event.event==='page_view' && event.target==='') accepted.push(event);
    else if (event.event==='click' && Object.hasOwn(page.targets,event.target)) accepted.push(event);
    else if (['video_start','video_complete'].includes(event.event) && page.videos.includes(event.target)) accepted.push(event);
    else return json({error:'Invalid target'},400);
  }
  try {
    await env.SITE_ANALYTICS.getByName('site-v1').record(accepted);
    return new Response(null,{status:204,headers:{'cache-control':'no-store'}});
  } catch { return json({error:'Analytics temporarily unavailable'},503); }
}
