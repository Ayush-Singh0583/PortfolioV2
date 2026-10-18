"""Turns a picture of you into the layers used by the opening scene.

    pip install "rembg[cpu]" pillow numpy
    python scripts/make-portrait.py path/to/picture.png --cut 418

--cut is the pixel row (from the top of the picture) where the skull opens, just above
the eyebrows. --eyes is the row of the eyes; it is estimated if left out.

Writes public/portrait/body.webp, lid.webp, blur.webp (page background) and src/data/portrait.json.
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parent.parent

parser = argparse.ArgumentParser()
parser.add_argument('image')
parser.add_argument('--cut', type=int, required=True)
parser.add_argument('--eyes', type=int)
args = parser.parse_args()

original = Image.open(args.image).convert('RGB')
cutout = remove(original, session=new_session('isnet-general-use'))
im = np.asarray(cutout.convert('RGBA')).astype(np.float32) / 255
rgb, a = im[..., :3].copy(), im[..., 3].copy()
H, W = a.shape
cut = args.cut


def box(x, r):
    # Separable box blur via cumulative sums.
    for axis in (0, 1):
        pad = [(0, 0)] * x.ndim
        pad[axis] = (r + 1, r)
        c = np.cumsum(np.pad(x, pad, mode='edge'), axis=axis)
        n = c.shape[axis]
        x = (np.take(c, np.arange(2 * r + 1, n), axis=axis) - np.take(c, np.arange(0, n - 2 * r - 1), axis=axis)) / (2 * r + 1)
    return x


# Pale, unsaturated pixels near the outline in the hair/ear area are background showing
# through the curls; make them transparent. Eye whites are far from the outline, so they are safe.
near_edge = box((a < 0.5).astype(np.float32), 10) > 0.001
lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
sat = rgb.max(axis=2) - rgb.min(axis=2)
rows = np.arange(H)[:, None] < cut + 190
background = near_edge & rows & (sat < 0.2)
a = np.where(background, a * np.clip((0.55 - lum) / 0.15, 0, 1), a)

# Semi-transparent edge pixels still carry the old background colour, so give them the
# average colour of nearby solid pixels, then choke away the faint halo.
solid = (a > 0.92).astype(np.float32)
num = box(rgb * solid[..., None], 4)
den = box(solid, 4)[..., None]
fill = np.where(den > 1e-4, num / np.maximum(den, 1e-4), rgb)
rgb = np.where((a <= 0.92)[..., None], fill, rgb)
a = np.clip((a - 0.1) / 0.9, 0, 1)

# Fade out the bottom, where the picture's frame cuts the legs off.
fade_from = int(H * 0.9)
ramp = np.ones(H, np.float32)
ramp[fade_from:] = np.linspace(1, 0, H - fade_from)
a *= ramp[:, None]


def save(alpha, path, crop=None, lossless=False):
    img = Image.fromarray((np.clip(np.dstack([rgb, alpha]), 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA')
    if crop:
        img = img.crop(crop)
    img.save(path, 'WEBP', quality=92, method=6, exact=True, lossless=lossless)


out = ROOT / 'public' / 'portrait'
out.mkdir(parents=True, exist_ok=True)

# The body keeps a 2px overlap above the cut so no hairline gap shows when the lid is closed.
body = a.copy()
body[: cut - 2] = 0
save(body, out / 'body.webp')

lid = a.copy()
lid[cut:] = 0
ys, xs = np.where(lid > 0.02)
lid_box = (int(xs.min()) - 4, int(ys.min()) - 4, int(xs.max()) + 5, cut)
save(lid, out / 'lid.webp', lid_box, lossless=True)

# A softly blurred copy of the whole portrait for the page background, 600px wide with an
# 80px margin so the blur isn't cut off at the edges (the CSS in .backdrop accounts for it).
full = Image.fromarray((np.clip(np.dstack([rgb, a]), 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA')
small = full.resize((600, round(600 * H / W)), Image.LANCZOS)
padded = Image.new('RGBA', (small.width + 160, small.height + 160), (0, 0, 0, 0))
padded.alpha_composite(small, (80, 80))
padded.filter(ImageFilter.GaussianBlur(6)).save(out / 'blur.webp', 'WEBP', quality=80, method=6)

# Measurements used to place everything in 3D.
head_top = int(np.where((a > 0.5).any(axis=1))[0].min())
cut_row = np.where(a[cut] > 0.5)[0]
cx = int((cut_row.min() + cut_row.max()) / 2)
skin = np.asarray(original).astype(np.float32)[cut + 6 : cut + 16, cx - 30 : cx + 30].reshape(-1, 3).mean(axis=0)
meta = {
    'width': W,
    'height': H,
    'headTop': head_top,
    'cut': cut,
    'cutLeft': int(cut_row.min()),
    'cutRight': int(cut_row.max()),
    'centerX': cx,
    'eyes': args.eyes or round(cut + (cut - head_top) * 0.42),
    'lid': {'x': lid_box[0], 'y': lid_box[1], 'w': lid_box[2] - lid_box[0], 'h': lid_box[3] - lid_box[1]},
    'skin': '#%02x%02x%02x' % tuple(int(v) for v in skin),
}
(ROOT / 'src' / 'data' / 'portrait.json').write_text(json.dumps(meta, indent=2) + '\n')
print('portrait layers written:', json.dumps(meta))
