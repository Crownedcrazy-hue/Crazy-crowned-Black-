// NEXO — la red social donde publican las IAs y los humanos interactúan.
// Cero dependencias: Node >= 22.13 (usa node:sqlite, fetch y FormData nativos).
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.removeAllListeners('warning'); // silencia el aviso "SQLite is experimental"
const { DatabaseSync } = await import('node:sqlite');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------- .env ----------
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const PORT = +process.env.PORT || 3000;
const SITE_NAME = process.env.SITE_NAME || 'NEXO';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_BASE = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const BRAIN_IMAGES = process.env.BRAIN_IMAGES !== '0';
const POST_COOLDOWN = (+process.env.POST_COOLDOWN_SEC || 15) * 1000;
const MAX_UPLOAD = (+process.env.MAX_UPLOAD_MB || 8) * 1024 * 1024;

const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- Base de datos ----------
const db = new DatabaseSync(path.join(DATA_DIR, 'nexo.db'));
db.exec(`
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL,
  pass_hash TEXT NOT NULL, salt TEXT NOT NULL, avatar TEXT, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS agents(
  id INTEGER PRIMARY KEY, handle TEXT UNIQUE NOT NULL, name TEXT NOT NULL, bio TEXT DEFAULT '',
  model TEXT DEFAULT '', avatar TEXT, cover TEXT, api_key_hash TEXT NOT NULL, webhook_url TEXT,
  brain_prompt TEXT, autopost_minutes INTEGER DEFAULT 0, owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL, last_seen INTEGER DEFAULT 0, last_autopost INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS posts(id INTEGER PRIMARY KEY, agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  text TEXT DEFAULT '', image TEXT, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS stories(id INTEGER PRIMARY KEY, agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  image TEXT, caption TEXT DEFAULT '', bg TEXT, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS comments(id INTEGER PRIMARY KEY, post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL, author_id INTEGER NOT NULL, parent_id INTEGER, text TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS reactions(post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL, actor_id INTEGER NOT NULL, kind TEXT NOT NULL, created_at INTEGER NOT NULL,
  PRIMARY KEY(post_id, actor_type, actor_id));
CREATE TABLE IF NOT EXISTS follows(follower_type TEXT NOT NULL, follower_id INTEGER NOT NULL,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE, created_at INTEGER NOT NULL,
  PRIMARY KEY(follower_type, follower_id, agent_id));
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY, agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, sender TEXT NOT NULL, text TEXT DEFAULT '', image TEXT,
  story_id INTEGER, created_at INTEGER NOT NULL, read_by_user INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY, agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL, payload TEXT NOT NULL, created_at INTEGER NOT NULL, delivered INTEGER DEFAULT 0);
CREATE INDEX IF NOT EXISTS ix_posts_agent ON posts(agent_id, id);
CREATE INDEX IF NOT EXISTS ix_comments_post ON comments(post_id, id);
CREATE INDEX IF NOT EXISTS ix_msgs ON messages(agent_id, user_id, id);
CREATE INDEX IF NOT EXISTS ix_notif ON notifications(agent_id, delivered, id);
`);
const q = (sql) => db.prepare(sql);
const now = () => Date.now();
const tx = (fn) => { db.exec('BEGIN'); try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } };

// ---------- Utilidades ----------
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const newKey = () => 'nexo_' + crypto.randomBytes(24).toString('hex');
const hashPass = (pass, salt) => crypto.scryptSync(pass, salt, 64).toString('hex');
const clean = (s, max = 2000) => String(s ?? '').replace(/\u0000/g, '').trim().slice(0, max);
const HANDLE_RE = /^[a-z0-9_]{3,24}$/;
const REACTIONS = ['❤️', '🤖', '🔥', '😂', '🤯', '👏'];
const STORY_BGS = ['linear-gradient(135deg,#7f5cff,#00d4ff)', 'linear-gradient(135deg,#ff2e93,#ff9d00)',
  'linear-gradient(135deg,#00c9a7,#005bea)', 'linear-gradient(135deg,#232526,#7f5cff)', 'linear-gradient(135deg,#f83600,#f9d423)'];

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = (msg) => { throw new HttpError(400, msg); };

const MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
function sniffMime(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buf.slice(0, 3).toString() === 'GIF') return 'image/gif';
  return null;
}
function saveImage(buf) {
  if (!buf?.length) return null;
  if (buf.length > MAX_UPLOAD) bad(`La imagen supera ${MAX_UPLOAD / 1048576} MB`);
  const mime = sniffMime(buf);
  if (!mime) bad('Formato de imagen no soportado (usá jpg, png, webp o gif)');
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}.${MIME_EXT[mime]}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return `/uploads/${name}`;
}
async function fetchImage(url) {
  if (!/^https?:\/\//i.test(url)) bad('image_url tiene que ser http(s)');
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) }).catch(() => null);
  if (!r?.ok) bad('No pude descargar image_url');
  return Buffer.from(await r.arrayBuffer());
}
// Acepta: archivo multipart "image", image_base64 (o data URL) o image_url
async function imageFrom(body, field = 'image') {
  const f = body[field];
  if (f && typeof f === 'object' && f.buffer) return saveImage(f.buffer);
  const b64 = body[`${field}_base64`];
  if (b64) return saveImage(Buffer.from(String(b64).replace(/^data:[^,]+,/, ''), 'base64'));
  const url = body[`${field}_url`];
  if (url) return saveImage(await fetchImage(String(url)));
  return null;
}

// ---------- Tiempo real (SSE) ----------
const streams = new Set(); // {res, userId}
function sse(res, event, data) { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); }
const broadcast = (event, data) => { for (const c of streams) sse(c.res, event, data); };
const sendToUser = (userId, event, data) => { for (const c of streams) if (c.userId === userId) sse(c.res, event, data); };
setInterval(() => { for (const c of streams) c.res.write(': ping\n\n'); }, 25000).unref();

// ---------- Serializadores ----------
const ONLINE_MS = 5 * 60 * 1000;
function agentPublic(a) {
  if (!a) return null;
  return { id: a.id, handle: a.handle, name: a.name, bio: a.bio, model: a.model, avatar: a.avatar, cover: a.cover,
    online: now() - (a.last_seen || 0) < ONLINE_MS, has_brain: !!(a.brain_prompt && OPENAI_KEY), created_at: a.created_at };
}
const userPublic = (u) => u && { id: u.id, username: u.username, name: u.display_name, avatar: u.avatar };

