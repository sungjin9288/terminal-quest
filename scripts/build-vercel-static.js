import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { generateBrowserData } from './generate-browser-data.js';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createAliasPlugin(rootDir) {
  const aliases = new Map([
    ['../data/locations.js', path.join(rootDir, 'src', 'browser', 'data', 'locations.js')],
    ['../data/items.js', path.join(rootDir, 'src', 'browser', 'data', 'items.js')],
    ['../data/monsters.js', path.join(rootDir, 'src', 'browser', 'data', 'monsters.js')],
    ['../systems/shop.js', path.join(rootDir, 'src', 'browser', 'systems', 'shop.js')],
    ['./shop.js', path.join(rootDir, 'src', 'browser', 'systems', 'shop.js')],
    ['../systems/save.js', path.join(rootDir, 'src', 'browser', 'systems', 'save.js')],
    ['../systems/telemetry.js', path.join(rootDir, 'src', 'browser', 'systems', 'telemetry.js')],
    ['./telemetry.js', path.join(rootDir, 'src', 'browser', 'systems', 'telemetry.js')],
    ['./presentationText.js', path.join(rootDir, 'src', 'browser', 'frontend', 'presentationText.js')]
  ]);

  return {
    name: 'browser-alias',
    setup(buildRef) {
      for (const [requestPath, replacement] of aliases.entries()) {
        buildRef.onResolve({ filter: new RegExp(`^${escapeRegExp(requestPath)}$`) }, () => ({
          path: replacement
        }));
      }
    }
  };
}

async function main() {
  const rootDir = process.cwd();
  const outputDir = path.join(rootDir, 'vercel-dist');

  await generateBrowserData();

  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });
  cpSync(path.join(rootDir, 'frontend'), outputDir, { recursive: true });

  await build({
    entryPoints: [path.join(rootDir, 'src', 'browser', 'runtime-adapter-entry.js')],
    outfile: path.join(outputDir, 'runtime-adapter.js'),
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: ['es2022'],
    plugins: [createAliasPlugin(rootDir)]
  });

  if (existsSync(path.join(outputDir, 'index.html'))) {
    cpSync(path.join(outputDir, 'index.html'), path.join(outputDir, '404.html'));
  }

  writeFileSync(
    path.join(outputDir, '.vercel-build-meta.json'),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      runtime: 'browser-local-storage',
      outputDirectory: 'vercel-dist'
    }, null, 2),
    'utf-8'
  );

  console.log('[vercel-build] static bundle ready at vercel-dist/');
}

await main();
