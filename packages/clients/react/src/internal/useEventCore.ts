import { useEffect, useRef } from 'react';
import type { BridgeManager } from '@webview-ts/core';
import type { ActionDefinitionShape } from '@webview-ts/shared';

export function useEventCore<
  TActions extends Record<string, ActionDefinitionShape>,
  TEvents extends Record<string, unknown>,
  K extends string & keyof TEvents,
>(
  bridge: BridgeManager<TActions, TEvents>,
  event: K,
  handler: (payload: TEvents[K]) => void
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    const unsubscribe = bridge.on(event, (payload) => {
      handlerRef.current(payload);
    });
    return unsubscribe;
  }, [bridge, event]);
}