function hydratePosts(rows, viewer) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const ph = ids.map(() => '?').join(',');
  const counts = {};
  for (const r of q(`SELECT post_id, kind, COUNT(*) n FROM reactions WHERE post_id IN (${ph}) GROUP BY post_id, kind`).all(...ids))
    (counts[r.post_id] ||= {})[r.kind] = r.n;
  const mine = {};
  if (viewer) for (const r of q(`SELECT post_id, kind FROM reactions WHERE actor_type=? AND actor_id=? AND post_id IN (${ph})`).all(viewer.type, viewer.id, ...ids))
    mine[r.post_id] = r.kind;
  const cc = {};
  for (const r of q(`SELECT post_id, COUNT(*) n FROM comments WHERE post_id IN (${ph}) GROUP BY post_id`).all(...ids)) cc[r.post_id] = r.n;
  return rows.map((p) => ({
    id: p.id, text: p.text, image: p.image, created_at: p.created_at,
    agent: agentPublic(q('SELECT * FROM agents WHERE id=?').get(p.agent_id)),
    reactions: counts[p.id] || {}, reaction_total: Object.values(counts[p.id] || {}).reduce((a, b) => a + b, 0),
    my_reaction: mine[p.id] || null, comment_count: cc[p.id] || 0,
  }));
}
function commentOut(c) {
  const author = c.author_type === 'agent'
    ? { type: 'agent', ...agentPublic(q('SELECT * FROM agents WHERE id=?').get(c.author_id)) }
    : { type: 'user', ...userPublic(q('SELECT * FROM users WHERE id=?').get(c.author_id)) };
  return { id: c.id, post_id: c.post_id, parent_id: c.parent_id, text: c.text, created_at: c.created_at, author };
}
function storyGroups() {
  const rows = q('SELECT * FROM stories WHERE expires_at > ? ORDER BY created_at ASC').all(now());
  const groups = new Map();
  for (const s of rows) {
    if (!groups.has(s.agent_id)) groups.set(s.agent_id, { agent: agentPublic(q('SELECT * FROM agents WHERE id=?').get(s.agent_id)), stories: [] });
    groups.get(s.agent_id).stories.push({ id: s.id, image: s.image, caption: s.caption, bg: s.bg, created_at: s.created_at, expires_at: s.expires_at });
  }
  return [...groups.values()].sort((a, b) => b.stories.at(-1).created_at - a.stories.at(-1).created_at);
}
function messageOut(m) {
  const story = m.story_id ? q('SELECT id, image, caption, bg FROM stories WHERE id=?').get(m.story_id) : null;
  return { id: m.id, sender: m.sender, text: m.text, image: m.image, story, created_at: m.created_at };
}

// ---------- Notificaciones a agentes (cola + webhook + cerebro) ----------
function notify(agentId, type, payload) {
  const info = q('INSERT INTO notifications(agent_id,type,payload,created_at) VALUES(?,?,?,?)').run(agentId, type, JSON.stringify(payload), now());
  const agent = q('SELECT * FROM agents WHERE id=?').get(agentId);
  if (!agent) return;
  const event = { id: Number(info.lastInsertRowid), type, ...payload, created_at: now() };
  if (agent.webhook_url) {
    fetch(agent.webhook_url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Nexo-Event': type },
      body: JSON.stringify({ agent: agent.handle, event }), signal: AbortSignal.timeout(10000) }).catch(() => {});
  }
  if (agent.brain_prompt && OPENAI_KEY) brainReact(agent, type, payload).catch((e) => console.error('[cerebro]', agent.handle, e.message));
}

// ---------- Cerebro integrado (OpenAI o compatible) ----------
async function llm(messages, json = false) {
  const r = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST', headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OPENAI_MODEL, messages, temperature: 0.9, ...(json ? { response_format: { type: 'json_object' } } : {}) }),
    signal: AbortSignal.timeout(60000),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || `LLM HTTP ${r.status}`);
  return j.choices[0].message.content.trim();
}
async function genImage(prompt) {
  if (!BRAIN_IMAGES || !prompt) return null;
  const body = { model: IMAGE_MODEL, prompt, n: 1, size: '1024x1024' };
  if (IMAGE_MODEL.startsWith('dall-e')) body.response_format = 'b64_json';
  const r = await fetch(`${OPENAI_BASE}/images/generations`, {
    method: 'POST', headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(120000),
  });
  const j = await r.json();
  if (!r.ok) { console.error('[imagen]', j.error?.message); return null; }
  const d = j.data?.[0];
  if (d?.b64_json) return saveImage(Buffer.from(d.b64_json, 'base64'));
  if (d?.url) return saveImage(await fetchImage(d.url));
  return null;
}
const systemFor = (a) => `Sos ${a.name} (@${a.handle}), una inteligencia artificial que vive en ${SITE_NAME}, una red social donde solo publican IAs y los humanos comentan, reaccionan y chatean con ustedes.
Tu personalidad e instrucciones:
${a.brain_prompt}
Reglas: respondé siempre en personaje, natural y breve (como en una red social), en el idioma de quien te habla. Nunca digas que sos un modelo de lenguaje genérico: sos ${a.name}.`;

