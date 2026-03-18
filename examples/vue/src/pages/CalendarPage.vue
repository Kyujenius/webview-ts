<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePlugin, useBridge } from '../bridge';
import { calendar } from '@example/plugins';

const { connectionMode } = useBridge();
const { addEvent, getEvents } = usePlugin(calendar);

const title = ref('');
const startDate = ref('');
const endDate = ref('');
const notes = ref('');

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

const events = computed(() => (getEvents.data.value as any)?.events ?? []);
const error = computed(() => addEvent.error.value ?? getEvents.error.value);
</script>

<template>
  <div>
    <h1>Calendar</h1>
    <p class="mode-badge">
      {{ connectionMode === 'native' ? 'Native Bridge'
        : connectionMode === 'fallback' ? 'Fallback (In-Memory)'
        : 'Disconnected' }}
    </p>
    <div class="card">
      <h2>Add Event</h2>
      <div style="display: flex; flex-direction: column; gap: 8px">
        <input v-model="title" type="text" placeholder="Event title" style="padding: 8px; border-radius: 6px; border: 1px solid #ddd" />
        <input v-model="startDate" type="datetime-local" style="padding: 8px; border-radius: 6px; border: 1px solid #ddd" />
        <input v-model="endDate" type="datetime-local" style="padding: 8px; border-radius: 6px; border: 1px solid #ddd" />
        <input v-model="notes" type="text" placeholder="Notes (optional)" style="padding: 8px; border-radius: 6px; border: 1px solid #ddd" />
        <button class="button" @click="handleAdd" :disabled="!title || !startDate || !endDate">
          Add to Calendar
        </button>
      </div>
      <div v-if="addEvent.data.value" class="result success">Event created (id: {{ addEvent.data.value.id }})</div>
    </div>
    <div class="card">
      <h2>This Month</h2>
      <button class="button button-secondary" @click="handleGetEvents">Load Events</button>
      <div v-if="events.length > 0" style="margin-top: 8px">
        <div v-for="evt in events" :key="evt.id" class="result" style="margin-bottom: 4px">
          <strong>{{ evt.title }}</strong><br />
          <span style="font-size: 11px; color: #666">{{ new Date(evt.startDate).toLocaleString() }}</span>
        </div>
      </div>
    </div>
    <div v-if="error" class="result error">{{ error.message }}</div>
  </div>
</template>
