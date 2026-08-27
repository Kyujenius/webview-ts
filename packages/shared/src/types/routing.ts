export const TARGET = {
  HOST: 'host',
  BROADCAST: '__broadcast__',
} as const;

/**
 * Options for host-side sendEvent targeting.
 */
export interface SendEventOptions {
  /** Target WebView sourceId, or TARGET.BROADCAST for all. Defaults to the attached adapter. */
  target?: string;
}
