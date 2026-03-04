import './helpers/moduleMocks';
import {
  registerProcessHandlers,
  runApplication,
  bootstrapApplication
} from '../src/runtime/bootstrap';
import {
  RuntimeHandlerMap,
  createProcessMock,
  createConsoleMock
} from './helpers/runtimeMocks';

describe('Bootstrap Runtime', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should register process handlers for SIGINT and fatal events', () => {
    const handlers: RuntimeHandlerMap = {};
    const processRef = createProcessMock(handlers);
    const consoleRef = createConsoleMock();
    const reportFatal = jest.fn(() => null);

    registerProcessHandlers({ processRef, consoleRef, reportFatal });

    expect(processRef.on).toHaveBeenCalledTimes(3);
    expect(handlers.SIGINT).toBeDefined();
    expect(handlers.uncaughtException).toBeDefined();
    expect(handlers.unhandledRejection).toBeDefined();
  });

  it('should exit with code 0 on SIGINT', () => {
    const handlers: RuntimeHandlerMap = {};
    const processRef = createProcessMock(handlers);
    const consoleRef = createConsoleMock();
    const reportFatal = jest.fn(() => null);

    registerProcessHandlers({ processRef, consoleRef, reportFatal });
    handlers.SIGINT?.();

    expect(consoleRef.log).toHaveBeenCalled();
    expect(reportFatal).not.toHaveBeenCalled();
    expect(processRef.exit).toHaveBeenCalledWith(0);
  });

  it('should report uncaught exception and exit with code 1', () => {
    const handlers: RuntimeHandlerMap = {};
    const processRef = createProcessMock(handlers);
    const consoleRef = createConsoleMock();
    const reportFatal = jest.fn(() => null);

    registerProcessHandlers({ processRef, consoleRef, reportFatal });

    const error = new Error('uncaught failure');
    handlers.uncaughtException?.(error);

    expect(reportFatal).toHaveBeenCalledWith(
      'uncaughtException',
      expect.objectContaining({ error })
    );
    expect(processRef.exit).toHaveBeenCalledWith(1);
  });

  it('should execute runtime and exit with code 1 on runtime error', async () => {
    const handlers: RuntimeHandlerMap = {};
    const processRef = createProcessMock(handlers);
    const consoleRef = createConsoleMock();
    const reportFatal = jest.fn(() => null);

    await runApplication(
      async () => {
        throw new Error('runtime failure');
      },
      { processRef, consoleRef, reportFatal }
    );

    expect(reportFatal).toHaveBeenCalledWith(
      'runtimeError',
      expect.objectContaining({
        error: expect.any(Error)
      })
    );
    expect(consoleRef.error).toHaveBeenCalled();
    expect(processRef.exit).toHaveBeenCalledWith(1);
  });

  it('should bootstrap application by registering handlers and running main menu runtime', async () => {
    const handlers: RuntimeHandlerMap = {};
    const processRef = createProcessMock(handlers);
    const consoleRef = createConsoleMock();
    const reportFatal = jest.fn(() => null);
    const runMainMenuRuntime = jest.fn(async () => undefined);

    bootstrapApplication(runMainMenuRuntime, { processRef, consoleRef, reportFatal });

    await Promise.resolve();

    expect(processRef.on).toHaveBeenCalledTimes(3);
    expect(runMainMenuRuntime).toHaveBeenCalledTimes(1);
  });
});
