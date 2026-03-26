/**
 * @webview-ts/shared
 *
 * Shared types and schemas for webview-ts library.
 * This package provides the single source of truth for all type definitions
 * used across web and native bridge implementations.
 */

export * from './connection/index';
export type { AutoDevToolsTarget } from './devtools/auto-devtools';
export { tryAutoDevTools } from './devtools/auto-devtools';
export * from './interceptor/index';
export * from './plugins/index';
export * from './schemas/index';
export * from './state/index';
export * from './types/index';
export { mergeFallbacks } from './utils/merge-fallback';
export { generateSourceId } from './utils/source-id';
