import { describe, it, expectTypeOf } from 'vitest';
import type { BridgeConfig, RetryConfig, ErrorContext } from './bridge';
import type { BridgeError } from './message';

describe('Extended BridgeConfig', () => {
  it('should accept onError handler with BridgeError and ErrorContext', () => {
    const config: BridgeConfig = {
      onError: (error, context) => {
        expectTypeOf(error).toMatchTypeOf<BridgeError>();
        expectTypeOf(context).toMatchTypeOf<ErrorContext>();
      },
    };
    expectTypeOf(config.onError).toMatchTypeOf<
      ((error: BridgeError, context: ErrorContext) => void) | undefined
    >();
  });

  it('should accept retry config', () => {
    const config: BridgeConfig = {
      retry: { maxAttempts: 3, delay: 1000, exponentialBackoff: true },
    };
    expectTypeOf(config.retry).toMatchTypeOf<RetryConfig | undefined>();
  });
});
