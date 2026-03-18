import type {
  ActionMarkerMap,
  EventMarkerMap,
  DefinePluginOptions,
  InterceptorMap,
  TimeoutMap,
  PluginInstance,
  ShortHostHandlers,
  HostPluginResult,
  ActionNameMap,
  EventNameMap,
  ExpandActions,
  ShortFallbackHandlers,
} from './types';
import type { Middleware } from '../types/middleware';
import type { FallbackMap } from '../types/bridge';

export function definePlugin<
  TName extends string,
  const TMarkers extends ActionMarkerMap,
  TEvents extends EventMarkerMap = Record<string, never>,
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
  const interceptors: InterceptorMap = {};
  for (const short of shortNames) {
    const marker = markers[short] as { __interceptors?: Middleware[] };
    if (marker.__interceptors?.length) {
      interceptors[`${name}.${short}`] = marker.__interceptors;
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

  const instance: PluginInstance<TName, TMarkers, TEvents> = {
    name,
    _types: {} as ExpandActions<TName, TMarkers>,
    _eventTypes: {} as TEvents,
    actions: actions as ActionNameMap<TName, TMarkers>,
    events: eventNames as EventNameMap<TName, TEvents>,
    interceptors,
    timeouts,
    fallback: undefined,

    host(handlers: ShortHostHandlers<TMarkers, TEvents>): HostPluginResult {
      const wrappedHandlers: Record<string, (payload: any, context: any) => Promise<any>> = {};
      for (const short of shortNames) {
        const fullName = `${name}.${short}`;
        const handler = (handlers as any)[short];
        wrappedHandlers[fullName] = async (payload, context) => handler(payload, context);
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
