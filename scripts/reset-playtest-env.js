import fs from 'fs';
import { getPlaytestPaths } from './playtest-common.js';

function main() {
  const paths = getPlaytestPaths(process.cwd());
  fs.rmSync(paths.baseDir, { recursive: true, force: true });
  console.log(`[playtest-reset] Removed ${paths.baseDir}`);
}

main();
