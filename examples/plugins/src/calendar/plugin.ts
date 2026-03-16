import { definePlugin, action } from '@webview-ts/shared';
import type {
  AddEventPayload,
  AddEventResponse,
  GetEventsPayload,
  GetEventsResponse,
} from './types';

export const calendar = definePlugin('calendar', {
  addEvent: action<AddEventPayload, AddEventResponse>(),
  getEvents: action<GetEventsPayload, GetEventsResponse>(),
});

export const CalendarActions = calendar.actions;
