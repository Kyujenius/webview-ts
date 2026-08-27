import type { FallbackMap, RetryConfig } from '../types/bridge';
import type { RequestInterceptor, ResponseInterceptor } from '../types/interceptor';
import type { StandardSchemaV1 } from '../types/standard-schema';
import type { HostPluginResult, ShortHostHandlers } from './host';
import type {
  ActionNameMap,
  ActionSchemaMap,
  CacheMap,
  DefinePluginOptions,
  EventNameMap,
  EventSchemaMap,
  ExpandActions,
  ExpandEvents,
  PluginInstance,
  RequestInterceptorMap,
  ResponseInterceptorMap,
  RetryMap,
  ShortFallbackHandlers,
  TimeoutMap,
} from './instance';
import type { ActionMarkerMap, EmptyEventMap, EventMarkerMap } from './markers';
import { validateWithSchema } from './validate';

export function definePlugin<
  TName extends string,
  const TMarkers extends ActionMarkerMap,
  TEvents extends EventMarkerMap = EmptyEventMap,
>(
  name: TName,
  markers: TMarkers,
  options?: DefinePluginOptions<TEvents>
): PluginInstance<TName, TMarkers, TEvents> {
  const shortNames = Object.keys(markers);

  // Build runtime action name map: { takePhoto: 'camera.takePhoto' }
  const actions = {} as Record<string, string>;
  for (const short of shortNames) {
    actions[short] = `${name}.${short}`;
  }

  // Build runtime event name map: { updated: 'location.updated' }
  const eventNames = {} as Record<string, string>;
  const eventFullNames: string[] = [];
  if (options?.events) {
    for (const key of Object.keys(options.events)) {
      const fullName = `${name}.${key}`;
      eventNames[key] = fullName;
      eventFullNames.push(fullName);
    }
  }

  // Extract per-action interceptors from markers
  const requestInterceptors: RequestInterceptorMap = {};
  const responseInterceptors: ResponseInterceptorMap = {};
  for (const short of shortNames) {
    const marker = markers[short] as {
      __requestInterceptors?: RequestInterceptor[];
      __responseInterceptors?: ResponseInterceptor[];
    };
    if (marker.__requestInterceptors?.length) {
      requestInterceptors[`${name}.${short}`] = marker.__requestInterceptors;
    }
    if (marker.__responseInterceptors?.length) {
      responseInterceptors[`${name}.${short}`] = marker.__responseInterceptors;
    }
  }

  // Extract per-action timeouts from markers
  const timeouts: TimeoutMap = {};
  for (const short of shortNames) {
    const marker = markers[short] as { __timeout?: number };
    if (marker.__timeout && marker.__timeout > 0) {
      timeouts[`${name}.${short}`] = marker.__timeout;
    }
  }

  // Extract per-action retries from markers
  const retries: RetryMap = {};
  for (const short of shortNames) {
    const marker = markers[short] as { __retry?: RetryConfig };
    if (marker.__retry) {
      retries[`${name}.${short}`] = marker.__retry;
    }
  }

  // Extract per-action cache from markers
  const caches: CacheMap = {};
  for (const short of shortNames) {
    const marker = markers[short] as { __cache?: number | boolean };
    if (marker.__cache !== undefined && marker.__cache !== false) {
      caches[`${name}.${short}`] = marker.__cache;
    }
  }

  // Extract per-action schemas from markers
  const actionSchemas: ActionSchemaMap = {};
  for (const short of shortNames) {
    const marker = markers[short] as {
      __payloadSchema?: StandardSchemaV1;
      __responseSchema?: StandardSchemaV1;
    };
    if (marker.__payloadSchema || marker.__responseSchema) {
      actionSchemas[`${name}.${short}`] = {
        payload: marker.__payloadSchema,
        response: marker.__responseSchema,
      };
    }
  }

  // Extract per-event schemas
  const eventSchemas: EventSchemaMap = {};
  if (options?.events) {
    for (const key of Object.keys(options.events)) {
      const schema = (options.events[key] as { __schema?: StandardSchemaV1 }).__schema;
      if (schema) {
        eventSchemas[`${name}.${key}`] = schema;
      }
    }
  }

  const instance: PluginInstance<TName, TMarkers, TEvents> = {
    name,
    _types: {} as ExpandActions<TName, TMarkers>,
    _eventTypes: {} as TEvents,
    actions: actions as ActionNameMap<TName, TMarkers>,
    events: eventNames as EventNameMap<TName, TEvents>,
    requestInterceptors,
    responseInterceptors,
    timeouts,
    retries,
    caches,
    actionSchemas,
    eventSchemas,
    fallback: undefined,

    host(
      handlers: ShortHostHandlers<TMarkers, TEvents>
    ): HostPluginResult<ExpandEvents<TName, TEvents>> {
      const wrappedHandlers: Record<string, (payload: any, context: any) => Promise<any>> = {};
      for (const short of shortNames) {
        const fullName = `${name}.${short}`;
        const handler = (handlers as any)[short];
        const payloadSchema = actionSchemas[fullName]?.payload;
        wrappedHandlers[fullName] = async (payload, context) => {
          const input = payloadSchema
            ? validateWithSchema(payloadSchema, payload, 'host-payload', fullName)
            : payload;
          return handler(input, context);
        };
      }
      return { handlers: wrappedHandlers, pluginName: name, eventNames: eventFullNames };
    },

    withFallback(handlers: ShortFallbackHandlers<TMarkers>) {
      const mapped: FallbackMap = {};
      for (const [short, fn] of Object.entries(handlers)) {
        mapped[`${name}.${short}`] = fn as any;
      }
      (instance as any).fallback = mapped;
      return instance;
    },
  };

  return instance;
}
