#!/usr/bin/env python3
"""Generate media/icon.png (128x128) for the NodeNote extension.

Concept: a stack of note cards with a status dot — NodeNote turns a markdown
file into a triage board of question/note cards. Rendered at 4x and downscaled
for clean antialiasing.
"""
import os
from PIL import Image, ImageDraw

S = 512                      # supersampled canvas
OUT = 128
R = int(S * 0.22)            # background corner radius

img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# --- background: vertical indigo gradient inside a rounded square ---
top = (99, 102, 241)         # indigo-500
bot = (67, 56, 202)          # indigo-700
grad = Image.new("RGBA", (S, S), (0, 0, 0, 0))
gd = ImageDraw.Draw(grad)
for y in range(S):
    t = y / (S - 1)
    c = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)) + (255,)
    gd.line([(0, y), (S, y)], fill=c)
mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=R, fill=255)
img.paste(grad, (0, 0), mask)
d = ImageDraw.Draw(img)

def card(x, y, w, h, fill, shadow=True):
    rad = int(S * 0.06)
    if shadow:
        sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle(
            [x + 6, y + 12, x + w + 6, y + h + 12], radius=rad, fill=(30, 27, 75, 90))
        sh = sh.filter(__import__("PIL.ImageFilter", fromlist=["GaussianBlur"]).GaussianBlur(10))
        img.alpha_composite(sh)
    ImageDraw.Draw(img).rounded_rectangle([x, y, x + w, y + h], radius=rad, fill=fill)

# back card (peeking behind)
card(int(S * 0.30), int(S * 0.20), int(S * 0.42), int(S * 0.52), (224, 231, 255, 255))
# front card
fx, fy, fw, fh = int(S * 0.20), int(S * 0.27), int(S * 0.46), int(S * 0.52)
card(fx, fy, fw, fh, (255, 255, 255, 255))

dd = ImageDraw.Draw(img)
# status dot (amber) top-left of front card
r = int(S * 0.035)
cx, cy = fx + int(S * 0.075), fy + int(S * 0.085)
dd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(245, 158, 11, 255))

# text lines on the front card
lx = fx + int(S * 0.135)
line_w = fw - int(S * 0.20)
for i, frac in enumerate([1.0, 0.78, 0.92, 0.6]):
    ly = fy + int(S * 0.16) + i * int(S * 0.085)
    lh = int(S * 0.028)
    shade = (203, 213, 225, 255) if i else (148, 163, 184, 255)
    dd.rounded_rectangle([lx, ly, lx + int(line_w * frac), ly + lh],
                         radius=lh // 2, fill=shade)

out = img.resize((OUT, OUT), Image.LANCZOS)
os.makedirs("media", exist_ok=True)
out.save("media/icon.png")
print("wrote media/icon.png", out.size)
