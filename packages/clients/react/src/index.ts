// Recommended: type-safe factory (tRPC-style)
export { createBridgeReact } from './createBridgeReact';

// Legacy: standalone hooks (untyped, requires manual generic)
export { BridgeContext, useBridgeContext } from './BridgeContext';
export type { BridgeContextValue } from './BridgeContext';
export { BridgeProvider } from './BridgeProvider';
export type { BridgeProviderProps } from './BridgeProvider';
export { useBridge } from './useBridge';
export type { UseBridgeReturn } from './useBridge';
export { useEvent } from './useEvent';
export { useAction } from './useAction';
export type { UseActionReturn } from './useAction';
