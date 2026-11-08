"""Recompose the EXIT lettering from the existing Steam title menu crops."""
from pathlib import Path
from statistics import median
from PIL import Image

ui = Path(__file__).resolve().parents[1] / 'src/common/ui'
extra = Image.open(ui / 'extra.png').convert('RGBA')
config = Image.open(ui / 'config.png').convert('RGBA')
result = extra.copy()
background = []
for y in range(extra.height):
    # Retain the original bar, rounded edges and horizontal texture.
    samples = [extra.getpixel((x, y)) for x in range(15, 127)]
    plate = [p for p in samples if p[3] >= 250 and max(p[:3]) < 195]
    rgb = tuple(round(median(p[i] for p in plate)) for i in range(3)) if plate else (151, 147, 107)
    background.append(rgb)
    for x in range(14, 128):
        r, g, b, a = extra.getpixel((x, y))
        if max(r, g, b) >= 195:
            result.putpixel((x, y), (*rgb, a))

# The title atlas has no EXIT cell. Use the actual E and X from EXTRA, I
# from CONFIG, and T from EXTRA; infer coverage from the blue channel
# to remove the olive plate behind the letters before recomposing.
glyphs = ((extra, 14, 34), (extra, 35, 59), (config, 98, 108), (extra, 59, 82))
x_out = 24
for source, left, right in glyphs:
    for y in range(2, 30):
        base = background[y][2]
        for x in range(left, right):
            r, g, b, a = source.getpixel((x, y))
            if a < 245 or b < base + 30:
                continue
            coverage = min(1, (b - base) / (255 - base))
            point = (x_out + x - left, y)
            target = result.getpixel(point)
            rgb = tuple(round(c + coverage * (255 - c)) for c in target[:3])
            result.putpixel(point, (*rgb, target[3]))
    x_out += right - left + 2

result.save(ui / 'exit.png', optimize=True)
