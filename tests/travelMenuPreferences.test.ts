import './helpers/moduleMocks';
import inquirer from 'inquirer';
import { showTownMenu, showDungeonMenu } from '../src/ui/travel';
import { resetRuntimeSettings } from '../src/runtime/settings';

function getPromptDefaultValue(): string | undefined {
  const promptArg = jest.mocked(inquirer.prompt).mock.calls[0]?.[0] as
    | { default?: string }
    | Array<{ default?: string }>
    | undefined;
  if (!promptArg) {
    return undefined;
  }
  if (Array.isArray(promptArg)) {
    return promptArg[0]?.default;
  }
  return promptArg.default;
}

describe('Travel Menu Preferences', () => {
  beforeEach(() => {
    resetRuntimeSettings({ storage: false });
    jest.mocked(inquirer.prompt).mockReset();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should apply preferred town action as default when available', async () => {
    const promptMock = jest.mocked(inquirer.prompt);
    promptMock.mockResolvedValue({ choice: 'menu' });

    await showTownMenu('Bit Town', true, 'quest');

    expect(getPromptDefaultValue()).toBe('quest');
  });

  it('should ignore preferred town action when unavailable', async () => {
    const promptMock = jest.mocked(inquirer.prompt);
    promptMock.mockResolvedValue({ choice: 'menu' });

    await showTownMenu('Bit Town', false, 'quest');

    expect(getPromptDefaultValue()).toBeUndefined();
  });

  it('should apply preferred dungeon action as default when available', async () => {
    const promptMock = jest.mocked(inquirer.prompt);
    promptMock.mockResolvedValue({ choice: 'menu' });

    await showDungeonMenu('Memory Forest', true, 'rest');

    expect(getPromptDefaultValue()).toBe('rest');
  });

  it('should ignore preferred dungeon action when unavailable', async () => {
    const promptMock = jest.mocked(inquirer.prompt);
    promptMock.mockResolvedValue({ choice: 'menu' });

    await showDungeonMenu('Memory Forest', false, 'rest');

    expect(getPromptDefaultValue()).toBeUndefined();
  });
});
