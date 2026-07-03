import type { z } from 'zod';

import type { getClipboardResponse, setClipboardPayload } from './plugin';

export type SetClipboardPayload = z.input<typeof setClipboardPayload>;
export type GetClipboardResponse = z.output<typeof getClipboardResponse>;
