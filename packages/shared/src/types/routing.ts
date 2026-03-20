export type RoutingStrategy = 'native' | 'targeted' | 'broadcast';

export const TARGET = {
  NATIVE: 'native',
  BROADCAST: '__broadcast__',
} as const;
