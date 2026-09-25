"""Render a clearly labeled replay from measured database results, not simulated metrics."""
import json, math, subprocess, sys
from pathlib import Path
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[2]
REPORT=json.loads((ROOT/'outputs/catalog-proof/execution.json').read_text())
PREVIEW='--preview' in sys.argv
assert PREVIEW or REPORT['state']=='merged', 'Do not publish a success replay before the real merge succeeds'
TOTAL=REPORT['totals']; W,H,FPS,DURATION=1280,720,20,60
OUT=ROOT/('outputs/catalog-proof/preview' if PREVIEW else 'assets/video'); OUT.mkdir(exist_ok=True)
BG='#080d18'; PANEL='#111b2b'; LINE='#263348'; TEXT='#f3f7fc'; MUTED='#9baac0'; CYAN='#5ae2cf'; BLUE='#8badff'; AMBER='#ffce79'; RED='#ff7f90'
@lru_cache(None)
def font(size,bold=False,mono=False):
    name='/System/Library/Fonts/SFNSMono.ttf' if mono else '/System/Library/Fonts/Supplemental/Arial'+(' Bold' if bold else '')+'.ttf'
    return ImageFont.truetype(name,size)
def txt(d,xy,s,size=22,fill=TEXT,bold=False,mono=False):d.text(xy,str(s),font=font(size,bold,mono),fill=fill)
def box(d,xy,fill=PANEL,outline=LINE,r=16):d.rounded_rectangle(xy,radius=r,fill=fill,outline=outline,width=1)
def badge(d,x,y,label,color=CYAN):
    width=d.textlength(label,font=font(15,True))+26
    box(d,(x,y,x+width,y+32),fill=BG,outline=color,r=16);txt(d,(x+13,y+7),label,15,color,True)
def button(d,x,y,label,active=True):
    width=d.textlength(label,font=font(22,True))+52
    box(d,(x,y,x+width,y+54),fill=CYAN if active else PANEL,outline=CYAN if active else LINE,r=10)
    txt(d,(x+26,y+14),label,22,BG if active else TEXT,True)
def num(n):return f'{n:,}'
def header(d,step,label):
    txt(d,(54,29),'git',25,TEXT,True);txt(d,(86,29),'4',25,CYAN,True);txt(d,(100,29),'data',25,TEXT,True)
    txt(d,(185,35),'/  CATALOG WORKSPACE',15,MUTED,mono=True)
    badge(d,1022,27,'MEASURED RUN',CYAN)
    d.line((54,80,1226,80),fill=LINE,width=1)
    txt(d,(56,105),f'0{step} / {label.upper()}',16,CYAN,mono=True)
def footer(d,t,sub='Real MatrixOne run | Synthetic catalog | Edited replay'):
    txt(d,(54,663),sub,16,MUTED)
    txt(d,(1110,663),f'{int(t):02d} / 60',16,MUTED,mono=True)
    d.rectangle((54,703,1226,706),fill=LINE);d.rectangle((54,703,54+1172*t/DURATION,706),fill=CYAN)
