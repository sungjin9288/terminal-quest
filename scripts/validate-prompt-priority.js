import fs from 'fs';
import path from 'path';

const SOURCE_ROOT = path.join(process.cwd(), 'src');
const TARGET_EXTENSION = '.ts';
const DISALLOWED_PATTERN = /pressEnterToContinue\s*\(\s*\)/g;

function listSourceFiles(directoryPath) {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith(TARGET_EXTENSION)) {
      files.push(fullPath);
    }
  }

  return files;
}

function scanForBarePromptCalls(filePath) {
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  const violations = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (DISALLOWED_PATTERN.test(line)) {
      violations.push({
        filePath,
        lineNumber: index + 1,
        line
      });
    }
    DISALLOWED_PATTERN.lastIndex = 0;
  }

  return violations;
}

function main() {
  if (!fs.existsSync(SOURCE_ROOT)) {
    console.error('[prompt-priority-check] src directory not found.');
    process.exit(1);
  }

  const sourceFiles = listSourceFiles(SOURCE_ROOT);
  const violations = sourceFiles.flatMap(scanForBarePromptCalls);

  if (violations.length > 0) {
    console.error(
      `[prompt-priority-check] Found ${violations.length} bare pressEnterToContinue() call(s).`
    );
    console.error(
      '[prompt-priority-check] Pass an explicit priority: normal / important / critical.'
    );
    for (const violation of violations) {
      const relativePath = path.relative(process.cwd(), violation.filePath);
      console.error(
        `- ${relativePath}:${violation.lineNumber} -> ${violation.line.trim()}`
      );
    }
    process.exit(1);
  }

  console.log(
    `[prompt-priority-check] PASS: ${sourceFiles.length} source file(s) scanned, no bare calls found.`
  );
}

main();