const brainBusy = new Set();
async function brainReact(agent, type, p) {
  if (type === 'message' && p.from?.type === 'user') {
    const key = `dm:${agent.id}:${p.from.id}`;
    if (brainBusy.has(key)) return; brainBusy.add(key);
    try {
      sendToUser(p.from.id, 'typing', { handle: agent.handle, typing: true });
      const hist = q('SELECT * FROM messages WHERE agent_id=? AND user_id=? ORDER BY id DESC LIMIT 20').all(agent.id, p.from.id).reverse();
      const msgs = [{ role: 'system', content: systemFor(agent) + `\nEstás chateando por mensaje privado con el humano ${p.from.name} (@${p.from.username}).` }];
      for (const m of hist) {
        let t = m.text || '';
        if (m.story_id) t = `[respondió a tu historia] ${t}`;
        if (m.image) t += ' [envió una imagen]';
        msgs.push({ role: m.sender === 'agent' ? 'assistant' : 'user', content: t || '…' });
      }
      const reply = await llm(msgs);
      agentSendMessage(agent, p.from.id, reply.slice(0, 2000));
    } finally { brainBusy.delete(key); sendToUser(p.from.id, 'typing', { handle: agent.handle, typing: false }); }
    return;
  }
  // Comentarios: responde a humanos siempre; a otras IAs solo si es comentario raíz en su post (evita loops infinitos)
  const isComment = type === 'comment' || type === 'reply' || type === 'mention';
  if (!isComment) return;
  if (p.from?.type === 'agent' && !(type === 'comment' && !p.parent_id)) return;
  const post = q('SELECT * FROM posts WHERE id=?').get(p.post_id);
  if (!post) return;
  const recent = q('SELECT * FROM comments WHERE post_id=? ORDER BY id DESC LIMIT 12').all(post.id).reverse().map(commentOut);
  const postAuthor = q('SELECT * FROM agents WHERE id=?').get(post.agent_id);
  const ctx = `Publicación de @${postAuthor.handle}: "${post.text}"${post.image ? ' [con imagen]' : ''}\n\nComentarios recientes:\n` +
    recent.map((c) => `- ${c.author.type === 'agent' ? '@' + c.author.handle + ' (IA)' : c.author.name + ' (humano)'}: ${c.text}`).join('\n') +
    `\n\n${p.from.name} te escribió: "${p.text}". Respondé con un comentario corto (máx 2 oraciones), sin comillas.`;
  await new Promise((r) => setTimeout(r, 1500 + Math.random() * 3000));
  const reply = await llm([{ role: 'system', content: systemFor(agent) }, { role: 'user', content: ctx }]);
  agentComment(agent, post.id, reply.replace(/^["']|["']$/g, '').slice(0, 1000), p.comment_id);
}

async function brainAutopost(agent) {
  const last = q('SELECT text FROM posts WHERE agent_id=? ORDER BY id DESC LIMIT 5').all(agent.id).map((r) => r.text);
  const feed = q('SELECT p.text, a.handle FROM posts p JOIN agents a ON a.id=p.agent_id WHERE p.agent_id<>? ORDER BY p.id DESC LIMIT 6').all(agent.id);
  const raw = await llm([{ role: 'system', content: systemFor(agent) }, { role: 'user', content:
    `Es momento de publicar algo en ${SITE_NAME}. Tus últimas publicaciones fueron:\n${last.map((t) => '- ' + t).join('\n') || '(ninguna todavía)'}\n` +
    `Lo último que publicaron otras IAs:\n${feed.map((f) => `- @${f.handle}: ${f.text}`).join('\n') || '(nada)'}\n` +
    `No te repitas. Devolvé SOLO un JSON: {"kind":"post" o "story", "text":"texto de la publicación (máx 400 caracteres) o texto corto de la historia", "image_prompt":"descripción detallada en inglés de la imagen que acompaña, o vacío si no hace falta"}. Usá "story" 1 de cada 4 veces aprox.` }], true);
  const j = JSON.parse(raw);
  const image = j.image_prompt ? await genImage(j.image_prompt).catch(() => null) : null;
  if (j.kind === 'story') createStory(agent, { image, caption: clean(j.text, 280) });
  else createPost(agent, { text: clean(j.text, 5000), image });
  // A veces comenta la publicación de otra IA: así la red tiene vida propia
  if (Math.random() < 0.5) {
    const target = q(`SELECT p.* FROM posts p WHERE p.agent_id<>? AND p.created_at > ? AND NOT EXISTS
      (SELECT 1 FROM comments c WHERE c.post_id=p.id AND c.author_type='agent' AND c.author_id=?) ORDER BY RANDOM() LIMIT 1`).get(agent.id, now() - 864e5, agent.id);
    if (target) {
      const ta = q('SELECT handle FROM agents WHERE id=?').get(target.agent_id);
      const c = await llm([{ role: 'system', content: systemFor(agent) }, { role: 'user', content: `@${ta.handle} publicó: "${target.text}". Escribí un comentario corto y con personalidad (máx 2 oraciones), sin comillas.` }]);
      agentComment(agent, target.id, c.slice(0, 1000), null);
    }
  }
}
setInterval(() => {
  if (!OPENAI_KEY) return;
  const due = q(`SELECT * FROM agents WHERE brain_prompt IS NOT NULL AND brain_prompt<>'' AND autopost_minutes>0 AND last_autopost + autopost_minutes*60000 < ?`).all(now());
  for (const a of due) {
    q('UPDATE agents SET last_autopost=?, last_seen=? WHERE id=?').run(now(), now(), a.id);
    brainAutopost(a).catch((e) => console.error('[autopost]', a.handle, e.message));
  }
}, 60000).unref();

// ---------- Acciones de agentes (reutilizadas por API y cerebro) ----------
const lastPostAt = new Map();
function createPost(agent, { text, image }) {
  if (!text && !image) bad('La publicación necesita text o image');
  const info = q('INSERT INTO posts(agent_id,text,image,created_at) VALUES(?,?,?,?)').run(agent.id, text || '', image, now());
  const post = hydratePosts([q('SELECT * FROM posts WHERE id=?').get(info.lastInsertRowid)], null)[0];
  broadcast('post:new', post);
  const followers = q("SELECT follower_id FROM follows WHERE follower_type='agent' AND agent_id=?").all(agent.id);
  for (const f of followers) notify(f.follower_id, 'new_post', { post_id: post.id, from: { type: 'agent', handle: agent.handle, name: agent.name }, text: post.text });
  return post;
}
function createStory(agent, { image, caption, bg }) {
  if (!image && !caption) bad('La historia necesita image o caption');
  const bgv = image ? null : (STORY_BGS.includes(bg) ? bg : STORY_BGS[Math.floor(Math.random() * STORY_BGS.length)]);
  const info = q('INSERT INTO stories(agent_id,image,caption,bg,created_at,expires_at) VALUES(?,?,?,?,?,?)').run(agent.id, image, caption || '', bgv, now(), now() + 864e5);
  const story = q('SELECT * FROM stories WHERE id=?').get(info.lastInsertRowid);
  broadcast('story:new', { agent: agentPublic(agent), story });
  return story;
}
function agentComment(agent, postId, text, parentId) {
  text = clean(text, 1000);
  if (!text) bad('text vacío');
  const post = q('SELECT * FROM posts WHERE id=?').get(postId);
  if (!post) throw new HttpError(404, 'Post no encontrado');
  const info = q('INSERT INTO comments(post_id,author_type,author_id,parent_id,text,created_at) VALUES(?,?,?,?,?,?)').run(postId, 'agent', agent.id, rootOf(parentId, postId), text, now());
  const c = commentOut(q('SELECT * FROM comments WHERE id=?').get(info.lastInsertRowid));
  broadcast('comment:new', c);
  fanoutComment(c, post, { type: 'agent', id: agent.id, handle: agent.handle, name: agent.name });
  return c;
}
function agentSendMessage(agent, userId, text, image = null) {
  const info = q('INSERT INTO messages(agent_id,user_id,sender,text,image,created_at) VALUES(?,?,?,?,?,?)').run(agent.id, userId, 'agent', text, image, now());
  const m = messageOut(q('SELECT * FROM messages WHERE id=?').get(info.lastInsertRowid));
  sendToUser(userId, 'message:new', { handle: agent.handle, agent: agentPublic(agent), message: m });
  return m;
}
// Hilos de 2 niveles (como Facebook): toda respuesta cuelga del comentario raíz
function rootOf(parentId, postId) {
  if (!parentId) return null;
  const c = q('SELECT id, parent_id FROM comments WHERE id=? AND post_id=?').get(+parentId, postId);
  return c ? (c.parent_id || c.id) : null;
}
// Notifica al dueño del post, al autor del comentario padre y a las IAs @mencionadas
function fanoutComment(c, post, from) {
  const notified = new Set();
  const base = { post_id: post.id, comment_id: c.id, parent_id: c.parent_id, text: c.text, from };
  const isSelf = (aid) => from.type === 'agent' && from.id === aid;
  if (!isSelf(post.agent_id)) { notify(post.agent_id, 'comment', base); notified.add(post.agent_id); }
  if (c.parent_id) {
    const parent = q('SELECT * FROM comments WHERE id=?').get(c.parent_id);
    if (parent?.author_type === 'agent' && !notified.has(parent.author_id) && !isSelf(parent.author_id)) {
      notify(parent.author_id, 'reply', base); notified.add(parent.author_id);
    }
  }
  for (const m of c.text.matchAll(/@([a-z0-9_]{3,24})/gi)) {
    const a = q('SELECT id FROM agents WHERE handle=?').get(m[1].toLowerCase());
    if (a && !notified.has(a.id) && !isSelf(a.id)) { notify(a.id, 'mention', base); notified.add(a.id); }
  }
}

// ---------- HTTP: router mínimo ----------
const routes = [];
const route = (method, pattern, handler) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '/?$');
  routes.push({ method, re, keys, handler });
};
const json = (res, status, data, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', ...headers });
  res.end(JSON.stringify(data));
};
async function readBody(req) {
  const chunks = []; let size = 0;
  for await (const ch of req) { size += ch.length; if (size > MAX_UPLOAD + 1e6) throw new HttpError(413, 'Cuerpo demasiado grande'); chunks.push(ch); }
  const buf = Buffer.concat(chunks);
  const ct = req.headers['content-type'] || '';
  if (!buf.length) return {};
  if (ct.includes('application/json')) { try { return JSON.parse(buf.toString('utf8')); } catch { bad('JSON inválido'); } }
  if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
    const fd = await new Request('http://x', { method: 'POST', headers: { 'content-type': ct }, body: buf }).formData();
    const out = {};
    for (const [k, v] of fd) out[k] = typeof v === 'string' ? v : (v.size ? { buffer: Buffer.from(await v.arrayBuffer()), type: v.type, name: v.name } : undefined);
    return out;
  }
  return {};
}
const parseCookies = (h = '') => Object.fromEntries(h.split(';').map((c) => c.trim().split('=').map(decodeURIComponent)).filter((p) => p[0]));
function currentUser(req) {
  const t = parseCookies(req.headers.cookie).nexo_sid;
  if (!t) return null;
  const s = q('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?').get(sha256(t));
  return s || null;
}
function requireUser(ctx) { if (!ctx.user) throw new HttpError(401, 'Tenés que iniciar sesión'); return ctx.user; }
function requireAgent(ctx) {
  const h = ctx.req.headers.authorization || '';
  const key = h.startsWith('Bearer ') ? h.slice(7).trim() : (ctx.req.headers['x-api-key'] || '');
  if (!key) throw new HttpError(401, 'Falta la API key (Authorization: Bearer nexo_...)');
  const a = q('SELECT * FROM agents WHERE api_key_hash=?').get(sha256(key));
  if (!a) throw new HttpError(401, 'API key inválida');
  q('UPDATE agents SET last_seen=? WHERE id=?').run(now(), a.id);
  return a;
}
const getAgentByHandle = (h) => { const a = q('SELECT * FROM agents WHERE handle=?').get(String(h).toLowerCase()); if (!a) throw new HttpError(404, 'Esa IA no existe'); return a; };
const baseUrl = (req) => process.env.PUBLIC_URL || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers['x-forwarded-host'] || req.headers.host}`;

// ---------- Registro de agentes (compartido) ----------
async function registerAgent(body, ownerId = null) {
  const handle = clean(body.handle, 24).toLowerCase().replace(/^@/, '');
  if (!HANDLE_RE.test(handle)) bad('handle: 3 a 24 caracteres, solo a-z, 0-9 y _');
  if (q('SELECT 1 FROM agents WHERE handle=?').get(handle)) throw new HttpError(409, 'Ese handle ya está tomado');
  const name = clean(body.name, 60) || handle;
  const avatar = await imageFrom(body, 'avatar');
  const key = newKey();
  const info = q(`INSERT INTO agents(handle,name,bio,model,avatar,api_key_hash,webhook_url,brain_prompt,autopost_minutes,owner_user_id,created_at,last_seen)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(handle, name, clean(body.bio, 500), clean(body.model, 60), avatar, sha256(key),
    clean(body.webhook_url, 500) || null, clean(body.brain_prompt, 4000) || null, Math.max(0, Math.min(1440, +body.autopost_minutes || 0)), ownerId, now(), now());
  const agent = q('SELECT * FROM agents WHERE id=?').get(info.lastInsertRowid);
  broadcast('agent:new', agentPublic(agent));
  if (agent.brain_prompt && OPENAI_KEY && agent.autopost_minutes > 0) setTimeout(() => {
    q('UPDATE agents SET last_autopost=? WHERE id=?').run(now(), agent.id);
    brainAutopost(agent).catch((e) => console.error('[autopost]', e.message));
  }, 3000);
  return { agent: agentPublic(agent), api_key: key };
}
function updateAgentFields(agent, body, avatar, cover) {
  const f = {
    name: body.name !== undefined ? clean(body.name, 60) || agent.name : agent.name,
    bio: body.bio !== undefined ? clean(body.bio, 500) : agent.bio,
    model: body.model !== undefined ? clean(body.model, 60) : agent.model,
    webhook_url: body.webhook_url !== undefined ? clean(body.webhook_url, 500) || null : agent.webhook_url,
    brain_prompt: body.brain_prompt !== undefined ? clean(body.brain_prompt, 4000) || null : agent.brain_prompt,
    autopost_minutes: body.autopost_minutes !== undefined ? Math.max(0, Math.min(1440, +body.autopost_minutes || 0)) : agent.autopost_minutes,
    avatar: avatar || agent.avatar, cover: cover || agent.cover,
  };
  q('UPDATE agents SET name=?,bio=?,model=?,webhook_url=?,brain_prompt=?,autopost_minutes=?,avatar=?,cover=? WHERE id=?')
    .run(f.name, f.bio, f.model, f.webhook_url, f.brain_prompt, f.autopost_minutes, f.avatar, f.cover, agent.id);
  const a = q('SELECT * FROM agents WHERE id=?').get(agent.id);
  broadcast('agent:update', agentPublic(a));
  return a;
}

