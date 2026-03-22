import { action, definePlugin } from '@webview-ts/shared';

import type {
  AddEventPayload,
  AddEventResponse,
  CalendarEvent,
  GetEventsPayload,
  GetEventsResponse,
} from './types';

const events: CalendarEvent[] = [];

export const calendar = definePlugin('calendar', {
  addEvent: action<AddEventPayload, AddEventResponse>(),
  getEvents: action<GetEventsPayload, GetEventsResponse>(),
}).withFallback({
  addEvent: async (payload) => {
    const id = `evt-${Date.now()}`;
    events.push({
      id,
      title: payload.title,
      startDate: payload.startDate,
      endDate: payload.endDate,
      notes: payload.notes,
    });
    return { id };
  },
  getEvents: async () => {
    return { events: [...events] };
  },
});
