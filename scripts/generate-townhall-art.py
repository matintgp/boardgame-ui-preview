"""Generate fifteen original illustrated-role card assets from the project's existing licensed demo portraits.
Deliberately does NOT reproduce the copyrighted physical Salem Town Hall illustrations.
"""
from __future__ import annotations
from PIL import Image, ImageOps, ImageEnhance, ImageDraw, ImageFilter
from pathlib import Path
import hashlib, math

ASSETS=Path(__file__).resolve().parents[1]/'salem'/'assets'
SOURCE=ASSETS/'portraits'
TARGET=ASSETS/'townhall-art'
TARGET.mkdir(exist_ok=True,parents=True)
W,H=470,660
cards=[
('abigail',1,(203,154,98)),('ann',7,(188,133,115)),('cotton',4,(171,138,91)),
('giles',5,(171,121,83)),('george',6,(113,139,172)),('john',6,(174,123,76)),
('martha',3,(144,153,125)),('mary',2,(192,153,112)),('rebecca',3,(185,145,95)),
('samuel',4,(143,153,183)),('sarah',8,(154,116,94)),('thomas',5,(180,142,113)),
('tituba',2,(194,136,73)),('will',1,(132,164,155)),('william',6,(199,158,90))
]
def color_blend(image,shade,weight):
    solid=Image.new('RGB',image.size,shade)
    return Image.blend(image,solid,weight)
for i,(key,source_index,palette) in enumerate(cards):
    art=Image.open(SOURCE/f'portrait-{source_index}.webp').convert('RGB')
    seed=int.from_bytes(hashlib.sha256(key.encode()).digest()[:4],'big')
    # Composition: portrait first, never crop the head. Each crop/palette/motif differs.
    shifted=.43 + ((seed%17)-8)*.006
    photo=ImageOps.fit(art,(W-68,H-126),method=Image.Resampling.LANCZOS,centering=(max(.3,min(.62,shifted)),.29))
    photo=ImageEnhance.Contrast(photo).enhance(1.10)
    photo=ImageEnhance.Color(photo).enhance(.74+(i%3)*.1)
    photo=color_blend(photo,palette,.08+(i%4)*.025)
    base=Image.new('RGB',(W,H),(8,15,22))
    backdrop=photo.resize((W,H),Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(28))
    backdrop=color_blend(backdrop,(8,13,21),.63)
    base.paste(backdrop,(0,0))
    drawn=ImageDraw.Draw(base,'RGBA')
    # Metallic outer rim and historical engraved ornamentation.
    drawn.rounded_rectangle((12,12,W-12,H-12),radius=35,fill=(8,15,22,230),outline=(*palette,214),width=4)
    drawn.rounded_rectangle((21,21,W-21,H-21),radius=30,outline=(231,195,127,92),width=2)
    mask=Image.new('L',photo.size,0);md=ImageDraw.Draw(mask)
    md.rounded_rectangle((0,0,photo.width-1,photo.height-1),radius=24,fill=255)
    x,y=34,38
    base.paste(photo,(x,y),mask)
    glow=Image.new('RGBA',(W,H),(0,0,0,0));gd=ImageDraw.Draw(glow,'RGBA')
    for j in range(50,0,-1):
        strength=int((1-j/50)*3.5)
        gd.ellipse((W//2-190-j,285-j//2,W//2+190+j,650+j),outline=(0,0,0,strength),width=3)
    gd.rectangle((x,y+photo.height-160,x+photo.width,y+photo.height),fill=(8,13,22,70))
    base=Image.alpha_composite(base.convert('RGBA'),glow)
    d=ImageDraw.Draw(base,'RGBA')
    # Fine filigree and lower crest; composition varies with role seed.
    for a in range(2):
        yy=565 + a*13
        d.arc((50,yy-20,W-50,yy+42),3,177,fill=(*palette,155),width=2)
    d.line((70,608,W-70,608),fill=(*palette,145),width=2)
    d.ellipse((W//2-17,593,W//2+17,627),fill=(13,23,33,232),outline=(*palette,235),width=2)
    d.line((W//2,599,W//2,621),fill=(*palette,230),width=2)
    d.line((W//2-11,610,W//2+11,610),fill=(*palette,230),width=2)
    for xx in (37,W-37):
        for yy in (39,527):
            d.arc((xx-12,yy-12,xx+12,yy+12),30,270,fill=(*palette,190),width=2)
    # Distinct small star constellations, decorative, not culturally specific.
    for k in range(5):
        xx=48+(seed//(k+1)+k*137)%(W-96)
        yy=540+(seed//(k+4))%29
        d.ellipse((xx,yy,xx+2,yy+2),fill=(*palette,160))
    # Write original role art; UI overlays the character's name and actual power.
    output=TARGET/f'{key}.webp'
    base.convert('RGB').save(output,'WEBP',quality=79,method=6)
    assert output.stat().st_size>15000
    print(f'{key}: {output.stat().st_size} bytes')
