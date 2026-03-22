import { describe, expectTypeOf, it } from 'vitest';

import type { ActionNames, InferPayload, InferResponse } from './action-map';

type TestActions = {
  'camera.take': {
    payload: { quality: number };
    response: { uri: string };
  };
  'storage.get': {
    payload: { key: string };
    response: { value: string | null };
  };
  'notification.show': {
    payload: { title: string; body: string };
    response: void;
  };
};

describe('ActionMap types', () => {
  it('should infer payload type from action name', () => {
    expectTypeOf<InferPayload<TestActions, 'camera.take'>>().toEqualTypeOf<{ quality: number }>();
  });

  it('should infer response type from action name', () => {
    expectTypeOf<InferResponse<TestActions, 'camera.take'>>().toEqualTypeOf<{ uri: string }>();
  });

  it('should support void response', () => {
    expectTypeOf<InferResponse<TestActions, 'notification.show'>>().toEqualTypeOf<void>();
  });

  it('should extract valid action names', () => {
    type ValidKeys = ActionNames<TestActions>;
    expectTypeOf<'camera.take'>().toMatchTypeOf<ValidKeys>();
    expectTypeOf<'storage.get'>().toMatchTypeOf<ValidKeys>();
  });
});
