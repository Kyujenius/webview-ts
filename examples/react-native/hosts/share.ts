import { Share as RNShare } from 'react-native';
import { share } from '@example/plugins';

export const shareHost = share.host({
  share: async (payload) => {
    try {
      const result = await RNShare.share({
        title: payload.title,
        message: payload.message,
        url: payload.url,
      });

      return { shared: result.action === RNShare.sharedAction };
    } catch {
      return { shared: false };
    }
  },
});
