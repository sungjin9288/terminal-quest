import fs from 'fs';

interface SaveSlotSandboxOptions {
  saveDir: string;
  slotFilePath: string;
}

export function setupIsolatedSaveSlot({
  saveDir,
  slotFilePath
}: SaveSlotSandboxOptions): void {
  let slotBackup: string | null = null;

  beforeAll(() => {
    fs.mkdirSync(saveDir, { recursive: true });

    if (fs.existsSync(slotFilePath)) {
      slotBackup = fs.readFileSync(slotFilePath, 'utf-8');
    }
  });

  beforeEach(() => {
    if (fs.existsSync(slotFilePath)) {
      fs.unlinkSync(slotFilePath);
    }
  });

  afterAll(() => {
    if (slotBackup !== null) {
      fs.writeFileSync(slotFilePath, slotBackup, 'utf-8');
      return;
    }

    if (fs.existsSync(slotFilePath)) {
      fs.unlinkSync(slotFilePath);
    }
  });
}
