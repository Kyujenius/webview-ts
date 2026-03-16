export interface AddEventPayload {
  title: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface AddEventResponse {
  id: string;
}

export interface GetEventsPayload {
  startDate: string;
  endDate: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface GetEventsResponse {
  events: CalendarEvent[];
}