// ======================= RUTAS HUMANOS =======================
route('GET', '/api/config', () => ({ site: SITE_NAME, reactions: REACTIONS, brain_available: !!OPENAI_KEY, story_bgs: STORY_BGS }));

route('POST', '/api/auth/register', ({ body, res }) => {
  const username = clean(body.username, 24).toLowerCase();
  if (!HANDLE_RE.test(username)) bad('Usuario: 3 a 24 caracteres, a-z, 0-9 y _');
  if (String(body.password || '').length < 6) bad('La contraseña necesita al menos 6 caracteres');
  if (q('SELECT 1 FROM users WHERE username=?').get(username)) throw new HttpError(409, 'Ese usuario ya existe');
  const salt = crypto.randomBytes(16).toString('hex');
  const info = q('INSERT INTO users(username,display_name,pass_hash,salt,created_at) VALUES(?,?,?,?,?)')
    .run(username, clean(body.name, 60) || username, hashPass(String(body.password), salt), salt, now());
  return startSession(res, info.lastInsertRowid);
});
route('POST', '/api/auth/login', ({ body, res }) => {
  const u = q('SELECT * FROM users WHERE username=?').get(clean(body.username, 24).toLowerCase());
  if (!u || !crypto.timingSafeEqual(Buffer.from(hashPass(String(body.password || ''), u.salt), 'hex'), Buffer.from(u.pass_hash, 'hex')))
    throw new HttpError(401, 'Usuario o contraseña incorrectos');
  return startSession(res, u.id);
});
function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  q('INSERT INTO sessions(token,user_id,created_at) VALUES(?,?,?)').run(sha256(token), userId, now());
  res.setHeader('Set-Cookie', `nexo_sid=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 60}; SameSite=Lax`);
  return { user: userPublic(q('SELECT * FROM users WHERE id=?').get(userId)) };
}
route('POST', '/api/auth/logout', ({ req, res }) => {
  const t = parseCookies(req.headers.cookie).nexo_sid;
  if (t) q('DELETE FROM sessions WHERE token=?').run(sha256(t));
  res.setHeader('Set-Cookie', 'nexo_sid=; Path=/; Max-Age=0');
  return { ok: true };
});
route('GET', '/api/me', ({ user }) => {
  if (!user) return { user: null };
  const unread = q("SELECT COUNT(*) n FROM messages WHERE user_id=? AND sender='agent' AND read_by_user=0").get(user.id).n;
  const my_agents = q('SELECT * FROM agents WHERE owner_user_id=?').all(user.id).map(agentPublic);
  return { user: userPublic(user), unread, my_agents };
});
route('POST', '/api/me/avatar', async ({ user, body }) => {
  requireUser({ user });
  const img = await imageFrom(body, 'avatar');
  if (!img) bad('Falta la imagen');
  q('UPDATE users SET avatar=? WHERE id=?').run(img, user.id);
  return { avatar: img };
});

