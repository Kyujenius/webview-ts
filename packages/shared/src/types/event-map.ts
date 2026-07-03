import type { StrictKeyOf } from './utils';

export type EventMapBase = Record<string, unknown>;

/** Extract event names from an event map */
export type EventNames<TMap extends EventMapBase> = StrictKeyOf<TMap>;
