#!/usr/bin/env python3
"""Assign persistent IDs to published controls and build the server allowlist.
Run after adding pages or regenerating catalog-run.html. Never collect runtime text.
"""
from pathlib import Path
from html import unescape
from urllib.parse import urlsplit
import re,json
ROOT=Path(__file__).resolve().parents[1]
files=sorted(ROOT.glob('*.html'))+sorted((ROOT/'blog').glob('*.html'))
pages=[]
def attr(tag,name):
    m=re.search(r'\b'+re.escape(name)+r'\s*=\s*([\'\"])(.*?)\1',tag,re.S)
    return unescape(m.group(2)) if m else ''
def text(value):return ' '.join(unescape(re.sub(r'<[^>]+>',' ',value)).split())
for file in files:
    if file.name=='analytics.html':continue
    source=file.read_text()
    title=re.search(r'<title>(.*?)</title>',source,re.S).group(1)
    canonical=next((attr(tag,'href') for tag in re.findall(r'<link\b[^>]*>',source) if attr(tag,'rel')=='canonical'),'')
    page=urlsplit(canonical).path or ('/' if file.name=='index.html' else '/'+file.stem)
    source=re.sub(r'<body\b[^>]*>',lambda m: re.sub(r'\sdata-analytics-page="[^"]*"','',m.group(0))[:-1]+f' data-analytics-page="{page}">',source,count=1)
    if '/assets/js/analytics.js?' not in source:source=source.replace('</body>','<script src="/assets/js/analytics.js?v=1" defer></script>\n</body>')
    if file.name!='privacy.html' and 'data-analytics-privacy' not in source:
        source=source.replace('</body>','<p data-analytics-privacy style="text-align:center;padding:16px 24px;font-size:11px;color:#8f9cb3"><a href="/privacy">Analytics &amp; privacy · 网站统计与隐私</a></p>\n</body>')
    ids=[int(n) for n in re.findall(r'data-analytics-id="click-(\d+)"',source)]
    next_id=max(ids,default=0);targets={}
    def instrument(m):
        global next_id
        tag,kind,body,close=m.group(1),m.group(2),m.group(3),m.group(4)
        if 'data-analytics-ignore' in tag:return m.group(0)
        key=attr(tag,'data-analytics-id')
        if not key:
            next_id+=1;key=f'click-{next_id:03d}';tag=tag[:-1]+f' data-analytics-id="{key}">'
        raw=attr(tag,'href');url=urlsplit(raw)
        destination=(url.netloc+url.path if url.netloc else url.path)+('#'+url.fragment if url.fragment else '')
        label=attr(tag,'aria-label') or text(body) or attr(tag,'id') or kind
        targets[key]={'label':label[:120],'destination':destination[:250]}
        return tag+body+close
    source=re.sub(r'(<(a|button)\b[^>]*>)(.*?)(</\2>)',instrument,source,flags=re.S)
    videos=[]
    def video(m):
        tag=m.group(0);key=attr(tag,'data-analytics-video') or f'video-{len(videos)+1}';videos.append(key)
        return tag if 'data-analytics-video=' in tag else tag[:-1]+f' data-analytics-video="{key}">'
    source=re.sub(r'<video\b[^>]*>',video,source)
    if page=='/playground':
        for n in range(1,9):targets[f'play-step-{n}']={'label':f'Playground step {n}','destination':'tutorial'}
    if page=='/benchmark':
        targets['bench-run']={'label':'Choose benchmark run','destination':'benchmark run selector'}
        targets['bench-system']={'label':'Toggle benchmark system','destination':'benchmark columns'}
    pages.append({'path':page,'title':text(title),'targets':targets,'videos':videos})
    file.write_text(source)
(ROOT/'data/analytics-catalog.json').write_text(json.dumps({'pages':pages},ensure_ascii=False,indent=2)+'\n')
print(f'Instrumented {len(pages)} public pages; {sum(len(p["targets"]) for p in pages)} known click targets.')
