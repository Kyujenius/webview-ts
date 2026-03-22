import { createMetadataKey } from '../metadata/MetadataMap';

/**
 * Well-known metadata keys used internally.
 *
 * MW_LOG_PREFIX and SHORT_CIRCUIT_PREFIX are string prefixes
 * for dynamic per-middleware keys — use plain string concatenation.
 */
export const METADATA_KEYS = {
  /** Collected pipeline traces (set by executeOnionPipeline). */
  MW_TRACES: createMetadataKey<unknown[]>('__mwTraces'),
  /** Prefix for per-middleware log arrays. Use: `METADATA_KEYS.MW_LOG_PREFIX + mw.name` */
  MW_LOG_PREFIX: '__mwLog:',
  /** Prefix for short-circuit reasons. Use: `METADATA_KEYS.SHORT_CIRCUIT_PREFIX + mw.name` */
  SHORT_CIRCUIT_PREFIX: '__shortCircuitReason:',
  /** Handler execution time in ms. */
  HANDLER_MS: createMetadataKey<number>('__handlerMs'),
  /** Whether the handler was skipped (short-circuited). */
  HANDLER_SKIPPED: createMetadataKey<boolean>('__handlerSkipped'),
} as const;
