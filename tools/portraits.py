#!/usr/bin/env python3
"""Turn the crew portraits into true pixel art.

The portraits of the group are pixel-style pictures saved as JPEG: their "pixels" are soft, not all the same
size, and the cut-outs have dark lines along some edges (measured 2026-11-24: no period between 3.5 and 16 px
puts more than 1.8 times the average colour edges on its lines; a real grid gives several times that). The
distances between colour edges say the drawings were made about 80 cells wide and 100 tall.

What this does, for each picture in reference/portraits/:
1. Trims the outer lines of the cut-out (TRIM px on each side).
2. Lays a grid of about COLS cells across the width: the cell size and the offset are the ones, near that size,
   that put most colour edges on the grid lines.
3. Each cell takes the median colour of its inner pixels (the pixels on its border are blends of two cells).
4. One palette for the four portraits: the main colours by amount (k-means in Lab), plus the accents, small and
   far from every main colour (the red cross, the cyan eyes, the gold hair tie). Each cell goes to the nearest one.
5. Isolated cells are redrawn as their neighbours when the colour is close (the JPEG leaves stray cells on flat
   areas), but never when it is a different colour: small things stay.
6. Cuts every portrait to the same OUT_COLS x OUT_ROWS cells around its centre and writes img/crew/<name>.png
   with every cell as SCALE x SCALE pixels: exact squares, no blur.

Same method as the sprite pipeline of another project of ours (grid, median per cell, palette with accents).

Usage: python3 tools/portraits.py            (needs Pillow, numpy and scipy)
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.cluster.vq import kmeans2

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'reference' / 'portraits'
OUT = ROOT / 'img' / 'crew'
NAMES = ['hana', 'doyun', 'mira', 'echo']
TRIM = 4          # px cut from each side of the source: the dark lines of the cut-outs are 1 or 2 px
COLS = 80         # cells across the trimmed width, give or take a few per cent
SCALE = 6         # output pixels per cell: large enough that a screen always scales the picture down
OUT_COLS, OUT_ROWS = 76, 95   # every portrait comes out with the same cells, 4:5, cut around the centre
N_MAIN, N_ACCENT = 44, 14
FAR = 11.0        # how far (in Lab) a colour must be from every main colour to be an accent
CLOSE = 9.0       # an isolated cell this close (in Lab) to its neighbours' colour is noise


def lab(rgb):
    c = np.asarray(rgb, float) / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ m.T / np.array([0.95047, 1, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def score(profile, p):
    """How many colour edges fall on the lines of a grid of period p, with its best offset."""
    best = (-1.0, 0.0)
    for f in np.arange(0, p, 0.25):
        idx = np.round(np.arange(f, len(profile) - 1, p)).astype(int)
        v = profile[idx].sum() / len(idx)
        if v > best[0]:
            best = (v, f)
    return best


def cells_of(im):
    h, w, _ = im.shape
    ex = np.abs(np.diff(im, axis=1)).sum(2).astype(float); ex[ex < 60] = 0
    ey = np.abs(np.diff(im, axis=0)).sum(2).astype(float); ey[ey < 60] = 0
    px_, py_ = ex.sum(0), ey.sum(1)
    nominal = w / COLS
    tries = [(score(px_, q), score(py_, q), q) for q in np.arange(nominal * 0.96, nominal * 1.04, 0.01)]
    (sx, fx), (sy, fy), p = max(tries, key=lambda t: t[0][0] / px_.mean() + t[1][0] / py_.mean())
    xs = np.arange(fx + 1 - p, w + p, p)
    ys = np.arange(fy + 1 - p, h + p, p)
    xs = xs[(xs >= -0.5) & (xs <= w + 0.5)]; ys = ys[(ys >= -0.5) & (ys <= h + 0.5)]  # whole cells only
    nx, ny = len(xs) - 1, len(ys) - 1
    out = np.zeros((ny, nx, 3), np.uint8)
    for j in range(ny):
        y0, y1 = int(round(ys[j])), int(round(ys[j + 1]))
        for i in range(nx):
            x0, x1 = int(round(xs[i])), int(round(xs[i + 1]))
            block = im[min(y0 + 1, y1 - 1):max(y0 + 2, y1 - 1), min(x0 + 1, x1 - 1):max(x0 + 2, x1 - 1)].reshape(-1, 3)
            out[j, i] = np.median(block, axis=0)
    return out, p, (sx / px_.mean(), sy / py_.mean())


def palette_of(all_cells):
    colours, counts = np.unique(all_cells.reshape(-1, 3), axis=0, return_counts=True)
    L = lab(colours)
    # each colour weighs the square root of its cells, or the large flat areas take every slot
    centres, _ = kmeans2(np.repeat(L, np.ceil(np.sqrt(counts)).astype(int), axis=0), N_MAIN, minit='++', seed=1, iter=60)
    far = np.sqrt(((L[:, None] - centres[None]) ** 2).sum(-1)).min(1)
    chroma = np.sqrt(L[:, 1] ** 2 + L[:, 2] ** 2)
    accents = []
    for k in np.argsort(-(far * (1 + chroma / 40))):
        if len(accents) >= N_ACCENT:
            break
        if far[k] >= FAR and all(np.sqrt(((L[k] - a) ** 2).sum()) > FAR for a in accents):
            accents.append(L[k])
    pal_lab = np.vstack([centres] + ([np.array(accents)] if accents else []))
    # every palette entry is a colour that exists in the cells: the nearest one to its centre
    near = np.sqrt(((L[None] - pal_lab[:, None]) ** 2).sum(-1)).argmin(1)
    pal = np.unique(colours[near], axis=0)
    return pal, lab(pal)


def to_palette(cells, pal, pal_lab):
    L = lab(cells.reshape(-1, 3))
    idx = np.sqrt(((L[:, None] - pal_lab[None]) ** 2).sum(-1)).argmin(1)
    return idx.reshape(cells.shape[:2])


def clean(idx, pal_lab):
    """A cell with no neighbour of its colour takes the commonest colour around it, if the two are close."""
    out = idx.copy()
    h, w = idx.shape
    for y in range(h):
        for x in range(w):
            around = [idx[j, i] for j, i in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)) if 0 <= j < h and 0 <= i < w]
            if idx[y, x] in around:
                continue
            vals, cnt = np.unique(around, return_counts=True)
            top = vals[cnt.argmax()]
            if cnt.max() >= 2 and np.sqrt(((pal_lab[idx[y, x]] - pal_lab[top]) ** 2).sum()) < CLOSE:
                out[y, x] = top
    return out


def main():
    grids = {}
    for name in NAMES:
        im = np.array(Image.open(SRC / f'{name}.jpg').convert('RGB')).astype(int)[TRIM:-TRIM, TRIM:-TRIM]
        grids[name], p, (sx, sy) = cells_of(im)
        print(f'{name}: source {im.shape[1]}x{im.shape[0]} after the trim, cell {p:.2f} px, '
              f'{grids[name].shape[1]}x{grids[name].shape[0]} cells, edges on the lines x{sx:.2f} / x{sy:.2f}')
    pal, pal_lab = palette_of(np.vstack([g.reshape(-1, 3) for g in grids.values()]))
    print(f'palette: {len(pal)} colours')
    OUT.mkdir(parents=True, exist_ok=True)
    flat = np.zeros(768, np.uint8); flat[:len(pal) * 3] = pal.reshape(-1)
    for name, g in grids.items():
        idx = clean(to_palette(g, pal, pal_lab), pal_lab)
        y0, x0 = (idx.shape[0] - OUT_ROWS) // 2, (idx.shape[1] - OUT_COLS) // 2
        idx = idx[y0:y0 + OUT_ROWS, x0:x0 + OUT_COLS]
        img = Image.fromarray(idx.astype(np.uint8), 'P')
        img.putpalette(flat.tolist())
        img.resize((idx.shape[1] * SCALE, idx.shape[0] * SCALE), Image.NEAREST).save(OUT / f'{name}.png', optimize=True)
        print(f'{name}: {idx.shape[1] * SCALE}x{idx.shape[0] * SCALE} px, {len(np.unique(idx))} colours used')


if __name__ == '__main__':
    sys.exit(main())
