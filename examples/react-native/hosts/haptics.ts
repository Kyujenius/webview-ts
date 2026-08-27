import { haptics } from '@example/plugins';
import * as Haptics from 'expo-haptics';

const impactStyles: Record<string, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

const notificationTypes: Record<string, Haptics.NotificationFeedbackType> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

export const hapticsHost = haptics.host({
  impact: async (payload) => {
    const style = impactStyles[payload.style ?? 'medium'] ?? Haptics.ImpactFeedbackStyle.Medium;
    await Haptics.impactAsync(style);
    return {};
  },
  notification: async (payload) => {
    const type =
      notificationTypes[payload.type ?? 'success'] ?? Haptics.NotificationFeedbackType.Success;
    await Haptics.notificationAsync(type);
    return {};
  },
  selection: async () => {
    await Haptics.selectionAsync();
    return {};
  },
});
