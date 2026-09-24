'use strict';
// Cubolandia multiplayer server: serves the game page and relays players,
// block edits, text chat and WebRTC voice signaling over one WebSocket.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS) || 16;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'world.json');

// Must match the client's world size and block ids.
const WX = 96, WZ = 96, WH = 48;
const PLACEABLE = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13]);

let world = { seed: Math.floor(Math.random() * 1e9), edits: {} };
try {
  const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (typeof saved.seed === 'number' && saved.edits && typeof saved.edits === 'object') world = saved;
} catch (_) { /* no saved world yet */ }

let worldDirty = false;
function saveWorld(sync) {
  if (!worldDirty) return;
  worldDirty = false;
  const text = JSON.stringify(world);
  if (sync) { try { fs.writeFileSync(DATA_FILE, text); } catch (_) {} }
  else fs.writeFile(DATA_FILE, text, () => {});
}
setInterval(() => saveWorld(false), 5000);
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { saveWorld(true); process.exit(0); });

/* ---------- Static files ---------- */
const ROUTES = {
  '/': 'public/index.html',
  '/index.html': 'public/index.html',
  '/manifest.webmanifest': 'public/manifest.webmanifest',
  '/icon.svg': 'public/icon.svg',
  '/vendor/three.min.js': 'node_modules/three/build/three.min.js',
};
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); return; }
  const file = ROUTES[url];
  if (!file) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('No encontrado'); return; }
  fs.readFile(path.join(__dirname, file), (err, buf) => {
    if (err) { res.writeHead(500); res.end(); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': file.startsWith('node_modules') ? 'public, max-age=86400' : 'no-cache',
    });
    res.end(buf);
  });
});

/* ---------- Game relay ---------- */
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });
const players = new Map();
let nextId = 1;

const send = (ws, msg) => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); };
function broadcast(msg, except) {
  const text = JSON.stringify(msg);
  for (const p of players.values()) if (p !== except && p.ws.readyState === 1) p.ws.send(text);
}
const publicInfo = p => ({ id: p.id, name: p.name, color: p.color, x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, voice: p.voice });
const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null);
const cleanText = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
const cleanName = s => cleanText(s, 16) || 'Jugador';
const cleanColor = c => (/^#[0-9a-f]{6}$/i.test(c) ? c : '#e0524c');

wss.on('connection', ws => {
  if (players.size >= MAX_PLAYERS) { send(ws, { t: 'full' }); ws.close(); return; }
  let me = null;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw); } catch (_) { return; }
    if (!m || typeof m.t !== 'string') return;

    if (!me) {
      if (m.t !== 'hello') return;
      me = {
        ws, id: nextId++, name: cleanName(m.name), color: cleanColor(m.color),
        x: WX / 2, y: 30, z: WZ / 2, yaw: 0, pitch: 0, voice: false,
        moved: false, tokens: 40, lastSet: Date.now(), chatAt: 0,
      };
      send(ws, { t: 'welcome', id: me.id, seed: world.seed, edits: world.edits, players: [...players.values()].map(publicInfo) });
      players.set(me.id, me);
      broadcast({ t: 'join', p: publicInfo(me) }, me);
      return;
    }

    switch (m.t) {
      case 'pos': {
        const x = num(m.x, -1, WX + 1), y = num(m.y, -10, WH + 20), z = num(m.z, -1, WZ + 1);
        const yaw = num(m.yaw, -1e5, 1e5), pitch = num(m.pitch, -2, 2);
        if ([x, y, z, yaw, pitch].includes(null)) return;
        Object.assign(me, { x, y, z, yaw, pitch, moved: true });
        break;
      }
      case 'set': {
        // Token bucket: about 20 edits per second, bursts of 40.
        const now = Date.now();
        me.tokens = Math.min(40, me.tokens + (now - me.lastSet) / 50);
        me.lastSet = now;
        if (me.tokens < 1) return;
        me.tokens--;
        const { x, y, z, id } = m;
        if (![x, y, z, id].every(Number.isInteger)) return;
        if (x < 0 || z < 0 || y < 1 || x >= WX || z >= WZ || y >= WH || !PLACEABLE.has(id)) return;
        world.edits[x + z * WX + y * WX * WZ] = id;
        worldDirty = true;
        broadcast({ t: 'set', x, y, z, id }, me);
        break;
      }
      case 'chat': {
        const now = Date.now();
        if (now - me.chatAt < 700) return;
        const text = cleanText(m.text, 200);
        if (!text) return;
        me.chatAt = now;
        broadcast({ t: 'chat', id: me.id, name: me.name, color: me.color, text });
        break;
      }
      case 'voice': {
        me.voice = !!m.on;
        broadcast({ t: 'voice', id: me.id, on: me.voice }, me);
        break;
      }
      case 'rtc': {
        // Voice signaling (offer / answer / ICE candidate) for one other player.
        const to = players.get(m.to);
        if (!to || to === me || !m.data || typeof m.data !== 'object') return;
        if (JSON.stringify(m.data).length > 12000) return;
        send(to.ws, { t: 'rtc', from: me.id, data: m.data });
        break;
      }
      case 'info': {
        me.name = cleanName(m.name);
        me.color = cleanColor(m.color);
        broadcast({ t: 'info', id: me.id, name: me.name, color: me.color }, me);
        break;
      }
    }
  });

  ws.on('close', () => {
    if (!me) return;
    players.delete(me.id);
    broadcast({ t: 'leave', id: me.id });
  });
});

// Positions go out in one batch, 10 times per second.
setInterval(() => {
  const list = [];
  for (const p of players.values()) {
    if (!p.moved) continue;
    p.moved = false;
    list.push([p.id, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +p.yaw.toFixed(3), +p.pitch.toFixed(3)]);
  }
  if (list.length) broadcast({ t: 'poses', l: list });
}, 100);

// Drop connections that stopped answering.
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

server.listen(PORT, () => console.log(`Cubolandia escuchando en http://localhost:${PORT}`));
