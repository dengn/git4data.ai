from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, random

W, H = 1200, 630
img = Image.new("RGB", (W, H), (5, 7, 14))
d = ImageDraw.Draw(img, "RGBA")

# radial glows
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
def radial(cx, cy, r, color, amax):
    steps = 60
    for i in range(steps, 0, -1):
        f = i / steps
        a = int(amax * (1 - f) ** 2.1)
        rr = r * f
        gd.ellipse([cx - rr, cy - rr * 0.68, cx + rr, cy + rr * 0.68], fill=color + (a,))
radial(150, -40, 720, (34, 211, 238), 62)
radial(1080, 60, 760, (139, 92, 246), 58)
radial(600, 700, 900, (52, 211, 153), 26)
glow = glow.filter(ImageFilter.GaussianBlur(60))
img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
d = ImageDraw.Draw(img, "RGBA")

# grid
for x in range(0, W, 64):
    d.line([(x, 0), (x, H)], fill=(255, 255, 255, 10))
for y in range(0, H, 64):
    d.line([(0, y), (W, y)], fill=(255, 255, 255, 10))

# git DAG on the right
random.seed(7)
LX, RX = 690, 1150
MY = 300
d.line([(LX, MY), (RX, MY)], fill=(255, 255, 255, 34), width=2)
def curve(x0, y0, x1, y1):
    pts = []
    for i in range(41):
        t = i / 40
        mx = (x0 + x1) / 2
        px = (1-t)**3*x0 + 3*(1-t)**2*t*mx + 3*(1-t)*t*t*mx + t**3*x1
        py = (1-t)**3*y0 + 3*(1-t)**2*t*y0 + 3*(1-t)*t*t*y1 + t**3*y1
        pts.append((px, py))
    return pts
branches = [(742, MY, 190, -94), (900, MY, 175, 94), (1000, MY, 150, -94)]
for bx, by, span, dy in branches:
    ny = by + dy
    d.line(curve(bx, by, bx + 70, ny), fill=(255, 255, 255, 26), width=2)
    d.line([(bx + 70, ny), (bx + span, ny)], fill=(255, 255, 255, 26), width=2)
    d.line(curve(bx + span, ny, bx + span + 70, by), fill=(255, 255, 255, 26), width=2)
    for k in range(3):
        nx = bx + 70 + k * ((span - 70) / 2)
        col = (139, 92, 246) if dy > 0 else (34, 211, 238)
        d.ellipse([nx - 5, ny - 5, nx + 5, ny + 5], fill=col + (220,))
        d.ellipse([nx - 11, ny - 11, nx + 11, ny + 11], fill=col + (34,))
for x in range(LX + 20, RX, 74):
    d.ellipse([x - 5, MY - 5, x + 5, MY + 5], fill=(34, 211, 238, 235))
    d.ellipse([x - 12, MY - 12, x + 12, MY + 12], fill=(34, 211, 238, 30))

# type
def font(path, size):
    return ImageFont.truetype(path, size)
BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
REG  = "/System/Library/Fonts/Supplemental/Arial.ttf"
MONO = "/System/Library/Fonts/Menlo.ttc"

f_brand = font(MONO, 27)
f_h1    = font(BOLD, 82)
f_sub   = font(REG, 27)
f_kick  = font(MONO, 20)

# brand mark
bx, by = 78, 78
d.ellipse([bx, by, bx + 15, by + 15], outline=(34, 211, 238), width=3)
d.ellipse([bx, by + 54, bx + 15, by + 69], outline=(34, 211, 238), width=3)
d.ellipse([bx + 52, by + 27, bx + 67, by + 42], outline=(34, 211, 238), width=3)
d.line([(bx + 7, by + 17), (bx + 7, by + 53)], fill=(34, 211, 238), width=3)
d.line([(bx + 9, by + 34), (bx + 51, by + 34)], fill=(34, 211, 238), width=3)
d.text((bx + 90, by + 22), "git4data.ai", font=f_brand, fill=(232, 238, 248))

d.text((78, 236), "Git for your data.", font=f_h1, fill=(240, 246, 255))

sub = "Snapshot, branch, diff and merge your tables at row level —"
sub2 = "in milliseconds, with zero copies, in plain SQL."
d.text((78, 348), sub,  font=f_sub, fill=(143, 156, 179))
d.text((78, 386), sub2, font=f_sub, fill=(143, 156, 179))

# stat pills
pills = [("0.20 s", "fork a 100 GB table"), ("18.5×", "faster than DoltDB"), ("1,000", "branching agents")]
px = 78
f_pv = font(BOLD, 34); f_pl = font(REG, 18)
for v, l in pills:
    wv = d.textlength(v, font=f_pv); wl = d.textlength(l, font=f_pl)
    w = max(wv, wl) + 44
    d.rounded_rectangle([px, 466, px + w, 552], radius=14, fill=(255, 255, 255, 10), outline=(255, 255, 255, 28), width=1)
    d.text((px + 22, 480), v, font=f_pv, fill=(34, 211, 238))
    d.text((px + 22, 520), l, font=f_pl, fill=(143, 156, 179))
    px += w + 14

d.text((78, 578), "BranchBench · scale factor 100 · MatrixOne", font=f_kick, fill=(99, 112, 138))
img.save("assets/img/og.png", "PNG", optimize=True)
print("og.png written")
