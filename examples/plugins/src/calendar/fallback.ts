import type { FallbackMap } from '@webview-ts/shared';
import { CalendarActions } from './plugin';
import type { AddEventPayload, CalendarEvent } from './types';

const events: CalendarEvent[] = [];

export const calendarFallback: FallbackMap = {
  [CalendarActions.addEvent]: async (payload) => {
    const { title, startDate, endDate, notes } = payload as AddEventPayload;
    const id = `evt-${Date.now()}`;
    events.push({ id, title, startDate, endDate, notes });
    return { id };
  },
  [CalendarActions.getEvents]: async () => {
    return { events: [...events] };
  },
};
