import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const ENTRY_PATH = path.join(process.cwd(), 'dist', 'index.js');
const EXIT_MENU_INPUT = '\u001b[B\u001b[B\u001b[B\n';
const REQUIRED_PHRASES = [
  '터미널 기반 RPG 어드벤처',
  '무엇을 하시겠습니까?',
  '터미널 퀘스트를 플레이해주셔서 감사합니다!',
  '다음 모험이 당신을 기다리고 있습니다...'
];

function fail(message) {
  console.error(`[package-launch-check] FAIL: ${message}`);
  process.exit(1);
}

function main() {
  if (!fs.existsSync(ENTRY_PATH)) {
    fail('dist/index.js not found. run `npm run build` first.');
  }

  const result = spawnSync('node', [ENTRY_PATH], {
    encoding: 'utf-8',
    input: EXIT_MENU_INPUT,
    env: process.env
  });

  if (result.status !== 0) {
    fail(`process exited with status=${result.status ?? 1}`);
  }

  const stdout = result.stdout ?? '';
  const stderr = (result.stderr ?? '').trim();
  if (stderr.length > 0) {
    fail(`unexpected stderr output detected:\n${stderr}`);
  }

  const missingPhrases = REQUIRED_PHRASES.filter((phrase) => !stdout.includes(phrase));
  if (missingPhrases.length > 0) {
    fail(`missing expected output: ${missingPhrases.join(' | ')}`);
  }

  console.log('[package-launch-check] PASS: package launch probe completed.');
}

main();
