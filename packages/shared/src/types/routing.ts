export type RoutingStrategy = 'host' | 'targeted' | 'broadcast';

export const TARGET = {
  HOST: 'host',
  BROADCAST: '__broadcast__',
} as const;
