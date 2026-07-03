import { validationDemo } from '@example/plugins';

export const validationDemoHost = validationDemo.host({
  /** Returns a contract-valid profile — happy path */
  getProfile: async () => ({
    name: 'Ada Lovelace',
    age: 36,
    joinedAt: 1719970000000,
  }),

  /**
   * Deliberately returns a wrong shape to demonstrate that the client-side
   * response validation catches contract violations even when the native host
   * sends malformed data. `as never` suppresses the TypeScript error so the
   * intentional breakage compiles.
   */
  getBrokenProfile: async () => ({ name: 'Bad Host', age: 'thirty' }) as never,
});