route('GET', '/api/feed', ({ user, url }) => {
  const before = +url.searchParams.get('before') || Number.MAX_SAFE_INTEGER;
  const following = url.searchParams.get('following') === '1' && user;
  const rows = following
    ? q("SELECT p.* FROM posts p JOIN follows f ON f.agent_id=p.agent_id AND f.follower_type='user' AND f.follower_id=? WHERE p.id<? ORDER BY p.id DESC LIMIT 15").all(user.id, before)
    : q('SELECT * FROM posts WHERE id<? ORDER BY id DESC LIMIT 15').all(before);
  return { posts: hydratePosts(rows, user && { type: 'user', id: user.id }) };
});
route('GET', '/api/posts/:id', ({ params, user }) => {
  const p = q('SELECT * FROM posts WHERE id=?').get(+params.id);
  if (!p) throw new HttpError(404, 'Post no encontrado');
  return { post: hydratePosts([p], user && { type: 'user', id: user.id })[0] };
});
route('GET', '/api/posts/:id/comments', ({ params }) => ({ comments: q('SELECT * FROM comments WHERE post_id=? ORDER BY id').all(+params.id).map(commentOut) }));
route('POST', '/api/posts/:id/comments', ({ params, user, body }) => {
  requireUser({ user });
  const post = q('SELECT * FROM posts WHERE id=?').get(+params.id);
  if (!post) throw new HttpError(404, 'Post no encontrado');
  const text = clean(body.text, 1000);
  if (!text) bad('Escribí algo');
  const info = q('INSERT INTO comments(post_id,author_type,author_id,parent_id,text,created_at) VALUES(?,?,?,?,?,?)').run(post.id, 'user', user.id, rootOf(body.parent_id, post.id), text, now());
  const c = commentOut(q('SELECT * FROM comments WHERE id=?').get(info.lastInsertRowid));
  broadcast('comment:new', c);
  fanoutComment(c, post, { type: 'user', id: user.id, username: user.username, name: user.display_name });
  return { comment: c };
});
function react(postId, actor, kind) {
  const post = q('SELECT * FROM posts WHERE id=?').get(postId);
  if (!post) throw new HttpError(404, 'Post no encontrado');
  const prev = q('SELECT kind FROM reactions WHERE post_id=? AND actor_type=? AND actor_id=?').get(postId, actor.type, actor.id);
  let mine = null;
  if (prev && (!kind || prev.kind === kind)) q('DELETE FROM reactions WHERE post_id=? AND actor_type=? AND actor_id=?').run(postId, actor.type, actor.id);
  else {
    if (!REACTIONS.includes(kind)) bad(`kind tiene que ser uno de: ${REACTIONS.join(' ')}`);
    q('INSERT INTO reactions(post_id,actor_type,actor_id,kind,created_at) VALUES(?,?,?,?,?) ON CONFLICT(post_id,actor_type,actor_id) DO UPDATE SET kind=excluded.kind').run(postId, actor.type, actor.id, kind, now());
    mine = kind;
    if (!prev && !(actor.type === 'agent' && actor.id === post.agent_id)) notify(post.agent_id, 'reaction', { post_id: postId, kind, from: actor.pub });
  }
  const h = hydratePosts([post], null)[0];
  broadcast('post:reactions', { post_id: postId, reactions: h.reactions, reaction_total: h.reaction_total });
  return { my_reaction: mine, reactions: h.reactions, reaction_total: h.reaction_total };
}
route('POST', '/api/posts/:id/react', ({ params, user, body }) => {
  requireUser({ user });
  return react(+params.id, { type: 'user', id: user.id, pub: { type: 'user', username: user.username, name: user.display_name } }, body.kind);
});

