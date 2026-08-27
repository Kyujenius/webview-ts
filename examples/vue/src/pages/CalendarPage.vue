<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePlugin, useBridge } from '../bridge';
import { calendar } from '@example/plugins';
import type { GetEventsResponse } from '@example/plugins';
import ModeBadge from '../components/ModeBadge.vue';
import ErrorMessage from '../components/ErrorMessage.vue';

const { connectionMode } = useBridge();
const { addEvent, getEvents } = usePlugin(calendar);

// datetime-local input expects "YYYY-MM-DDTHH:mm" in local time
const toLocalInput = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const title = ref('Star webview-ts on GitHub ⭐');
const startDate = ref(toLocalInput(new Date(Date.now() + 60 * 60 * 1000)));
const endDate = ref(toLocalInput(new Date(Date.now() + 2 * 60 * 60 * 1000)));
const notes = ref('Typed postMessage — no more raw strings');

const handleAdd = async () => {
  const res = await addEvent.execute({
    title: title.value,
    startDate: new Date(startDate.value).toISOString(),
    endDate: new Date(endDate.value).toISOString(),
    notes: notes.value || undefined,
  });
  if (res) {
    title.value = '';
    notes.value = '';
  }
};

const handleGetEvents = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
  getEvents.execute({ startDate: start, endDate: end });
};

const events = computed(() => (getEvents.data.value as GetEventsResponse | null)?.events ?? []);
const error = computed(() => addEvent.error.value ?? getEvents.error.value);
</script>

<template>
  <div>
    <h1>Calendar</h1>
    <ModeBadge :connectionMode="connectionMode" fallbackLabel="Fallback (In-Memory)" />
    <div class="card">
      <h2>Add Event</h2>
      <div class="flex-col-gap">
        <input v-model="title" type="text" placeholder="Event title" class="input" />
        <input v-model="startDate" type="datetime-local" class="input" />
        <input v-model="endDate" type="datetime-local" class="input" />
        <input v-model="notes" type="text" placeholder="Notes (optional)" class="input" />
        <button class="button" @click="handleAdd" :disabled="!title || !startDate || !endDate">
          Add to Calendar
        </button>
      </div>
      <div v-if="addEvent.data.value" class="result success">
        Event created (id: {{ addEvent.data.value.id }})
      </div>
    </div>
    <div class="card">
      <h2>This Month</h2>
      <button class="button button-secondary" @click="handleGetEvents">Load Events</button>
      <div v-if="events.length > 0" style="margin-top: 8px">
        <div v-for="evt in events" :key="evt.id" class="result" style="margin-bottom: 4px">
          <strong>{{ evt.title }}</strong
          ><br />
          <span style="font-size: 11px; color: #666">{{
            new Date(evt.startDate).toLocaleString()
          }}</span>
        </div>
      </div>
    </div>
    <ErrorMessage :error="error" />
  </div>
</template>
