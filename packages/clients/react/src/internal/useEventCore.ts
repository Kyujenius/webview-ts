import { useEffect, useRef } from 'react';
import type { BridgeManager } from '@webview-ts/core';
import type { ActionDefinitionShape } from '@webview-ts/shared';

export function useEventCore<
  TActions extends Record<string, ActionDefinitionShape>,
  TPayload = unknown,
>(bridge: BridgeManager<TActions>, event: string, handler: (payload: TPayload) => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    const unsubscribe = bridge.on(event, (payload: unknown) => {
      handlerRef.current(payload as TPayload);
    });
    return unsubscribe;
  }, [bridge, event]);
}
