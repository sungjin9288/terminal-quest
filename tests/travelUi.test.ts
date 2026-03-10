import './helpers/moduleMocks';
import { resetRuntimeSettings } from '../src/runtime/settings';
import { showTravelMenu } from '../src/ui/travel';
import { getPromptMock, mockPromptSequence } from './helpers/uiMocks';

describe('Travel UI', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    resetRuntimeSettings({ storage: false });
  });

  afterEach(() => {
    resetRuntimeSettings({ storage: false });
    jest.restoreAllMocks();
  });

  it('should default to the recommended destination and label first-clear rewards', async () => {
    mockPromptSequence([{ destination: 'cancel' }]);

    await showTravelMenu(
      'bit-town',
      3,
      [],
      [],
      [],
      ['bit-town', 'memory-forest'],
      'memory-forest'
    );

    const promptQuestions = getPromptMock().mock.calls[0][0] as Array<{
      default?: string;
      choices: Array<{ name: string; value: string; disabled?: string }>;
    }>;
    const question = promptQuestions[0];
    const choices = question.choices as Array<{ name: string; value: string; disabled?: string }>;

    expect(question.default).toBe('memory-forest');
    expect(choices.some(choice => String(choice.name).includes('첫 보상'))).toBe(true);

    const logs = (console.log as jest.Mock).mock.calls.map(args => String(args[0] ?? ''));
    expect(logs.some(line => line.includes('추천 목적지'))).toBe(true);
  });

  it('should mark cleared destinations in travel choices', async () => {
    mockPromptSequence([{ destination: 'cancel' }]);

    await showTravelMenu(
      'bit-town',
      7,
      ['memory-leak-titan'],
      [],
      [],
      ['bit-town', 'memory-forest']
    );

    const promptQuestions = getPromptMock().mock.calls[0][0] as Array<{
      default?: string;
      choices: Array<{ name: string; value: string; disabled?: string }>;
    }>;
    const question = promptQuestions[0];
    const choices = question.choices as Array<{ name: string; value: string; disabled?: string }>;

    expect(choices.some(choice => String(choice.name).includes('클리어'))).toBe(true);
  });
});
