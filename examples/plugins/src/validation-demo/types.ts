import type { z } from 'zod';

import type { profileResponse } from './plugin';

export type ProfileResponse = z.output<typeof profileResponse>;
