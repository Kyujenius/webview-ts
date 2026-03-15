// Core
export { definePlugin } from './define';
export type {
  ActionDefinitionShape,
  PluginInstance,
  PluginInput,
  PluginCall,
  HostHandlers,
  HostPluginResult,
  RequestContext,
  MergePluginActions,
} from './types';

// Official presets
export { camera } from './presets/camera';
export type { CameraActions } from './presets/camera';
export { storage } from './presets/storage';
export type { StorageActions } from './presets/storage';
export { location } from './presets/location';
export type { LocationActions } from './presets/location';
export { biometric } from './presets/biometric';
export type { BiometricActions } from './presets/biometric';
export { haptics } from './presets/haptics';
export type { HapticsActions } from './presets/haptics';
