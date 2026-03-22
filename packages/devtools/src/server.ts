import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { exec } from 'node:child_process';
import { platform } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '4000', 10);

const html = readFileSync(join(__dirname, 'dashboard', 'index.html'), 'utf-8');

const http = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

type Role = 'host' | 'client' | 'dashboard';

const wss = new WebSocketServer({ server: http });
const connections = new Map<WebSocket, Role>();

function parseRole(url: string | undefined): Role {
  const params = new URL(url ?? '/', 'http://localhost').searchParams;
  const role = params.get('role');
  if (role === 'dashboard') return 'dashboard';
  if (role === 'host') return 'host';
  return 'client';
}

function countByRole(): { hosts: number; clients: number; dashboards: number } {
  let hosts = 0;
  let clients = 0;
  let dashboards = 0;
  for (const role of connections.values()) {
    if (role === 'host') hosts++;
    else if (role === 'client') clients++;
    else dashboards++;
  }
  return { hosts, clients, dashboards };
}

function statusLine(counts: { hosts: number; clients: number; dashboards: number }): string {
  return `hosts: ${counts.hosts}, clients: ${counts.clients}, dashboards: ${counts.dashboards}`;
}

wss.on('connection', (ws, req) => {
  const role = parseRole(req.url);
  connections.set(ws, role);

  const counts = countByRole();
  console.log(`[devtools] ${role} connected (${statusLine(counts)})`);

  if (role === 'dashboard') {
    const appConnected = counts.hosts > 0 || counts.clients > 0;
    ws.send(JSON.stringify({ type: 'status', appConnected }));
  } else {
    broadcastStatus();
  }

  ws.on('message', (raw) => {
    for (const [c] of connections) {
      if (c !== ws && c.readyState === 1) {
        c.send(raw.toString());
      }
    }
  });

  ws.on('close', () => {
    connections.delete(ws);
    const counts = countByRole();
    console.log(`[devtools] ${role} disconnected (${statusLine(counts)})`);
    if (role !== 'dashboard') broadcastStatus();
  });
});

function broadcastStatus() {
  const counts = countByRole();
  const appConnected = counts.hosts > 0 || counts.clients > 0;
  const msg = JSON.stringify({ type: 'status', appConnected });
  for (const [c, role] of connections) {
    if (role === 'dashboard' && c.readyState === 1) {
      c.send(msg);
    }
  }
}

http.listen(PORT, () => {
  console.log();
  console.log(`  \x1b[36m┌─ webview-ts DevTools ─────────────────┐\x1b[0m`);
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
