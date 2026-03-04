import './helpers/moduleMocks';
import {
  getHealthFillCharacter,
  getHealthStateLabel,
  withSignalLabel
} from '../src/ui/accessibility';
import { showMessage } from '../src/ui/display';
import { showBattleLog } from '../src/ui/combat';

describe('Accessibility Signals', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('should prefix semantic labels for typed messages', () => {
    expect(withSignalLabel('완료되었습니다.', 'success')).toBe('[OK] 완료되었습니다.');
    expect(withSignalLabel('위험합니다.', 'warning')).toBe('[WARN] 위험합니다.');
  });

  it('should avoid duplicate semantic labels', () => {
    expect(withSignalLabel('[INFO] 이미 라벨 있음', 'info')).toBe('[INFO] 이미 라벨 있음');
  });

  it('should expose health state labels and fill patterns', () => {
    expect(getHealthFillCharacter(0.9)).toBe('█');
    expect(getHealthStateLabel(0.9)).toBe('[안전]');

    expect(getHealthFillCharacter(0.45)).toBe('▓');
    expect(getHealthStateLabel(0.45)).toBe('[주의]');

    expect(getHealthFillCharacter(0.1)).toBe('▒');
    expect(getHealthStateLabel(0.1)).toBe('[위험]');
  });

  it('should render semantic labels in showMessage output', () => {
    showMessage('점검이 필요합니다.', 'warning');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN]'));
  });

  it('should render semantic labels in battle logs', () => {
    showBattleLog('치명타가 발생했습니다.', 'critical');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[CRIT]'));
  });
});
