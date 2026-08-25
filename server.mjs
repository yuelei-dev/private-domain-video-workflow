import { createReadStream } from 'node:fs';
import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { basename, extname, join, normalize, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const publicRoot = resolve(root, 'public');
const dataRoot = resolve(root, 'data');
const defaultMaterialLibraryRoot = '/home/ubuntu/material-libraries/huangque-media';
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const videoExtensions = new Set(['.mp4', '.mov', '.m4v', '.webm']);
const bgmExtensions = new Set(['.mp3', '.m4a', '.wav', '.aac', '.flac', '.ogg']);
const supportedLibraryExtensions = new Set([...imageExtensions, ...videoExtensions, ...bgmExtensions]);

await loadDotEnv(join(root, '.env'));

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
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
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg'
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (request.method !== 'GET') return json(response, 405, { error: 'Method not allowed' });
    if (url.pathname === '/api/health') return json(response, 200, { ok: true });
    if (url.pathname === '/api/assets') return serveCatalog(response, 'asset');
    if (url.pathname === '/api/bgm') return serveCatalog(response, 'bgm');
    if (url.pathname === '/api/media') return proxyMedia(response, url.searchParams);
    if (url.pathname === '/api/library-media') return serveLibraryMedia(request, response, url.searchParams);
    return serveStatic(response, url.pathname);
  } catch (error) {
    json(response, 500, { error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

server.listen(port, host, () => {
  console.log(`Private-domain video workflow: http://${host}:${port}`);
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
    libraryRoot: resolve(process.env.MATERIAL_LIBRARY_ROOT || defaultMaterialLibraryRoot),
    libraryLimit: positiveInteger(process.env.MATERIAL_LIBRARY_LIMIT, 500),
    local: join(dataRoot, 'assets.json')
  };
  return {
    libraryRoot: resolve(process.env.MATERIAL_LIBRARY_ROOT || defaultMaterialLibraryRoot),
    libraryLimit: positiveInteger(process.env.MATERIAL_LIBRARY_LIMIT, 500),
    local: join(dataRoot, 'bgm.json')
  };
}

async function serveCatalog(response, kind) {
  const config = sourceConfig(kind);
  if (!config.catalog) {
    const library = await scanMaterialLibrary(config.libraryRoot, config.libraryLimit, kind);
    if (library.available) {
      if (kind === 'asset') return json(response, 200, { items: library.items, mode: 'server-library' });
      return json(response, 200, { tracks: library.items, mode: 'server-library' });
    }
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

async function scanMaterialLibrary(libraryRoot, limit, kind) {
  let canonicalRoot;
  try { canonicalRoot = await realpath(libraryRoot); } catch { return { available: false, items: [] }; }
  const files = [];
  const pending = [''];
  while (pending.length && files.length < limit) {
    const relativeDirectory = pending.shift();
    const absoluteDirectory = resolve(canonicalRoot, relativeDirectory);
    let entries;
    try { entries = await readdir(absoluteDirectory, { withFileTypes: true }); } catch { continue; }
    entries.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const childRelative = relativeDirectory ? join(relativeDirectory, entry.name) : entry.name;
      if (entry.isDirectory()) pending.push(childRelative);
      const extension = extname(entry.name).toLowerCase();
      const allowed = kind === 'bgm' ? bgmExtensions : new Set([...imageExtensions, ...videoExtensions]);
      if (!entry.isFile() || !allowed.has(extension)) continue;
      const publicPath = childRelative.split(sep).join('/');
      const mediaUrl = `/api/library-media?path=${encodeURIComponent(publicPath)}`;
      const item = {
        title: basename(entry.name, extname(entry.name)),
        library_path: publicPath,
        source: '黄雀测试服务器素材库'
      };
      if (kind === 'bgm') item.url = mediaUrl;
      else if (imageExtensions.has(extension)) item.image_url = mediaUrl;
      else item.video_url = mediaUrl;
      files.push(item);
      if (files.length >= limit) break;
    }
  }
  return { available: true, items: files };
}

async function serveLibraryMedia(request, response, params) {
  const config = sourceConfig('asset');
  const rawPath = params.get('path') || '';
  if (!isSafeRelativePath(rawPath)) return json(response, 400, { error: 'Invalid library path' });
  let canonicalRoot;
  let target;
  try {
    canonicalRoot = await realpath(config.libraryRoot);
    target = await realpath(resolve(canonicalRoot, ...rawPath.split('/')));
  } catch {
    return json(response, 404, { error: 'Material not found' });
  }
  if (!isContained(canonicalRoot, target) || !supportedLibraryExtensions.has(extname(target).toLowerCase())) {
    return json(response, 403, { error: 'Material is outside the library' });
  }
  const info = await stat(target);
  if (!info.isFile()) return json(response, 404, { error: 'Material not found' });
  const contentType = mime[extname(target).toLowerCase()] || 'application/octet-stream';
  const range = parseByteRange(request.headers.range, info.size);
  if (range === null) {
    response.writeHead(416, { 'content-range': `bytes */${info.size}` });
    return response.end();
  }
  if (range) {
    response.writeHead(206, {
      'accept-ranges': 'bytes',
      'content-range': `bytes ${range.start}-${range.end}/${info.size}`,
      'content-length': range.end - range.start + 1,
      'content-type': contentType,
      'cache-control': 'private, max-age=300'
    });
    return createReadStream(target, range).pipe(response);
  }
  response.writeHead(200, {
    'accept-ranges': 'bytes',
    'content-length': info.size,
    'content-type': contentType,
    'cache-control': 'private, max-age=300'
  });
  createReadStream(target).pipe(response);
}

function isSafeRelativePath(value) {
  if (!value || value.includes('\0') || value.includes('\\')) return false;
  if (value.startsWith('/') || /^[A-Za-z]:/.test(value)) return false;
  return value.split('/').every(part => part && part !== '.' && part !== '..');
}

function isContained(rootPath, targetPath) {
  const pathFromRoot = relative(rootPath, targetPath);
  return pathFromRoot === '' || (pathFromRoot !== '..' && !pathFromRoot.startsWith(`..${sep}`));
}

function parseByteRange(value, size) {
  if (!value) return undefined;
  const match = value.match(/^bytes=(\d*)-(\d*)$/);
  if (!match || (!match[1] && !match[2])) return null;
  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= size || end < start) return null;
  return { start, end: Math.min(end, size - 1) };
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
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
