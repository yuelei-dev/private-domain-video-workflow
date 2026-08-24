import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const publicRoot = resolve(root, 'public');
const dataRoot = resolve(root, 'data');

await loadDotEnv(join(root, '.env'));

const port = Number(process.env.PORT || 3000);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4'
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (request.method !== 'GET') return json(response, 405, { error: 'Method not allowed' });
    if (url.pathname === '/api/health') return json(response, 200, { ok: true });
    if (url.pathname === '/api/assets') return serveCatalog(response, 'asset');
    if (url.pathname === '/api/bgm') return serveCatalog(response, 'bgm');
    if (url.pathname === '/api/media') return proxyMedia(response, url.searchParams);
    return serveStatic(response, url.pathname);
  } catch (error) {
    json(response, 500, { error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

server.listen(port, () => {
  console.log(`Private-domain video workflow: http://localhost:${port}`);
});

async function loadDotEnv(path) {
  let source;
  try { source = await readFile(path, 'utf8'); } catch { return; }
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

function sourceConfig(kind) {
  if (kind === 'asset') return {
    catalog: process.env.MATERIAL_API_URL,
    fileBase: process.env.MATERIAL_FILE_BASE_URL,
    token: process.env.MATERIAL_BEARER_TOKEN,
    local: join(dataRoot, 'assets.json')
  };
  return {
    catalog: process.env.BGM_MANIFEST_URL,
    fileBase: process.env.BGM_FILE_BASE_URL,
    token: process.env.BGM_BEARER_TOKEN,
    local: join(dataRoot, 'bgm.json')
  };
}

async function serveCatalog(response, kind) {
  const config = sourceConfig(kind);
  if (!config.catalog) {
    const local = JSON.parse(await readFile(config.local, 'utf8'));
    return json(response, 200, { ...local, mode: 'local' });
  }
  const upstream = await fetch(config.catalog, { headers: authHeaders(config.token) });
  if (!upstream.ok) return json(response, 502, { error: `${kind} catalog returned ${upstream.status}` });
  const payload = await upstream.json();
  if (kind === 'asset') {
    const items = Array.isArray(payload) ? payload : payload.items || payload.data || [];
    return json(response, 200, { items: items.map(item => normalizeAsset(item, config)), mode: 'remote' });
  }
  const tracks = Array.isArray(payload) ? payload : payload.tracks || payload.items || [];
  return json(response, 200, { tracks: tracks.map(track => normalizeTrack(track, config)), mode: 'remote' });
}

function normalizeAsset(item, config) {
  const raw = item.video_url || item.url || item.video_file || item.file;
  if (!raw) return item;
  const absolute = new URL(raw, config.fileBase || config.catalog).href;
  return { ...item, video_url: mediaProxy('asset', absolute), source: item.source || '远程素材库' };
}

function normalizeTrack(track, config) {
  const raw = track.url || (track.base && track.file ? new URL(track.file, track.base).href : track.file);
  if (!raw) return track;
  const absolute = new URL(raw, config.fileBase || config.catalog).href;
  return { ...track, file: undefined, base: undefined, url: mediaProxy('bgm', absolute) };
}

function mediaProxy(source, url) {
  return `/api/media?source=${source}&url=${encodeURIComponent(url)}`;
}

async function proxyMedia(response, params) {
  const kind = params.get('source');
  if (kind !== 'asset' && kind !== 'bgm') return json(response, 400, { error: 'Invalid media source' });
  const config = sourceConfig(kind);
  if (!config.catalog) return json(response, 404, { error: 'Remote source is not configured' });
  const target = new URL(params.get('url') || '');
  const allowedOrigins = [config.catalog, config.fileBase].filter(Boolean).map(value => new URL(value).origin);
  if (!allowedOrigins.includes(target.origin)) return json(response, 403, { error: 'Media origin is not allowed' });
  const upstream = await fetch(target, { headers: authHeaders(config.token) });
  if (!upstream.ok || !upstream.body) return json(response, 502, { error: `Media returned ${upstream.status}` });
  response.writeHead(200, {
    'content-type': upstream.headers.get('content-type') || 'application/octet-stream',
    'cache-control': 'private, max-age=300'
  });
  for await (const chunk of upstream.body) response.write(chunk);
  response.end();
}

function authHeaders(token) {
  return token ? { authorization: `Bearer ${token}`, accept: 'application/json' } : { accept: 'application/json' };
}

async function serveStatic(response, pathname) {
  const relative = normalize(decodeURIComponent(pathname === '/' ? '/index.html' : pathname)).replace(/^([/\\])+/, '');
  const target = resolve(publicRoot, relative);
  if (target !== publicRoot && !target.startsWith(`${publicRoot}\\`) && !target.startsWith(`${publicRoot}/`)) {
    return json(response, 403, { error: 'Forbidden' });
  }
  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error('not a file');
  } catch {
    return json(response, 404, { error: 'Not found' });
  }
  response.writeHead(200, { 'content-type': mime[extname(target).toLowerCase()] || 'application/octet-stream' });
  createReadStream(target).pipe(response);
}

function json(response, status, value) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(value));
}
