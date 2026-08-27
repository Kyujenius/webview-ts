/**
 * Action/event MARKERS — the contract-authoring surface.
 * Open this file when changing what `action()` / `event()` can express
 * (options, schema modes, the phantom type parameters).
 */
import type { RetryConfig } from '../types/bridge';
import type { RequestInterceptor, ResponseInterceptor } from '../types/interceptor';
import type { StandardSchemaV1 } from '../types/standard-schema';

// ─── action() ───

/** Options for action() marker */
export interface ActionOptions {
  /** Timeout in ms for this action. 0 or undefined = no timeout (default) */
  timeout?: number;
  /** Retry configuration for this action */
  retry?: RetryConfig;
  /**
   * Cache TTL for this action.
   * - `number`: TTL in milliseconds
   * - `true`: cache indefinitely
   */
  cache?: number | boolean;
}

/** Schema-mode options — payload/response are Standard Schema objects */
export interface SchemaFields {
  payload?: StandardSchemaV1;
  response?: StandardSchemaV1;
}

/** Branded type marker — carries Payload/Response at type level.
 *  TPayload/TResponse: what the RECEIVER sees (schema output).
 *  TPayloadIn/TResponseIn: what the SENDER provides (schema input).
 *  Without schemas the pairs are identical. */
export interface ActionMarker<
  TPayload = void,
  TResponse = void,
  TPayloadIn = TPayload,
  TResponseIn = TResponse,
> {
  readonly __payload: TPayload;
  readonly __response: TResponse;
  readonly __payloadIn: TPayloadIn;
  readonly __responseIn: TResponseIn;
  readonly __payloadSchema?: StandardSchemaV1;
  readonly __responseSchema?: StandardSchemaV1;
  readonly __requestInterceptors?: RequestInterceptor[];
  readonly __responseInterceptors?: ResponseInterceptor[];
  /** Per-action timeout in ms (runtime) */
  readonly __timeout?: number;
  /** Per-action retry config (runtime) */
  readonly __retry?: RetryConfig;
  /** Per-action cache TTL (runtime) */
  readonly __cache?: number | boolean;
  readonly interceptors: {
    readonly request: {
      use(
        interceptor: RequestInterceptor
      ): ActionMarker<TPayload, TResponse, TPayloadIn, TResponseIn>;
    };
    readonly response: {
      use(
        interceptor: ResponseInterceptor
      ): ActionMarker<TPayload, TResponse, TPayloadIn, TResponseIn>;
    };
  };
}

// Schema mode: both payload and response
export function action<PS extends StandardSchemaV1, RS extends StandardSchemaV1>(
  options: ActionOptions & { payload: PS; response: RS }
): ActionMarker<
  StandardSchemaV1.InferOutput<PS>,
  StandardSchemaV1.InferOutput<RS>,
  StandardSchemaV1.InferInput<PS>,
  StandardSchemaV1.InferInput<RS>
>;
// Schema mode: payload only
export function action<PS extends StandardSchemaV1>(
  options: ActionOptions & { payload: PS; response?: undefined }
): ActionMarker<StandardSchemaV1.InferOutput<PS>, void, StandardSchemaV1.InferInput<PS>, void>;
// Schema mode: response only
export function action<RS extends StandardSchemaV1>(
  options: ActionOptions & { payload?: undefined; response: RS }
): ActionMarker<void, StandardSchemaV1.InferOutput<RS>, void, StandardSchemaV1.InferInput<RS>>;
// Phantom mode: unchanged public signature
export function action<TPayload = void, TResponse = void>(
  options?: ActionOptions
): ActionMarker<TPayload, TResponse>;
// Implementation
export function action(options?: ActionOptions & SchemaFields): ActionMarker<any, any, any, any> {
  const requestInterceptors: RequestInterceptor[] = [];
  const responseInterceptors: ResponseInterceptor[] = [];
  const marker: any = {
    __requestInterceptors: requestInterceptors,
    __responseInterceptors: responseInterceptors,
    __timeout: options?.timeout,
    __retry: options?.retry,
    __cache: options?.cache,
    interceptors: {
      request: {
        use(interceptor: RequestInterceptor) {
          requestInterceptors.push(interceptor);
          return marker;
        },
      },
      response: {
        use(interceptor: ResponseInterceptor) {
          responseInterceptors.push(interceptor);
          return marker;
        },
      },
    },
  };
  if (options?.payload) {
    marker.__payloadSchema = options.payload;
  }
  if (options?.response) {
    marker.__responseSchema = options.response;
  }
  return marker as ActionMarker<any, any, any, any>;
}

/** A record of short-name action markers */
export type ActionMarkerMap = Record<string, ActionMarker<any, any, any, any>>;

// ─── event() ───

/** Branded type marker — carries event payload type at type level */
export interface EventMarker<TPayload = void, TPayloadIn = TPayload> {
  readonly __eventPayload: TPayload;
  readonly __eventPayloadIn: TPayloadIn;
  readonly __schema?: StandardSchemaV1;
}

export function event<S extends StandardSchemaV1>(
  schema: S
): EventMarker<StandardSchemaV1.InferOutput<S>, StandardSchemaV1.InferInput<S>>;
export function event<TPayload = void>(): EventMarker<TPayload>;
export function event(schema?: StandardSchemaV1): EventMarker<any, any> {
  return (schema ? { __schema: schema } : {}) as EventMarker<any, any>;
}

/** A record of short-name event markers */
export type EventMarkerMap = Record<string, EventMarker<any, any>>;

/** Empty event map — default for plugins that declare no events.
 *  `Record<never, never>` (not `Record<string, never>`): its `keyof` is `never`,
 *  so intersections keep exact contract keys and `[StrictKeyOf<TEvents>] extends
 *  [never]` correctly detects "no events declared". */
export type EmptyEventMap = Record<never, never>;

// ─── Marker type extraction ───

export type ExtractPayload<T> = T extends ActionMarker<infer P, any, any, any> ? P : never;
export type ExtractResponse<T> = T extends ActionMarker<any, infer R, any, any> ? R : never;
export type ExtractPayloadIn<T> = T extends ActionMarker<any, any, infer PIn, any> ? PIn : never;
export type ExtractResponseIn<T> = T extends ActionMarker<any, any, any, infer RIn> ? RIn : never;
export type ExtractEventPayload<T> = T extends EventMarker<infer P, any> ? P : never;
export type ExtractEventPayloadIn<T> = T extends EventMarker<any, infer PIn> ? PIn : never;
