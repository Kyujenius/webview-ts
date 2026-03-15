import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/*/vitest.config.ts',
  'packages/clients/*/vitest.config.ts',
  'packages/hosts/*/vitest.config.ts',
  'tests/vitest.config.ts',
]);
