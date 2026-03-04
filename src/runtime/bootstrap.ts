import chalk from 'chalk';
import { mergeDependencies } from '../dependencies.js';
import { FatalEventType, writeCrashReport } from './crashReporter.js';

interface ProcessLike {
  on(event: 'SIGINT' | 'uncaughtException' | 'unhandledRejection', listener: (...args: unknown[]) => void): unknown;
  exit(code?: number): void;
}

interface ConsoleLike {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

interface ReportFatalLike {
  (eventType: FatalEventType, payload: unknown): string | null;
}

export interface BootstrapDependencies {
  processRef?: ProcessLike;
  consoleRef?: ConsoleLike;
  reportFatal?: ReportFatalLike;
}

interface ResolvedBootstrapDependencies {
  processRef: ProcessLike;
  consoleRef: ConsoleLike;
  reportFatal: ReportFatalLike;
}

const DEFAULT_BOOTSTRAP_DEPENDENCIES: ResolvedBootstrapDependencies = {
  processRef: process,
  consoleRef: console,
  reportFatal: writeCrashReport
};

function resolveBootstrapDependencies(
  dependencies: BootstrapDependencies = {}
): ResolvedBootstrapDependencies {
  return mergeDependencies(DEFAULT_BOOTSTRAP_DEPENDENCIES, dependencies);
}

export function registerProcessHandlers(
  dependencies: BootstrapDependencies = {}
): void {
  const { processRef, consoleRef, reportFatal } = resolveBootstrapDependencies(dependencies);

  processRef.on('SIGINT', () => {
    consoleRef.log();
    consoleRef.log(chalk.yellow('\n👋 Game interrupted. Goodbye!'));
    processRef.exit(0);
  });

  processRef.on('uncaughtException', (error: unknown) => {
    const reportPath = reportFatal('uncaughtException', { error });
    if (reportPath) {
      consoleRef.error(chalk.gray(`Crash report saved: ${reportPath}`));
    }
    consoleRef.error(chalk.red('\n💥 Uncaught exception:'), error);
    processRef.exit(1);
  });

  processRef.on('unhandledRejection', (reason: unknown, promise: unknown) => {
    const reportPath = reportFatal('unhandledRejection', { reason, promise });
    if (reportPath) {
      consoleRef.error(chalk.gray(`Crash report saved: ${reportPath}`));
    }
    consoleRef.error(chalk.red('\n💥 Unhandled rejection at:'), promise, chalk.red('reason:'), reason);
    processRef.exit(1);
  });
}

export async function runApplication(
  runMainMenuRuntime: () => Promise<void>,
  dependencies: BootstrapDependencies = {}
): Promise<void> {
  const { processRef, consoleRef, reportFatal } = resolveBootstrapDependencies(dependencies);

  try {
    await runMainMenuRuntime();
  } catch (error) {
    const reportPath = reportFatal('runtimeError', { error });
    if (reportPath) {
      consoleRef.error(chalk.gray(`Crash report saved: ${reportPath}`));
    }
    consoleRef.error(chalk.red('Fatal error occurred:'), error);
    processRef.exit(1);
  }
}

export function bootstrapApplication(
  runMainMenuRuntime: () => Promise<void>,
  dependencies: BootstrapDependencies = {}
): void {
  const { processRef, consoleRef, reportFatal } = resolveBootstrapDependencies(dependencies);

  registerProcessHandlers(dependencies);

  runApplication(runMainMenuRuntime, dependencies).catch((error) => {
    const reportPath = reportFatal('bootstrapError', { error });
    if (reportPath) {
      consoleRef.error(chalk.gray(`Crash report saved: ${reportPath}`));
    }
    consoleRef.error(chalk.red('Failed to start game:'), error);
    processRef.exit(1);
  });
}
