import type { BridgeClient } from '@webview-ts/core';
import type { ActionMapBase, EventMapBase } from '@webview-ts/shared';
import { useEffect, useRef } from 'react';

export function useEventCore<
  TActions extends ActionMapBase,
  TEvents extends EventMapBase,
  K extends string & keyof TEvents,
>(bridge: BridgeClient<TActions, TEvents>, event: K, handler: (payload: TEvents[K]) => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    const unsubscribe = bridge.on(event, (payload) => {
      handlerRef.current(payload);
    });
    return unsubscribe;
  }, [bridge, event]);
}
