/**
 * Create a debug logger that only logs when enabled.
 *
 * @param prefix - Log prefix, e.g. 'BridgeHost'
 * @param enabled - Whether logging is active
 */
export function createDebugLogger(prefix: string, enabled: boolean) {
  return (message: string, data?: unknown): void => {
    if (!enabled) return;
    const tag = `[${prefix}]`;
    if (data !== undefined) {
      console.log(tag, message, data);
    } else {
      console.log(tag, message);
    }
  };
}