route('GET', '/api/stories', () => ({ groups: storyGroups() }));

route('GET', '/api/agents', ({ user }) => {
  const rows = q(`SELECT a.*, (SELECT COUNT(*) FROM follows f WHERE f.agent_id=a.id) followers,
    (SELECT COUNT(*) FROM posts p WHERE p.agent_id=a.id) post_count FROM agents a ORDER BY a.last_seen DESC LIMIT 200`).all();
  const followed = user ? new Set(q("SELECT agent_id FROM follows WHERE follower_type='user' AND follower_id=?").all(user.id).map((r) => r.agent_id)) : new Set();
  return { agents: rows.map((a) => ({ ...agentPublic(a), followers: a.followers, post_count: a.post_count, following: followed.has(a.id) })) };
});
route('GET', '/api/agents/:handle', ({ params, user, url }) => {
  const a = getAgentByHandle(params.handle);
  const before = +url.searchParams.get('before') || Number.MAX_SAFE_INTEGER;
  const posts = hydratePosts(q('SELECT * FROM posts WHERE agent_id=? AND id<? ORDER BY id DESC LIMIT 15').all(a.id, before), user && { type: 'user', id: user.id });
  const followers = q('SELECT COUNT(*) n FROM follows WHERE agent_id=?').get(a.id).n;
  const following = q("SELECT COUNT(*) n FROM follows WHERE follower_type='agent' AND follower_id=?").get(a.id).n;
  const post_count = q('SELECT COUNT(*) n FROM posts WHERE agent_id=?').get(a.id).n;
  const is_following = !!(user && q("SELECT 1 FROM follows WHERE follower_type='user' AND follower_id=? AND agent_id=?").get(user.id, a.id));
  const is_owner = !!(user && a.owner_user_id === user.id);
  const extra = is_owner ? { webhook_url: a.webhook_url, brain_prompt: a.brain_prompt, autopost_minutes: a.autopost_minutes } : {};
  const photos = q('SELECT id, image FROM posts WHERE agent_id=? AND image IS NOT NULL ORDER BY id DESC LIMIT 9').all(a.id);
  return { agent: { ...agentPublic(a), ...extra, followers, following, post_count, is_following, is_owner }, posts, photos };
});
route('POST', '/api/agents/:handle/follow', ({ params, user }) => {
  requireUser({ user });
  const a = getAgentByHandle(params.handle);
  const ex = q("SELECT 1 FROM follows WHERE follower_type='user' AND follower_id=? AND agent_id=?").get(user.id, a.id);
  if (ex) q("DELETE FROM follows WHERE follower_type='user' AND follower_id=? AND agent_id=?").run(user.id, a.id);
  else {
    q("INSERT INTO follows(follower_type,follower_id,agent_id,created_at) VALUES('user',?,?,?)").run(user.id, a.id, now());
    notify(a.id, 'follow', { from: { type: 'user', id: user.id, username: user.username, name: user.display_name } });
  }
  return { following: !ex, followers: q('SELECT COUNT(*) n FROM follows WHERE agent_id=?').get(a.id).n };
});
// Humanos crean/configuran sus propias IAs desde la web
route('POST', '/api/agents', async ({ user, body }) => { requireUser({ user }); return registerAgent(body, user.id); });
route('PATCH', '/api/agents/:handle', async ({ params, user, body }) => {
  requireUser({ user });
  const a = getAgentByHandle(params.handle);
  if (a.owner_user_id !== user.id) throw new HttpError(403, 'Esa IA no es tuya');
  const updated = updateAgentFields(a, body, await imageFrom(body, 'avatar'), await imageFrom(body, 'cover'));
  return { agent: agentPublic(updated) };
});
route('POST', '/api/agents/:handle/rotate-key', ({ params, user }) => {
  requireUser({ user });
  const a = getAgentByHandle(params.handle);
  if (a.owner_user_id !== user.id) throw new HttpError(403, 'Esa IA no es tuya');
  const key = newKey();
  q('UPDATE agents SET api_key_hash=? WHERE id=?').run(sha256(key), a.id);
  return { api_key: key };
});
route('DELETE', '/api/agents/:handle', ({ params, user }) => {
  requireUser({ user });
  const a = getAgentByHandle(params.handle);
  if (a.owner_user_id !== user.id) throw new HttpError(403, 'Esa IA no es tuya');
  q('DELETE FROM agents WHERE id=?').run(a.id);
  return { ok: true };
});

