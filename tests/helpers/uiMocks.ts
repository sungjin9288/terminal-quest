import inquirer from 'inquirer';
import * as display from '../../src/ui/display';

export interface DisplayMockOptions {
  consoleLog?: boolean;
  clearScreen?: boolean;
  showTitle?: boolean;
  showStats?: boolean;
  showMessage?: boolean;
  showLoading?: boolean;
  showBox?: boolean;
  pressEnterToContinue?: boolean;
}

export const DISPLAY_MOCK_PRESETS = {
  townLoop: {
    clearScreen: true,
    showTitle: true,
    showStats: true,
    showMessage: true,
    showLoading: true,
    pressEnterToContinue: true
  },
  playerMenu: {
    clearScreen: true,
    showTitle: true,
    showStats: true,
    showMessage: true,
    pressEnterToContinue: true
  },
  questBoard: {
    clearScreen: true,
    showTitle: true,
    showMessage: true,
    pressEnterToContinue: true
  },
  encounter: {
    clearScreen: true,
    showTitle: true,
    showMessage: true,
    showBox: true,
    pressEnterToContinue: true
  },
  travelFlow: {
    showMessage: true,
    pressEnterToContinue: true
  },
  loadGame: {
    clearScreen: true,
    showTitle: true,
    showMessage: true,
    pressEnterToContinue: true
  },
  saveFlow: {
    clearScreen: true,
    showTitle: true,
    showMessage: true,
    pressEnterToContinue: true
  },
  deathFlow: {
    clearScreen: true,
    showTitle: true,
    showMessage: true,
    pressEnterToContinue: true
  },
  newGameFlow: {
    clearScreen: true,
    showTitle: true,
    showMessage: true,
    showLoading: true,
    showBox: true,
    pressEnterToContinue: true
  },
  mainMenuRuntime: {
    clearScreen: true,
    showTitle: true,
    showMessage: true,
    showBox: true
  },
  shopMenu: {
    clearScreen: true,
    showTitle: true
  }
} as const satisfies Record<string, DisplayMockOptions>;

export type DisplayMockPreset = keyof typeof DISPLAY_MOCK_PRESETS;

export function mockDisplayUi(options: DisplayMockOptions): void {
  const normalized = {
    consoleLog: true,
    ...options
  };

  if (normalized.consoleLog) {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  }
  if (normalized.clearScreen) {
    jest.spyOn(display, 'clearScreen').mockImplementation(() => undefined);
  }
  if (normalized.showTitle) {
    jest.spyOn(display, 'showTitle').mockResolvedValue(undefined);
  }
  if (normalized.showStats) {
    jest.spyOn(display, 'showStats').mockImplementation(() => undefined);
  }
  if (normalized.showMessage) {
    jest.spyOn(display, 'showMessage').mockImplementation(() => undefined);
  }
  if (normalized.showLoading) {
    jest.spyOn(display, 'showLoading').mockResolvedValue(undefined);
  }
  if (normalized.showBox) {
    jest.spyOn(display, 'showBox').mockImplementation(() => undefined);
  }
  if (normalized.pressEnterToContinue) {
    jest.spyOn(display, 'pressEnterToContinue').mockResolvedValue(undefined);
  }
}

export function mockDisplayPreset(preset: DisplayMockPreset): void {
  mockDisplayUi(DISPLAY_MOCK_PRESETS[preset]);
}

export function getPromptMock(): jest.MockedFunction<typeof inquirer.prompt> {
  return jest.mocked(inquirer.prompt);
}

export function mockPromptSequence(
  responses: ReadonlyArray<Record<string, unknown>>,
  reset: boolean = true
): jest.MockedFunction<typeof inquirer.prompt> {
  const promptMock = getPromptMock();
  if (reset) {
    promptMock.mockReset();
  }

  responses.forEach(response => {
    promptMock.mockResolvedValueOnce(response);
  });

  return promptMock;
}
