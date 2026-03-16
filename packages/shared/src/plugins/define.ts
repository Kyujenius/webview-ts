import type {
  ActionMarkerMap,
  InterceptorMap,
  TimeoutMap,
  PluginInstance,
  ShortHostHandlers,
  HostPluginResult,
  AutoMethods,
  ActionNameMap,
  ExpandActions,
  PluginCall,
} from './types';
import type { Middleware } from '../types/middleware';

export function definePlugin<TName extends string, const TMarkers extends ActionMarkerMap>(
  name: TName,
  markers: TMarkers
): PluginInstance<TName, TMarkers> {
  const shortNames = Object.keys(markers);

  // Build runtime action name map: { takePhoto: 'camera.takePhoto' }
  const actions = {} as Record<string, string>;
  for (const short of shortNames) {
    actions[short] = `${name}.${short}`;
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

  return {
    name,
    _actionMap: {} as ExpandActions<TName, TMarkers>,
    actions: actions as ActionNameMap<TName, TMarkers>,
    interceptors,
    timeouts,

    methods(call: PluginCall<ExpandActions<TName, TMarkers>>) {
      const methods: Record<string, (payload: any) => Promise<any>> = {};
      for (const short of shortNames) {
        const fullName = `${name}.${short}`;
        methods[short] = (payload: any) => call(fullName as any, payload);
      }
      return methods as AutoMethods<TMarkers>;
    },

    host(handlers: ShortHostHandlers<TMarkers>): HostPluginResult {
      const wrappedHandlers: Record<string, (payload: any, context: any) => Promise<any>> = {};
      for (const short of shortNames) {
        const fullName = `${name}.${short}`;
        const handler = (handlers as any)[short];
        wrappedHandlers[fullName] = async (payload, context) => handler(payload, context);
      }
      return { handlers: wrappedHandlers, pluginName: name };
    },
  };
}
