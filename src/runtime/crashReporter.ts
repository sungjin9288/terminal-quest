import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { inspect } from 'util';

export type FatalEventType =
  | 'uncaughtException'
  | 'unhandledRejection'
  | 'runtimeError'
  | 'bootstrapError';

function formatPayload(payload: unknown): string {
  if (payload instanceof Error) {
    const stack = payload.stack ? `\n${payload.stack}` : '';
    return `${payload.name}: ${payload.message}${stack}`;
  }

  return inspect(payload, {
    depth: 6,
    colors: false,
    breakLength: 120
  });
}

export function createCrashReportContent(
  eventType: FatalEventType,
  payload: unknown,
  occurredAt: Date
): string {
  return [
    'Terminal Quest Crash Report',
    `eventType: ${eventType}`,
    `timestamp: ${occurredAt.toISOString()}`,
    '',
    'payload:',
    formatPayload(payload),
    ''
  ].join('\n');
}

export function writeCrashReport(
  eventType: FatalEventType,
  payload: unknown,
  options: {
    logsDir?: string;
    occurredAt?: Date;
  } = {}
): string | null {
  const logsDir = options.logsDir ?? join(process.cwd(), 'logs');
  const occurredAt = options.occurredAt ?? new Date();
  const safeTimestamp = occurredAt.toISOString().replace(/[:.]/g, '-');
  const reportPath = join(logsDir, `crash-${safeTimestamp}-${eventType}.log`);

  try {
    mkdirSync(logsDir, { recursive: true });
    writeFileSync(
      reportPath,
      createCrashReportContent(eventType, payload, occurredAt),
      'utf-8'
    );
    return reportPath;
  } catch {
    return null;
  }
}
