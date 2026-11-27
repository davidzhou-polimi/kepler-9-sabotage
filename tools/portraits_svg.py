#!/usr/bin/env python3
"""Write the crew portraits as SVG: img/crew/<name>.png -> img/crew/svg/<name>.svg.

The PNGs made by tools/portraits.py are true pixel art, every cell SCALE x SCALE pixels. Each SVG has one unit per
cell (viewBox 0 0 76 95) and one path per colour, made of the horizontal runs of that colour: the same picture,
cell for cell, at any size. shape-rendering="crispEdges" keeps the edges sharp.

Usage: python3 tools/portraits_svg.py        (needs Pillow and numpy)
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'img' / 'crew'
OUT = SRC / 'svg'
NAMES = ['hana', 'doyun', 'mira', 'echo']
SCALE = 6


def svg(cells):
    rows, cols = cells.shape[:2]
    paths = {}
    for y in range(rows):
        x = 0
        while x < cols:
            c = tuple(cells[y, x])
            end = x + 1
            while end < cols and tuple(cells[y, end]) == c:
                end += 1
            if c[3] > 0:
                paths.setdefault(c, []).append(f'M{x} {y}h{end - x}v1h-{end - x}z')
            x = end
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {cols} {rows}" '
           f'width="{cols * SCALE}" height="{rows * SCALE}" shape-rendering="crispEdges">']
    for c, d in paths.items():
        op = '' if c[3] == 255 else f' fill-opacity="{c[3] / 255:.3f}"'
        out.append(f'<path fill="#{c[0]:02x}{c[1]:02x}{c[2]:02x}"{op} d="{"".join(d)}"/>')
    out.append('</svg>\n')
    return '\n'.join(out)


def main():
    OUT.mkdir(exist_ok=True)
    for n in NAMES:
        a = np.array(Image.open(SRC / f'{n}.png').convert('RGBA'))
        cells = a[::SCALE, ::SCALE]
        assert (np.repeat(np.repeat(cells, SCALE, 0), SCALE, 1) == a).all(), f'{n}: not a {SCALE} px grid'
        (OUT / f'{n}.svg').write_text(svg(cells))
        print(n, (OUT / f'{n}.svg').stat().st_size, 'bytes')


if __name__ == '__main__':
    main()
