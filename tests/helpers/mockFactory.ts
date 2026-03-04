type AnyFunction = (...args: any[]) => any;

export function mockFn<F extends AnyFunction>(
  implementation?: (this: ThisParameterType<F>, ...args: Parameters<F>) => ReturnType<F>
): jest.Mock<ReturnType<F>, Parameters<F>, ThisParameterType<F>> {
  return jest.fn<ReturnType<F>, Parameters<F>, ThisParameterType<F>>(implementation);
}
