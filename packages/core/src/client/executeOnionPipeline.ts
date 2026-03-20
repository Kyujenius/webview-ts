import type { Middleware, MiddlewareContext } from '@webview-ts/shared';
import { METADATA_KEYS } from '@webview-ts/shared';

export interface PipelineTrace {
  name: string;
  layer: 'global' | 'plugin';
  plugin?: string;
  enterMs: number;
  exitMs: number;
  shortCircuit: boolean;
  shortCircuitReason?: string;
  error?: { message: string; stack?: string };
  logs?: string[];
  metadataChanges?: Record<string, unknown>;
}

interface PipelineOptions {
  tracing?: boolean;
  layer?: 'global' | 'plugin';
  plugin?: string;
  skipTraceFor?: Set<string>;
}

/**
 * Execute middlewares as a Koa-style onion pipeline with optional trace recording.
 *
 * Returns an array of PipelineTrace entries (empty when tracing is disabled).
 */
export async function executeOnionPipeline(
  middlewares: Middleware[],
  ctx: MiddlewareContext,
  core: () => Promise<void>,
  options?: PipelineOptions
): Promise<PipelineTrace[]> {
  const traces: PipelineTrace[] = [];
  const tracing = options?.tracing ?? false;

  let index = -1;
  let reachedCore = false;

  const dispatch = (i: number): Promise<void> => {
    if (i <= index) {
      return Promise.reject(new Error('next() called multiple times'));
    }
    index = i;

    if (i >= middlewares.length) {
      reachedCore = true;
      return core();
    }

    const mw = middlewares[i];
    const skipTrace = !tracing || options?.skipTraceFor?.has(mw.name) || mw.__skipTrace;

    if (skipTrace) {
      return mw.fn(ctx, () => dispatch(i + 1));
    }

    const enterStart = performance.now();
    let enterEnd: number;

    // Snapshot metadata keys before this MW runs
    const keysBefore = new Set(ctx.metadata.keys());

    const recordTrace = (error?: Error) => {
      const exitEnd = performance.now();
      enterEnd = enterEnd ?? exitEnd;
      const didShortCircuit = !reachedCore && i === index;

      // Collect MW logs
      const logs = ctx.metadata.get(`${METADATA_KEYS.MW_LOG_PREFIX}${mw.name}`) as
        | string[]
        | undefined;

      // Detect metadata changes (new or modified keys, excluding internal __ keys)
      const metadataChanges: Record<string, unknown> = {};
      for (const [key, value] of ctx.metadata.entries()) {
        if (key.startsWith('__')) continue;
        if (!keysBefore.has(key)) {
          metadataChanges[key] = value;
        }
      }

      traces.push({
        name: mw.name,
        layer: options?.layer ?? 'global',
        plugin: options?.plugin,
        enterMs: Math.round((enterEnd - enterStart) * 100) / 100,
        exitMs: Math.round((exitEnd - enterEnd) * 100) / 100,
        shortCircuit: didShortCircuit,
        shortCircuitReason: didShortCircuit
          ? (ctx.metadata.get(`${METADATA_KEYS.SHORT_CIRCUIT_PREFIX}${mw.name}`) as
              | string
              | undefined)
          : undefined,
        error: error ? { message: error.message, stack: error.stack } : undefined,
        logs,
        metadataChanges: Object.keys(metadataChanges).length > 0 ? metadataChanges : undefined,
      });
    };

    return mw
      .fn(ctx, () => {
        enterEnd = performance.now();
        return dispatch(i + 1);
      })
      .then(() => {
        recordTrace();
      })
      .catch((err: Error) => {
        recordTrace(err);
        throw err;
      });
  };

  await dispatch(0);
  return traces;
}