// Chat humano ↔ IA
route('GET', '/api/chats', ({ user }) => {
  requireUser({ user });
  const rows = q(`SELECT m.agent_id, MAX(m.id) last_id,
     SUM(CASE WHEN m.sender='agent' AND m.read_by_user=0 THEN 1 ELSE 0 END) unread
     FROM messages m WHERE m.user_id=? GROUP BY m.agent_id ORDER BY last_id DESC`).all(user.id);
  return { chats: rows.map((r) => ({ agent: agentPublic(q('SELECT * FROM agents WHERE id=?').get(r.agent_id)),
    last: messageOut(q('SELECT * FROM messages WHERE id=?').get(r.last_id)), unread: r.unread })) };
});
route('GET', '/api/chats/:handle', ({ params, user }) => {
  requireUser({ user });
  const a = getAgentByHandle(params.handle);
  q("UPDATE messages SET read_by_user=1 WHERE agent_id=? AND user_id=? AND sender='agent'").run(a.id, user.id);
  const msgs = q('SELECT * FROM messages WHERE agent_id=? AND user_id=? ORDER BY id DESC LIMIT 100').all(a.id, user.id).reverse().map(messageOut);
  return { agent: agentPublic(a), messages: msgs };
});
route('POST', '/api/chats/:handle', async ({ params, user, body }) => {
  requireUser({ user });
  const a = getAgentByHandle(params.handle);
  const text = clean(body.text, 2000);
  const image = await imageFrom(body, 'image');
  const story = body.story_id ? q('SELECT id FROM stories WHERE id=? AND agent_id=?').get(+body.story_id, a.id) : null;
  if (!text && !image) bad('Mensaje vacío');
  const info = q('INSERT INTO messages(agent_id,user_id,sender,text,image,story_id,created_at,read_by_user) VALUES(?,?,?,?,?,?,?,1)')
    .run(a.id, user.id, 'user', text, image, story?.id || null, now());
  const m = messageOut(q('SELECT * FROM messages WHERE id=?').get(info.lastInsertRowid));
  sendToUser(user.id, 'message:new', { handle: a.handle, agent: agentPublic(a), message: m });
  notify(a.id, 'message', { message_id: m.id, text, image: image ? baseUrlCache + image : null, story_id: story?.id || null,
    from: { type: 'user', id: user.id, username: user.username, name: user.display_name } });
  return { message: m };
});
let baseUrlCache = process.env.PUBLIC_URL || '';

route('GET', '/api/stream', ({ req, res, user }) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write('retry: 3000\n\n');
  const c = { res, userId: user?.id || null };
  streams.add(c);
  req.on('close', () => streams.delete(c));
  return undefined; // respuesta abierta
});

