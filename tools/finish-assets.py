from PIL import Image,ImageDraw,ImageOps
from pathlib import Path
root=Path(__file__).resolve().parents[1];p=root.parent/'steins-probe';o=root/'src/common'
title=Image.open(p/'TITLE_CHIP.DDS').convert('RGB').crop((0,0,1920,1080));title.thumbnail((432,286),Image.Resampling.LANCZOS);title.save(o/'title_bg.png',optimize=True)
portrait=Image.open(o/'images/p0_1.png').convert('RGBA');portrait=ImageOps.fit(portrait,(192,192),method=Image.Resampling.LANCZOS,centering=(0.5,0))
icon=Image.new('RGBA',(192,192),'#152a42');icon.alpha_composite(portrait);mask=Image.new('L',(192,192));ImageDraw.Draw(mask).ellipse((0,0,191,191),fill=255);icon.putalpha(mask);icon.save(o/'logo.png',optimize=True)
