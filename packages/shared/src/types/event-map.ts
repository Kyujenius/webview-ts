import type { StrictKeyOf } from './utils';

export type EventMapBase = Record<string, unknown>;

/** Extract event names from an event map */
export type EventNames<TMap extends EventMapBase> = StrictKeyOf<TMap>;

/** Infer payload type for a given event */
export type InferEventPayload<TMap extends EventMapBase, TEvent extends keyof TMap> = TMap[TEvent];
