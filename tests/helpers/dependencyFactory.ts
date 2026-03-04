export function mergeTestDependencies<T extends object>(
  defaults: T,
  overrides: Partial<T> = {}
): T {
  return {
    ...defaults,
    ...overrides
  };
}
