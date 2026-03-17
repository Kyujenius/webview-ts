import { useBridgeContext } from './BridgeContext';
import { useEventCore } from './internal/useEventCore';

export function useEvent<TPayload = unknown>(
  event: string,
  handler: (payload: TPayload) => void
): void {
  const { bridge } = useBridgeContext();
  useEventCore(bridge, event, handler);
}
