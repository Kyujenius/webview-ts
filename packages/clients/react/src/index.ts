// Recommended: type-safe factory (tRPC-style)
export type { CreateBridgeReactOptions, TypedBridgeProviderProps } from './createBridgeReact';
export { createBridgeReact } from './createBridgeReact';

// Legacy: standalone hooks (untyped, requires manual generic)
export type { BridgeContextValue } from './BridgeContext';
export { BridgeContext, useBridgeContext } from './BridgeContext';
export type { BridgeProviderProps } from './BridgeProvider';
export { BridgeProvider } from './BridgeProvider';
export type { UseActionReturn } from './useAction';
export { useAction } from './useAction';
export type { UseBridgeReturn } from './useBridge';
export { useBridge } from './useBridge';
export { useEvent } from './useEvent';
