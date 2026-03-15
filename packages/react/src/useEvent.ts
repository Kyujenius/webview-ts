import { useEffect, useRef } from 'react';
import { useBridgeContext } from './BridgeContext';

export function useEvent<TPayload = unknown>(event: string, handler: (payload: TPayload) => void): void {
  const { bridge } = useBridgeContext();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    const unsubscribe = bridge.on(event, (payload: unknown) => { handlerRef.current(payload as TPayload); });
    return unsubscribe;
  }, [bridge, event]);
}
