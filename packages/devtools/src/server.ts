import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { exec } from 'node:child_process';
import { platform } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '4000', 10);

const html = readFileSync(join(__dirname, 'dashboard', 'index.html'), 'utf-8');

const http = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

const wss = new WebSocketServer({ server: http });
const clients = new Map<import('ws').WebSocket, string>();

wss.on('connection', (ws, req) => {
  const isDashboard = req.url?.includes('role=dashboard');
  const role = isDashboard ? 'dashboard' : 'app';
  clients.set(ws, role);

  const apps = [...clients.values()].filter((r) => r === 'app').length;
  const dashboards = [...clients.values()].filter((r) => r === 'dashboard').length;
  console.log(`[devtools] ${role} connected (apps: ${apps}, dashboards: ${dashboards})`);

  if (role === 'app') {
    broadcastStatus();
  } else {
    ws.send(JSON.stringify({ type: 'status', appConnected: apps > 0 }));
  }

  ws.on('message', (raw) => {
    for (const [c] of clients) {
      if (c !== ws && c.readyState === 1) {
        c.send(raw.toString());
      }
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    const a = [...clients.values()].filter((r) => r === 'app').length;
    const d = [...clients.values()].filter((r) => r === 'dashboard').length;
    console.log(`[devtools] ${role} disconnected (apps: ${a}, dashboards: ${d})`);
    if (role === 'app') broadcastStatus();
  });
});

function broadcastStatus() {
  const appCount = [...clients.values()].filter((r) => r === 'app').length;
  const msg = JSON.stringify({ type: 'status', appConnected: appCount > 0 });
  for (const [c, role] of clients) {
    if (role === 'dashboard' && c.readyState === 1) {
      c.send(msg);
    }
  }
}

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

  if (!process.argv.includes('--no-open')) {
    const url = `http://localhost:${PORT}/`;
    const cmd =
      platform() === 'darwin'
        ? `open "${url}"`
        : platform() === 'win32'
          ? `start "${url}"`
          : `xdg-open "${url}"`;
    exec(cmd);
  }
});
