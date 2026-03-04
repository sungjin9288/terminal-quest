export type MessageSignal = 'info' | 'success' | 'warning' | 'error';
export type BattleSignal = 'info' | 'damage' | 'heal' | 'critical' | 'miss';

type Signal = MessageSignal | BattleSignal;
type HealthState = 'safe' | 'caution' | 'danger';

const SIGNAL_LABELS: Record<Signal, string> = {
  info: '[INFO]',
  success: '[OK]',
  warning: '[WARN]',
  error: '[ERROR]',
  damage: '[DMG]',
  heal: '[HEAL]',
  critical: '[CRIT]',
  miss: '[MISS]'
};

const HEALTH_STATE_LABELS: Record<HealthState, string> = {
  safe: '[안전]',
  caution: '[주의]',
  danger: '[위험]'
};

const HEALTH_FILL_CHARS: Record<HealthState, string> = {
  safe: '█',
  caution: '▓',
  danger: '▒'
};

export function getSignalLabel(signal: Signal): string {
  return SIGNAL_LABELS[signal];
}

export function withSignalLabel(message: string, signal: Signal): string {
  const label = getSignalLabel(signal);
  const trimmed = message.trimStart();
  if (trimmed.startsWith(label)) {
    return message;
  }
  return `${label} ${message}`;
}

export function getHealthState(percentage: number): HealthState {
  if (percentage < 0.3) {
    return 'danger';
  }
  if (percentage < 0.6) {
    return 'caution';
  }
  return 'safe';
}

export function getHealthFillCharacter(percentage: number): string {
  return HEALTH_FILL_CHARS[getHealthState(percentage)];
}

export function getHealthStateLabel(percentage: number): string {
  return HEALTH_STATE_LABELS[getHealthState(percentage)];
}
