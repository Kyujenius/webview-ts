import { action, definePlugin } from '@webview-ts/shared';
import { z } from 'zod';

export const profileResponse = z.object({
  name: z.string(),
  age: z.number().int().min(0),
  /** Unix timestamp (ms) — avoids JSON Schema Date limitation while preserving validation demo intent */
  joinedAt: z.number().int().min(0),
});

export const validationDemo = definePlugin('validationDemo', {
  /** Returns a contract-valid profile — happy path */
  getProfile: action({ response: profileResponse }),
  /** Fallback deliberately returns a wrong shape — demonstrates client-response validation */
  getBrokenProfile: action({ response: profileResponse }),
}).withFallback({
  getProfile: async () => ({ name: 'Ada', age: 36, joinedAt: 1719970000000 }),
  // Wrong shape on purpose: age is a string, joinedAt missing
  getBrokenProfile: async () => ({ name: 'Bad Host', age: 'thirty' }) as never,
});
