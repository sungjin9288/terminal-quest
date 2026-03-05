import './helpers/moduleMocks';
import { showBox, showStats, showTitle } from '../src/ui/display';
import { createTestPlayer } from './helpers/gameStateFactory';

describe('Display Responsive Layout', () => {
  const originalColumns = Object.getOwnPropertyDescriptor(process.stdout, 'columns');

  function setTerminalColumns(columns: number): void {
    Object.defineProperty(process.stdout, 'columns', {
      configurable: true,
      value: columns
    });
  }

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalColumns) {
      Object.defineProperty(process.stdout, 'columns', originalColumns);
    }
  });

  it('should render a compact title when terminal width is narrow', async () => {
    setTerminalColumns(60);

    await showTitle();

    const logs = (console.log as jest.Mock).mock.calls.map(args => String(args[0] ?? ''));
    expect(logs.some(line => line.includes('Terminal Quest'))).toBe(true);
  });

  it('should wrap box content within terminal width', () => {
    setTerminalColumns(40);

    showBox(
      '이 문장은 좁은 터미널에서 자동 줄바꿈이 되어야 하며 테두리를 넘기면 안 됩니다.',
      '안내'
    );

    const logs = (console.log as jest.Mock).mock.calls.map(args => String(args[0] ?? ''));
    const frameLines = logs.filter(line => line.startsWith('┌') || line.startsWith('├') || line.startsWith('│') || line.startsWith('└'));

    expect(frameLines.length).toBeGreaterThan(0);
    expect(frameLines.every(line => line.length <= 40)).toBe(true);
  });

  it('should render compact stats instead of wide tables on narrow terminals', () => {
    setTerminalColumns(60);

    const player = createTestPlayer({
      name: 'CompactTester',
      level: 4,
      gold: 321
    });

    showStats(player);

    const logs = (console.log as jest.Mock).mock.calls.map(args => String(args[0] ?? ''));
    expect(logs.some(line => line.includes('ATK'))).toBe(true);
    expect(logs.some(line => line.includes('능력치'))).toBe(false);
  });
});
