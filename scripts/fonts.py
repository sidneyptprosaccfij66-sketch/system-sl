"""Subset fonts from a google/fonts sparse checkout into public/fonts/*.woff.
Usage: python3 -I scripts/fonts.py <google-fonts-checkout> <out-dir>"""
import sys, pathlib
from fontTools import subset
from fontTools.ttLib import TTFont

SRC, OUT = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
UNICODES = "U+0020-007E,U+00A0-00FF,U+0400-045F,U+2116,U+2013,U+2014,U+00AB,U+00BB,U+2026,U+2192,U+2190,U+2022,U+00B7,U+2212,U+00D7,U+2713,U+26A0"
FONTS = {
    "oxanium": "ofl/oxanium/Oxanium[wght].ttf",
    "tektur": "ofl/tektur/Tektur[wdth,wght].ttf",
    "unbounded": "ofl/unbounded/Unbounded[wght].ttf",
    "onest": "ofl/onest/Onest[wght].ttf",
    "manrope": "ofl/manrope/Manrope[wght].ttf",
    "jetbrainsmono": "ofl/jetbrainsmono/JetBrainsMono[wght].ttf",
    "jost": "ofl/jost/Jost[wght].ttf",
    "chakrapetch-400": "ofl/chakrapetch/ChakraPetch-Regular.ttf",
    "chakrapetch-600": "ofl/chakrapetch/ChakraPetch-SemiBold.ttf",
    "chakrapetch-700": "ofl/chakrapetch/ChakraPetch-Bold.ttf",
}
OUT.mkdir(parents=True, exist_ok=True)
for name, rel in FONTS.items():
    font = TTFont(SRC / rel)
    cmap = font.getBestCmap()
    cyr = sum(1 for c in range(0x410, 0x450) if c in cmap)
    opts = subset.Options()
    opts.flavor = "woff"
    opts.layout_features = ["*"]
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=subset.parse_unicodes(UNICODES))
    sub.subset(font)
    dest = OUT / f"{name}.woff"
    font.flavor = "woff"
    font.save(dest)
    print(f"{name:18} cyrillic {cyr:2}/64  {dest.stat().st_size//1024} KB")
