import type {
  ActionDefinitionShape,
  PluginInput,
  PluginInstance,
  HostHandlers,
  HostPluginResult,
} from './types';

export function definePlugin<TActions extends Record<string, ActionDefinitionShape>>() {
  return <TName extends string, TMethods>(
    input: PluginInput<TName, TActions, TMethods>,
  ): PluginInstance<TName, TActions, TMethods> => {
    const { name, methods } = input;

    return {
      name,
      _actionMap: {} as TActions,
      methods: methods ?? (() => ({}) as TMethods),
      host(handlers: HostHandlers<TActions>): HostPluginResult {
        const wrappedHandlers: Record<string, (payload: any, context: any) => Promise<any>> = {};
        for (const [action, handler] of Object.entries(handlers)) {
          wrappedHandlers[action] = async (payload, context) => (handler as any)(payload, context);
        }
        return { handlers: wrappedHandlers, pluginName: name };
      },
    };
  };
}
