jest.mock('inquirer', () => ({
  __esModule: true,
  default: {
    prompt: jest.fn()
  }
}));

jest.mock('chalk', () => {
  const chain = new Proxy(
    (...args: unknown[]) => String(args[0] ?? ''),
    {
      get: () => chain,
      apply: (_target, _thisArg, args: unknown[]) => String(args[0] ?? '')
    }
  );

  return {
    __esModule: true,
    default: chain
  };
});