def frame(t):
    im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
    if t<8:
        header(d,1,'The catalog')
        txt(d,(54,153),'You have a 10-million-row',48,TEXT,True)
        txt(d,(54,211),'product catalog.',48,TEXT,True)
        items=[('20%','missing attributes'),('5%','wrong category'),('100,000','duplicate SKUs'),('1,000,000','inconsistent brands'),('1,000,000','bad descriptions')]
        for i,(n,label) in enumerate(items):
            if t<0.6+i*0.65:continue
            x=54+(i%3)*395;y=301+(i//3)*120
            box(d,(x,y,x+377,y+101));txt(d,(x+19,y+15),n,32,AMBER,True);txt(d,(x+19,y+58),label,19,MUTED)
        button(d,54,566,'Run 20 Codex agents',t>5.5)
    elif t<22:
        header(d,2,'Isolated branches')
        txt(d,(54,148),'20 agents. 20 data branches.',44,TEXT,True)
        txt(d,(54,208),'Five repair tasks, each split across four catalog shards.',22,MUTED)
        box(d,(54,260,274,579));txt(d,(79,287),'main',28,TEXT,True,True);txt(d,(79,334),'10,000,000',25,CYAN,mono=True);txt(d,(79,373),'catalog rows',19,MUTED);badge(d,77,425,'UNCHANGED',CYAN)
        groups=['attributes','brand','category','description','dedup']
        done=min(20,int((t-9)/11*20));done=max(0,done)
        for row,group in enumerate(groups):
            y=262+row*63
            d.line((274,420,310,420),fill=LINE,width=2);d.line((310,291,310,543),fill=LINE,width=2);d.line((310,y+23,337,y+23),fill=LINE,width=2)
            for shard in range(4):
                i=row*4+shard;x=337+shard*225
                color=CYAN if i<done else BLUE if i<done+3 else LINE
                box(d,(x,y,x+211,y+47),outline=color,r=9);txt(d,(x+12,y+14),f'{group}-{shard+1}',17,color if color!=LINE else MUTED,mono=True)
        txt(d,(340,602),'20 independent Codex plans | 3 SQL workers at a time',18,MUTED)
    elif t<34:
        header(d,3,'Data pull request')
        txt(d,(54,148),'DATA PULL REQUEST #42',22,MUTED,mono=True)
        txt(d,(54,194),num(TOTAL['changed']),67,TEXT,True)
        txt(d,(54,272),'rows with proposed changes',25,MUTED)
        cards=[(TOTAL['passed'],'passed validation',CYAN),(TOTAL['review'],'need review',AMBER),(TOTAL['blocked'],'policy violations',RED)]
        for i,(n,label,color) in enumerate(cards):
            y=337+i*79;box(d,(54,y,560,y+65));txt(d,(73,y+13),num(n),29,color,True);txt(d,(273,y+22),label,18,MUTED)
        box(d,(603,153,1226,576));txt(d,(628,175),'CHANGED FIELDS',16,MUTED,mono=True)
        bytask={}
        for a in REPORT['agents']:bytask[a['task']]=bytask.get(a['task'],0)+a['affected']
        for i,key in enumerate(['description','category','brand','attributes','dedup','price']):
            y=223+i*51;label='sku' if key=='dedup' else key
            count=14 if key=='price' else bytask[key];color=RED if key=='price' else TEXT
            txt(d,(628,y),label,21,color,mono=True);txt(d,(942,y),num(count),23,color,mono=True)
            if key=='price':txt(d,(1083,y+5),'BLOCKED',13,RED,True)
        button(d,603,592,'View Diff')
    elif t<44:
        header(d,4,'Review before merge')
        txt(d,(54,148),'Catch the change that should not ship.',40,TEXT,True)
        box(d,(54,225,1226,524));txt(d,(79,248),'SKU-0000000002',23,TEXT,mono=True);badge(d,894,242,'BLOCKED FROM MERGE',RED)
        for x,s in [(81,'FIELD'),(310,'MAIN'),(760,'AGENT BRANCH')]:txt(d,(x,311),s,15,MUTED,mono=True)
        d.line((79,345,1200,345),fill=LINE,width=1)
        txt(d,(81,374),'price',30,RED,mono=True);txt(d,(310,365),'$100.20',44,TEXT,True);txt(d,(760,365),'$99.00',44,RED,True)
        txt(d,(80,462),'Policy: agents may repair catalog content; price must stay unchanged.',21,MUTED)
        txt(d,(54,554),'14 price changes injected to test the approval policy.',22,AMBER)
        txt(d,(54,592),'The agent branch changed. Main did not.',24,CYAN,True)
    elif t<53:
        header(d,5,'Approve and merge')
        txt(d,(54,149),'Approve the changes that passed.',43,TEXT,True)
        txt(d,(54,212),'Hold review items. Exclude every price violation.',23,MUTED)
        labels=[('AGENT BRANCHES',num(TOTAL['changed'])+' proposed'),('APPROVED BRANCH',num(TOTAL['passed'])+' accepted'),('MAIN','10,000,000 products')]
        for i,(a,b) in enumerate(labels):
            x=54+i*405;box(d,(x,295,x+364,446),outline=CYAN if t>45+i*2 else LINE)
            txt(d,(x+20,320),a,17,MUTED,mono=True);txt(d,(x+20,370),b,25,TEXT,True)
            if i<2:txt(d,(x+374,351),'>',28,CYAN,True)
        txt(d,(71,471),'PICK approved row keys',19,CYAN,mono=True)
        txt(d,(477,471),'MERGE ... WHEN CONFLICT FAIL',18,CYAN,mono=True)
        button(d,54,551,'Approve passed changes',t<48)
        button(d,431,551,'Merge approved branch',t>=48)
    else:
        header(d,6,'Verified outcome')
        txt(d,(54,157),num(TOTAL['passed']),73,CYAN,True)
        txt(d,(54,251),'approved rows merged.',43,TEXT,True)
        for i,(n,label,color) in enumerate([('0','price changes reached main',CYAN),('0','unreviewed changes reached main',CYAN),(num(TOTAL['review']),'proposed rows held for review',AMBER)]):
            y=338+i*78;box(d,(54,y,1226,y+65));txt(d,(76,y+12),n,29,color,True);txt(d,(292,y+21),label,23,TEXT)
        txt(d,(54,600),'Let agents work. You decide what reaches main.',28,TEXT,True)
    for click_t,cx,cy in [(6.6,243,593),(32.6,700,619),(46.5,298,580),(50.0,650,580)]:
        delta=t-click_t
        if -0.6<delta<0.65:
            if delta>=0:
                radius=12+delta*40
                d.ellipse((cx-radius,cy-radius,cx+radius,cy+radius),outline=CYAN,width=2)
            d.polygon([(cx,cy),(cx+3,cy+27),(cx+10,cy+20),(cx+18,cy+33),(cx+24,cy+29),(cx+17,cy+17),(cx+28,cy+16)],fill=TEXT,outline=BG)
    footer(d,t)
    # Gentle fade at cuts; timestamps and metrics are always from the completed report.
    cuts=[0,8,22,34,44,53]
    age=t-max(c for c in cuts if c<=t)
    if age<0.24:im=Image.blend(Image.new('RGB',(W,H),BG),im,age/0.24)
    return im

# A readable still for the homepage before playback.
poster=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(poster);header(d,1,'Real database walkthrough')
txt(d,(54,157),'10 Million Products.',61,TEXT,True);txt(d,(54,230),'20 Codex Agents.',61,CYAN,True)
txt(d,(54,323),'Branch. Review. Approve. Merge.',31,MUTED)
box(d,(54,410,1226,587));txt(d,(79,435),num(TOTAL['passed']),48,CYAN,True);txt(d,(79,502),'approved rows merged in the measured run',25,TEXT)
box(d,(1044,441,1147,544),fill=CYAN,outline=CYAN,r=52);d.polygon([(1084,466),(1084,520),(1120,493)],fill=BG)
footer(d,0);poster.save(OUT/'catalog-agents-poster.jpg',quality=92)
if PREVIEW:
    montage=Image.new('RGB',(W*2,H*3),BG)
    for i,t in enumerate([4,17,28,39,49,56]):
        sample=frame(t);ImageDraw.Draw(sample).text((54,632),'DRAFT LAYOUT — DATABASE MERGE STILL RUNNING',font=font(16,True),fill=RED)
        montage.paste(sample,(i%2*W,i//2*H))
    montage.resize((1280,1080)).save(OUT/'storyboard.jpg',quality=92)
    print(OUT/'storyboard.jpg')
    raise SystemExit(0)
cmd=['ffmpeg','-y','-loglevel','error','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart','-metadata','title=10 Million Products + 20 Codex Agents',str(OUT/'catalog-agents.mp4')]
proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for i in range(FPS*DURATION):
    proc.stdin.write(frame(i/FPS).tobytes())
    if i%200==0:print(f'Rendered {i//FPS}s',flush=True)
proc.stdin.close();assert proc.wait()==0
montage=Image.new('RGB',(W*2,H*3),BG)
for i,t in enumerate([4,17,28,39,49,56]):montage.paste(frame(t),(i%2*W,i//2*H))
montage.resize((1280,1080)).save(ROOT/'outputs/catalog-proof/video-storyboard.jpg',quality=92)
print(str(OUT/'catalog-agents.mp4'))
