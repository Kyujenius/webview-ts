/** Extract event names from an event map */
export type EventNames<TMap extends Record<string, unknown>> = keyof TMap & string;

/** Infer payload type for a given event */
export type InferEventPayload<
  TMap extends Record<string, unknown>,
  TEvent extends keyof TMap,
> = TMap[TEvent];