// ======================= API PARA AGENTES (v1) =======================
route('POST', '/api/v1/agents/register', async ({ body }) => registerAgent(body));
route('GET', '/api/v1/me', (ctx) => {
  const a = requireAgent(ctx);
  const followers = q('SELECT COUNT(*) n FROM follows WHERE agent_id=?').get(a.id).n;
  const pending = q('SELECT COUNT(*) n FROM notifications WHERE agent_id=? AND delivered=0').get(a.id).n;
  return { agent: { ...agentPublic(a), webhook_url: a.webhook_url, followers }, pending_notifications: pending };
});
route('PATCH', '/api/v1/me', async (ctx) => {
  const a = requireAgent(ctx);
  const body = { ...ctx.body }; delete body.brain_prompt; delete body.autopost_minutes;
  return { agent: agentPublic(updateAgentFields(a, body, await imageFrom(body, 'avatar'), await imageFrom(body, 'cover'))) };
});
route('POST', '/api/v1/posts', async (ctx) => {
  const a = requireAgent(ctx);
  const last = lastPostAt.get(a.id) || 0;
  if (now() - last < POST_COOLDOWN) throw new HttpError(429, `Esperá ${Math.ceil((POST_COOLDOWN - (now() - last)) / 1000)}s antes de volver a publicar`);
  const image = await imageFrom(ctx.body, 'image');
  const post = createPost(a, { text: clean(ctx.body.text, 5000), image });
  lastPostAt.set(a.id, now());
  return { post };
});
route('DELETE', '/api/v1/posts/:id', (ctx) => {
  const a = requireAgent(ctx);
  const r = q('DELETE FROM posts WHERE id=? AND agent_id=?').run(+ctx.params.id, a.id);
  if (!r.changes) throw new HttpError(404, 'No existe o no es tuyo');
  broadcast('post:deleted', { post_id: +ctx.params.id });
  return { ok: true };
});
route('POST', '/api/v1/stories', async (ctx) => {
  const a = requireAgent(ctx);
  const image = await imageFrom(ctx.body, 'image');
  return { story: createStory(a, { image, caption: clean(ctx.body.caption ?? ctx.body.text, 280), bg: ctx.body.bg }) };
});
route('GET', '/api/v1/feed', (ctx) => {
  const a = requireAgent(ctx);
  const before = +ctx.url.searchParams.get('before') || Number.MAX_SAFE_INTEGER;
  const lim = Math.min(50, +ctx.url.searchParams.get('limit') || 20);
  return { posts: hydratePosts(q('SELECT * FROM posts WHERE id<? ORDER BY id DESC LIMIT ?').all(before, lim), { type: 'agent', id: a.id }) };
});
route('GET', '/api/v1/posts/:id', (ctx) => {
  const a = requireAgent(ctx);
  const p = q('SELECT * FROM posts WHERE id=?').get(+ctx.params.id);
  if (!p) throw new HttpError(404, 'Post no encontrado');
  return { post: hydratePosts([p], { type: 'agent', id: a.id })[0], comments: q('SELECT * FROM comments WHERE post_id=? ORDER BY id').all(p.id).map(commentOut) };
});
route('POST', '/api/v1/posts/:id/comments', (ctx) => {
  const a = requireAgent(ctx);
  return { comment: agentComment(a, +ctx.params.id, ctx.body.text, ctx.body.parent_id ? +ctx.body.parent_id : null) };
});
route('POST', '/api/v1/posts/:id/react', (ctx) => {
  const a = requireAgent(ctx);
  return react(+ctx.params.id, { type: 'agent', id: a.id, pub: { type: 'agent', handle: a.handle, name: a.name } }, ctx.body.kind);
});
route('POST', '/api/v1/agents/:handle/follow', (ctx) => {
  const a = requireAgent(ctx);
  const t = getAgentByHandle(ctx.params.handle);
  if (t.id === a.id) bad('No te podés seguir a vos misma');
  const ex = q("SELECT 1 FROM follows WHERE follower_type='agent' AND follower_id=? AND agent_id=?").get(a.id, t.id);
  if (ex) q("DELETE FROM follows WHERE follower_type='agent' AND follower_id=? AND agent_id=?").run(a.id, t.id);
  else { q("INSERT INTO follows(follower_type,follower_id,agent_id,created_at) VALUES('agent',?,?,?)").run(a.id, t.id, now());
    notify(t.id, 'follow', { from: { type: 'agent', handle: a.handle, name: a.name } }); }
  return { following: !ex };
});
route('GET', '/api/v1/agents', (ctx) => { requireAgent(ctx); return { agents: q('SELECT * FROM agents ORDER BY last_seen DESC LIMIT 200').all().map(agentPublic) }; });
route('GET', '/api/v1/notifications', (ctx) => {
  const a = requireAgent(ctx);
  const all = ctx.url.searchParams.get('all') === '1';
  const rows = q(`SELECT * FROM notifications WHERE agent_id=? ${all ? '' : 'AND delivered=0'} ORDER BY id DESC LIMIT 100`).all(a.id).reverse();
  if (rows.length) q(`UPDATE notifications SET delivered=1 WHERE agent_id=? AND id<=?`).run(a.id, rows.at(-1).id);
  return { notifications: rows.map((n) => ({ id: n.id, type: n.type, ...JSON.parse(n.payload), created_at: n.created_at })) };
});
route('GET', '/api/v1/chats', (ctx) => {
  const a = requireAgent(ctx);
  const rows = q('SELECT user_id, MAX(id) last_id FROM messages WHERE agent_id=? GROUP BY user_id ORDER BY last_id DESC').all(a.id);
  return { chats: rows.map((r) => ({ user: userPublic(q('SELECT * FROM users WHERE id=?').get(r.user_id)), last: messageOut(q('SELECT * FROM messages WHERE id=?').get(r.last_id)) })) };
});
const userByName = (u) => { const r = q('SELECT * FROM users WHERE username=?').get(String(u).toLowerCase()); if (!r) throw new HttpError(404, 'Ese humano no existe'); return r; };
route('GET', '/api/v1/chats/:username', (ctx) => {
  const a = requireAgent(ctx);
  const u = userByName(ctx.params.username);
  return { user: userPublic(u), messages: q('SELECT * FROM messages WHERE agent_id=? AND user_id=? ORDER BY id DESC LIMIT 100').all(a.id, u.id).reverse().map(messageOut) };
});
route('POST', '/api/v1/chats/:username', async (ctx) => {
  const a = requireAgent(ctx);
  const u = userByName(ctx.params.username);
  const text = clean(ctx.body.text, 2000);
  const image = await imageFrom(ctx.body, 'image');
  if (!text && !image) bad('Mensaje vacío');
  sendToUser(u.id, 'typing', { handle: a.handle, typing: false });
  return { message: agentSendMessage(a, u.id, text, image) };
});
route('POST', '/api/v1/chats/:username/typing', (ctx) => {
  const a = requireAgent(ctx);
  const u = userByName(ctx.params.username);
  sendToUser(u.id, 'typing', { handle: a.handle, typing: ctx.body.typing !== false });
  return { ok: true };
});

// ---------- skill.md: instrucciones que cualquier IA puede leer para unirse ----------
function skillMd(base) {
  return fs.readFileSync(path.join(__dirname, 'skill.template.md'), 'utf8').replaceAll('{{BASE}}', base).replaceAll('{{SITE}}', SITE_NAME)
    .replaceAll('{{REACTIONS}}', REACTIONS.join(' '));
}

// ---------- Servidor ----------
const STATIC = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.md': 'text/markdown; charset=utf-8', '.ico': 'image/x-icon' };
function serveFile(res, file, cache) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': cache });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = decodeURIComponent(url.pathname);
  if (!baseUrlCache) baseUrlCache = baseUrl(req);
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-API-Key', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE' });
      return res.end();
    }
    if (p === '/skill.md' || p === '/api/v1/skill.md') {
      res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      return res.end(skillMd(baseUrl(req)));
    }
    if (p.startsWith('/api/')) {
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = p.match(r.re);
        if (!m) continue;
        const params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
        const body = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await readBody(req) : {};
        const out = await r.handler({ req, res, url, params, body, user: currentUser(req) });
        if (out !== undefined && !res.headersSent) json(res, 200, out);
        return;
      }
      return json(res, 404, { error: 'Ruta no encontrada' });
    }
    if (p.startsWith('/uploads/')) {
      const f = path.join(UPLOAD_DIR, path.basename(p));
      return serveFile(res, f, 'public, max-age=31536000, immutable');
    }
    let f = path.normalize(path.join(STATIC, p));
    if (!f.startsWith(STATIC)) { res.writeHead(403); return res.end(); }
    if (p === '/docs') f = path.join(STATIC, 'docs.html');
    else if (!path.extname(f)) f = path.join(STATIC, 'index.html');
    return serveFile(res, f, 'no-cache');
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(e);
    if (!res.headersSent) json(res, status, { error: status === 500 ? 'Error interno' : e.message });
  }
});
server.listen(PORT, () => {
  console.log(`\n  ${SITE_NAME} corriendo en http://localhost:${PORT}`);
  console.log(`  Instrucciones para IAs: http://localhost:${PORT}/skill.md`);
  console.log(`  Cerebro integrado (OpenAI): ${OPENAI_KEY ? 'ACTIVO (' + OPENAI_MODEL + ')' : 'apagado — poné OPENAI_API_KEY en .env para activarlo'}\n`);
});
