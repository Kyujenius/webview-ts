#!/usr/bin/env node

import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { dashboardHTML } from './dashboard.mjs';

const PORT = parseInt(process.env.PORT || '4000', 10);

// --- HTTP: serve dashboard ---
const http = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(dashboardHTML(PORT));
});

// --- WebSocket: relay messages ---
const wss = new WebSocketServer({ server: http });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[devtools] client connected (${clients.size} total)`);

  ws.on('message', (raw) => {
    // Relay to all OTHER clients (app → dashboard, dashboard → app)
    for (const c of clients) {
      if (c !== ws && c.readyState === 1) {
        c.send(raw.toString());
      }
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[devtools] client disconnected (${clients.size} total)`);
  });
});

http.listen(PORT, () => {
  console.log();
  console.log(`  \x1b[36m┌─ ts-bridge DevTools ─────────────────┐\x1b[0m`);
  console.log(`  \x1b[36m│\x1b[0m                                      \x1b[36m│\x1b[0m`);
  console.log(
    `  \x1b[36m│\x1b[0m  Dashboard: \x1b[1mhttp://localhost:${PORT}/\x1b[0m   \x1b[36m│\x1b[0m`
  );
  console.log(
    `  \x1b[36m│\x1b[0m  WebSocket: \x1b[1mws://localhost:${PORT}\x1b[0m      \x1b[36m│\x1b[0m`
  );
  console.log(`  \x1b[36m│\x1b[0m                                      \x1b[36m│\x1b[0m`);
  console.log(`  \x1b[36m└──────────────────────────────────────┘\x1b[0m`);
  console.log();
  console.log('  Waiting for connections...');
  console.log();
});
