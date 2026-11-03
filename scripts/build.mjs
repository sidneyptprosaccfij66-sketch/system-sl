// Build script: esbuild from the preinstalled toolset (npm registry is unavailable here).
import { createRequire } from 'node:module';
import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/opt/npm-tools/node_modules/');
const esbuild = require('esbuild');
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const NODE_PATHS = ['/opt/npm-tools/node_modules'];
const protoArg = process.argv.find((a) => a.startsWith('--proto'));
const proto = Boolean(protoArg);
const protoName = protoArg?.includes('=') ? protoArg.split('=')[1] : '';
const PROTO = protoName
  ? { entry: `prototype-${protoName}/main.tsx`, out: `dist-proto-${protoName}`, title: 'THE SYSTEM Holo' }
  : { entry: 'prototype/main.tsx', out: 'dist-proto', title: 'Прототип THE SYSTEM' };
const dev = process.argv.includes('--dev');

const common = {
  bundle: true,
  format: 'esm',
  target: ['es2022', 'safari16'],
  nodePaths: NODE_PATHS,
  external: ['https://*'],
  jsx: 'automatic',
  minify: !dev,
  sourcemap: dev ? 'inline' : false,
  define: { 'process.env.NODE_ENV': JSON.stringify(dev ? 'development' : 'production') },
  loader: { '.woff': 'file', '.woff2': 'file', '.svg': 'file', '.png': 'file' },
  logLevel: 'warning',
  absWorkingDir: root,
};

async function buildApp() {
  const out = path.join(root, 'dist');
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await cp(path.join(root, 'public'), out, { recursive: true });
  const entryPoints = { app: 'src/main.tsx' };
  if (existsSync(path.join(root, 'src/probe.tsx'))) entryPoints.probe = 'src/probe.tsx';
  await esbuild.build({ ...common, entryPoints, outdir: out, assetNames: 'assets/[name]-[hash]' });
  const version = Date.now().toString(36);
  const swPath = path.join(out, 'sw.js');
  if (existsSync(swPath)) {
    await writeFile(swPath, (await readFile(swPath, 'utf8')).replaceAll('__BUILD__', version));
  }
  console.log(`built dist/ (version ${version})`);
}

async function buildProto() {
  const out = path.join(root, PROTO.out);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const res = await esbuild.build({
    ...common,
    entryPoints: [PROTO.entry],
    write: false,
    outdir: out,
    loader: { ...common.loader, '.woff': 'dataurl', '.woff2': 'dataurl' },
  });
  const js = res.outputFiles.find((f) => f.path.endsWith('.js')).text;
  const css = res.outputFiles.find((f) => f.path.endsWith('.css'))?.text ?? '';
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${PROTO.title}</title><style>${css}</style></head>
<body><div id="root"></div><script type="module">${js.replaceAll('</script', '<\\/script')}</script></body></html>`;
  await writeFile(path.join(out, 'index.html'), html);
  // Artifact variant: the host wraps the page in its own skeleton.
  const fragment = `<title>${PROTO.title}</title>
<style>:root{color-scheme:dark}${css}</style>
<div id="root"></div><script type="module">${js.replaceAll('</script', '<\\/script')}</script>`;
  await writeFile(path.join(out, 'artifact.html'), fragment);
  console.log(`built ${PROTO.out}/index.html (${(html.length / 1024).toFixed(0)} KB)`);
}

await (proto ? buildProto() : buildApp());
