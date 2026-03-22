/**
 * @webview-ts/shared
 *
 * Shared types and schemas for webview-ts library.
 * This package provides the single source of truth for all type definitions
 * used across web and native bridge implementations.
 */

export * from './types/index';
export * from './schemas/index';
export * from './middleware/index';
export * from './plugins/index';
export * from './state/index';
export * from './connection/index';
export { METADATA_KEYS } from './constants/metadata-keys';
export { MetadataMap, createMetadataKey, type MetadataKey } from './metadata/index';
export { tryAutoDevTools } from './devtools/auto-devtools';
export type { AutoDevToolsTarget } from './devtools/auto-devtools';
export { generateSourceId } from './utils/source-id';
export { createDebugLogger } from './utils/debug-log';
