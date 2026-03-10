import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REQUIRED_FILES = [
  'index.html',
  '404.html',
  'app.js',
  'styles.css',
  'runtime-adapter.js'
];

function assertExists(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`missing static artifact: ${path.relative(process.cwd(), filePath)}`);
  }
}

function verifyHtmlEntry(outputDir) {
  const indexHtmlPath = path.join(outputDir, 'index.html');
  const html = readFileSync(indexHtmlPath, 'utf-8');

  if (!html.includes('/runtime-adapter.js')) {
    throw new Error('index.html is missing runtime-adapter.js entry');
  }

  if (!html.includes('/app.js')) {
    throw new Error('index.html is missing app.js entry');
  }
}

async function verifyRuntimeAdapter(outputDir) {
  globalThis.window = globalThis;

  const adapterModuleUrl = `${pathToFileURL(path.join(outputDir, 'runtime-adapter.js')).href}?t=${Date.now()}`;
  await import(adapterModuleUrl);
  const adapter = globalThis.__TERMINAL_QUEST_RUNTIME_ADAPTER__;

  if (!adapter || typeof adapter.getState !== 'function' || typeof adapter.performAction !== 'function') {
    throw new Error('runtime adapter did not register browser bridge methods');
  }

  const initialState = await adapter.getState();
  if (initialState.activeSaveDirectory !== 'browser://localStorage') {
    throw new Error(`unexpected active save directory: ${initialState.activeSaveDirectory}`);
  }

  await adapter.performAction({
    type: 'new-game',
    name: 'StaticSmoke',
    characterClass: 'Warrior',
    gameMode: 'adventure'
  });
  const afterSave = await adapter.performAction({
    type: 'save-game',
    slotNumber: 1
  });

  if (!afterSave.saves?.[0]?.exists) {
    throw new Error('static runtime failed to persist slot 1 save metadata');
  }
}

async function main() {
  const outputDir = path.join(process.cwd(), 'vercel-dist');

  for (const fileName of REQUIRED_FILES) {
    assertExists(path.join(outputDir, fileName));
  }

  verifyHtmlEntry(outputDir);
  await verifyRuntimeAdapter(outputDir);

  console.log('[vercel-static-check] PASS: static browser deployment bundle verified.');
}

await main();
