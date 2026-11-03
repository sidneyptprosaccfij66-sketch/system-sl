// Generates PWA icons with sharp (preinstalled).
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const sharp = require('sharp');
const svg = (s) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#05070d"/>
<defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter></defs>
<path d="M156 116h200l40 40v200l-40 40H156l-40-40V156z" fill="none" stroke="#4cc3ff" stroke-width="10" filter="url(#g)" opacity=".7"/>
<path d="M156 116h200l40 40v200l-40 40H156l-40-40V156z" fill="rgba(12,22,44,.9)" stroke="#4cc3ff" stroke-width="6"/>
<path d="M318 190c-12-22-36-34-62-34-36 0-62 20-62 48 0 62 128 38 128 100 0 30-28 52-66 52-30 0-56-14-68-38" fill="none" stroke="#e6f1ff" stroke-width="22" stroke-linecap="square"/>
</svg>`);
for (const s of [192, 512]) await sharp(svg(s)).png().toFile(`public/icons/icon-${s}.png`);
console.log('icons ok');
