const {
  checkRateLimit,
  withRateLimit,
  getRateLimitInfo,
  resetRateLimitStore,
  RATE_LIMITS
} = require('../js/rate-limiter.js');

describe('rate-limiter', () => {
  beforeEach(() => {
    resetRateLimitStore();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('permite operaciones hasta llegar al límite configurado', () => {
    const operation = 'register';
    const limit = RATE_LIMITS[operation].max;

    for (let i = 0; i < limit; i += 1) {
      const result = checkRateLimit(operation);
      expect(result.allowed).toBe(true);
      expect(result.waitTime).toBe(0);
    }

    const blocked = checkRateLimit(operation);
    expect(blocked.allowed).toBe(false);
    expect(blocked.waitTime).toBeGreaterThan(0);
  });

  test('vuelve a permitir operaciones una vez transcurrida la ventana', () => {
    const operation = 'login';
    const windowMs = RATE_LIMITS[operation].window;

    // Consumir el límite
    for (let i = 0; i < RATE_LIMITS[operation].max; i += 1) {
      expect(checkRateLimit(operation).allowed).toBe(true);
    }

    expect(checkRateLimit(operation).allowed).toBe(false);

    // Avanzar el tiempo más allá de la ventana
    jest.advanceTimersByTime(windowMs + 1000);

    const resultAfterWindow = checkRateLimit(operation);
    expect(resultAfterWindow.allowed).toBe(true);
    expect(resultAfterWindow.waitTime).toBe(0);

    const info = getRateLimitInfo(operation);
    expect(info.current).toBe(1);
    expect(info.remaining).toBe(info.max - 1);
  });

  test('withRateLimit lanza error cuando se excede el límite', async () => {
    const operation = 'createAppointment';
    const handler = jest.fn().mockResolvedValue('ok');
    const limitedHandler = withRateLimit(operation, handler);

    // Consumir el límite permitido
    for (let i = 0; i < RATE_LIMITS[operation].max; i += 1) {
      await expect(limitedHandler()).resolves.toBe('ok');
    }

    await expect(limitedHandler()).rejects.toMatchObject({
      code: 'RATE_LIMIT_EXCEEDED'
    });
    expect(handler).toHaveBeenCalledTimes(RATE_LIMITS[operation].max);
  });
});

