import type { PluginDefinition, ActionSchema } from '@ts-bridge/shared';

export class TypedPluginAdapter<TActions extends Record<string, ActionSchema>> {
  readonly name: string;
  private readonly actions: TActions;

  constructor(definition: PluginDefinition<TActions>) {
    this.name = definition.name;
    this.actions = definition.actions;
  }

  validatePayload<TAction extends keyof TActions & string>(
    action: TAction,
    payload: unknown,
  ): unknown {
    const schema = this.actions[action];
    if (!schema) throw new Error(`Unknown action: ${action}`);
    return schema.payload.parse(payload);
  }

  validateResponse<TAction extends keyof TActions & string>(
    action: TAction,
    response: unknown,
  ): unknown {
    const schema = this.actions[action];
    if (!schema) throw new Error(`Unknown action: ${action}`);
    return schema.response.parse(response);
  }

  hasAction(action: string): boolean {
    return action in this.actions;
  }

  getActionNames(): string[] {
    return Object.keys(this.actions);
  }
}

export function createTypedPluginAdapter<
  TActions extends Record<string, ActionSchema>,
>(definition: PluginDefinition<TActions>): TypedPluginAdapter<TActions> {
  return new TypedPluginAdapter(definition);
}
