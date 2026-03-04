/**
 * Build runtime dependency objects with sensible defaults.
 */
export function mergeDependencies<T extends object>(
  defaults: T,
  overrides: Partial<T> = {}
): T {
  return {
    ...defaults,
    ...overrides
  };
}
