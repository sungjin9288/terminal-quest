export type RuntimeHandlerEvent = 'SIGINT' | 'uncaughtException' | 'unhandledRejection';
export type RuntimeHandlerMap = Partial<Record<RuntimeHandlerEvent, (...args: unknown[]) => void>>;

export interface RuntimeProcessMock {
  on: jest.Mock;
  exit: jest.Mock;
}

export interface RuntimeConsoleMock {
  log: jest.Mock;
  error: jest.Mock;
}

export function createProcessMock(handlers: RuntimeHandlerMap): RuntimeProcessMock {
  return {
    on: jest.fn((event: RuntimeHandlerEvent, listener: (...args: unknown[]) => void) => {
      handlers[event] = listener;
      return undefined;
    }),
    exit: jest.fn((_: number) => undefined)
  };
}

export function createConsoleMock(): RuntimeConsoleMock {
  return {
    log: jest.fn(),
    error: jest.fn()
  };
}

export function silenceConsoleError(): jest.SpyInstance {
  return jest.spyOn(console, 'error').mockImplementation(() => undefined);
}
