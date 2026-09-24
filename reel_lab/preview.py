"""python preview.py c_signal 1.5 4 9 13 → out/preview_c_signal.jpg (한 장에 여러 시점)"""
import sys, importlib, numpy as np
from PIL import Image
mod = importlib.import_module(sys.argv[1])
ts = [float(x) for x in sys.argv[2:]]
tiles = []
for t in ts:
    f = mod.frame(t, int(t * 30))
    tiles.append(Image.fromarray((np.clip(f, 0, 1) * 255).astype(np.uint8)).resize((800, 450)))
cols = 2; rows = (len(tiles) + 1) // 2
sheet = Image.new("RGB", (800 * cols + 10, 460 * rows), "red")
for k, im in enumerate(tiles): sheet.paste(im, ((k % cols) * 810, (k // cols) * 460))
p = f"out/preview_{sys.argv[1]}.jpg"; sheet.save(p, quality=85); print(p)
