import './helpers/moduleMocks';
import inquirer from 'inquirer';
import { pressEnterToContinue } from '../src/ui/display';
import { resetRuntimeSettings, updateRuntimeSettings } from '../src/runtime/settings';

function getNewTimeoutDelays(
  timeoutSpy: jest.SpyInstance,
  startIndex: number
): number[] {
  return timeoutSpy.mock.calls
    .slice(startIndex)
    .map((call) => call[1])
    .filter((delay): delay is number => typeof delay === 'number');
}

describe('Continue Prompt Behavior', () => {
  afterEach(() => {
    jest.useRealTimers();
    resetRuntimeSettings();
    jest.restoreAllMocks();
  });

  it('should auto-continue in streamlined mode for normal priority', async () => {
    jest.useFakeTimers();
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    const promptMock = jest.mocked(inquirer.prompt);
    promptMock.mockReset();

    updateRuntimeSettings(
      {
        continuePromptMode: 'streamlined',
        continueAutoPace: 'balanced',
        textSpeed: 'normal'
      },
      { storage: false }
    );

    const startIndex = timeoutSpy.mock.calls.length;
    const pending = pressEnterToContinue('normal');
    const delays = getNewTimeoutDelays(timeoutSpy, startIndex);

    expect(delays).toContain(260);
    expect(promptMock).not.toHaveBeenCalled();

    await jest.runOnlyPendingTimersAsync();
    await pending;
    expect(promptMock).not.toHaveBeenCalled();
  });

  it('should use longer delay for important priority in streamlined mode', async () => {
    jest.useFakeTimers();
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    const promptMock = jest.mocked(inquirer.prompt);
    promptMock.mockReset();

    updateRuntimeSettings(
      {
        continuePromptMode: 'streamlined',
        continueAutoPace: 'balanced',
        textSpeed: 'normal'
      },
      { storage: false }
    );

    const startIndex = timeoutSpy.mock.calls.length;
    const pending = pressEnterToContinue('important');
    const delays = getNewTimeoutDelays(timeoutSpy, startIndex);

    expect(delays).toContain(429);
    expect(promptMock).not.toHaveBeenCalled();

    await jest.runOnlyPendingTimersAsync();
    await pending;
    expect(promptMock).not.toHaveBeenCalled();
  });

  it('should require explicit Enter for critical priority even in streamlined mode', async () => {
    const promptMock = jest.mocked(inquirer.prompt);
    promptMock.mockReset();
    promptMock.mockResolvedValue({ continue: '' });

    updateRuntimeSettings(
      {
        continuePromptMode: 'streamlined',
        continueAutoPace: 'snappy',
        textSpeed: 'fast'
      },
      { storage: false }
    );

    await pressEnterToContinue('critical');
    expect(promptMock).toHaveBeenCalledTimes(1);
  });

  it('should require explicit Enter in classic mode for normal priority', async () => {
    const promptMock = jest.mocked(inquirer.prompt);
    promptMock.mockReset();
    promptMock.mockResolvedValue({ continue: '' });

    updateRuntimeSettings(
      {
        continuePromptMode: 'classic',
        continueAutoPace: 'snappy',
        textSpeed: 'fast'
      },
      { storage: false }
    );

    await pressEnterToContinue('normal');
    expect(promptMock).toHaveBeenCalledTimes(1);
  });
});
