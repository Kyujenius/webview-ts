import * as ExpoCalendar from 'expo-calendar';
import { Platform } from 'react-native';
import { calendar } from '@example/plugins';

async function ensureCalendarPermission(): Promise<void> {
  const { status } = await ExpoCalendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Calendar permission not granted');
  }
}

async function getDefaultCalendarId(): Promise<string> {
  await ensureCalendarPermission();

  const calendars = await ExpoCalendar.getCalendarsAsync(ExpoCalendar.EntityTypes.EVENT);

  if (Platform.OS === 'ios') {
    const defaultCalendar = await ExpoCalendar.getDefaultCalendarAsync();
    return defaultCalendar.id;
  }

  const primary = calendars.find((c) => c.isPrimary) ?? calendars[0];
  if (!primary) throw new Error('No calendar found');
  return primary.id;
}

export const calendarHost = calendar.host({
  addEvent: async (payload) => {
    const calendarId = await getDefaultCalendarId();
    const id = await ExpoCalendar.createEventAsync(calendarId, {
      title: payload.title,
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
      notes: payload.notes,
    });
    return { id };
  },
  getEvents: async (payload) => {
    await ensureCalendarPermission();

    const calendars = await ExpoCalendar.getCalendarsAsync(ExpoCalendar.EntityTypes.EVENT);
    const calendarIds = calendars.map((c) => c.id);

    const events = await ExpoCalendar.getEventsAsync(
      calendarIds,
      new Date(payload.startDate),
      new Date(payload.endDate)
    );

    return {
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        startDate: e.startDate.toString(),
        endDate: e.endDate.toString(),
        notes: e.notes ?? undefined,
      })),
    };
  },
});
