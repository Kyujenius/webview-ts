/**
 * Public platform adapters — the "platform = one adapter pair" seam.
 * Auto-detection internals (RN WebView, Fallback, Disconnected) stay private;
 * adapters below are meant to be constructed and injected by app code.
 */
export { IframeClientAdapter } from './IframeClientAdapter';
export { IframeHostAdapter } from './IframeHostAdapter';
