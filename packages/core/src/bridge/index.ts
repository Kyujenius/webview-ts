/**
 * Bridge core components
 */

export * from './BridgeManager';
export { executeOnionPipeline, type PipelineTrace } from './executeOnionPipeline';
export { ActionStateManager, type ActionState } from './ActionStateManager';
export type { ActionStatus } from '@webview-ts/shared';
