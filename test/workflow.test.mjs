import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const page = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');
const skill = await readFile(new URL('../codex-skill/private-domain-short-video/SKILL.md', import.meta.url), 'utf8');
const materialHelper = await readFile(new URL('../codex-skill/private-domain-short-video/scripts/test_server_materials.py', import.meta.url), 'utf8');

test('page preserves four layouts and first-frame protection', () => {
  for (const label of ['数据对比·高转化', '同城圈层·招募', '女性成长·温暖', '品质社交·轻奢']) assert.match(page, new RegExp(label));
  assert.match(page, /首帧保护/);
  assert.match(page, /first_frame_offset_seconds:\.08/);
});

test('random selection uses Fisher-Yates and caps a batch at four assets', () => {
  assert.match(page, /Math\.floor\(Math\.random\(\)\*\(i\+1\)\)/);
  assert.match(page, /slice\(0,Math\.min\(4,allAssets\.length\)\)/);
  assert.doesNotMatch(page, /sort\(function\(\)\{return Math\.random/);
});

test('plans are exportable but do not submit render jobs', () => {
  assert.match(page, /exportJson/);
  assert.match(page, /exportCsv/);
  assert.match(page, /默认不会提交付费任务/);
  assert.doesNotMatch(page, /\/api\/render/);
});

test('credentials stay server-side and media proxy checks allowed origins', () => {
  assert.match(server, /MATERIAL_BEARER_TOKEN/);
  assert.match(server, /BGM_BEARER_TOKEN/);
  assert.match(server, /allowedOrigins\.includes\(target\.origin\)/);
  assert.doesNotMatch(page, /Bearer __cookie__/);
});

test('Codex skill uses only the fixed test-server library and keeps credentials external', () => {
  assert.match(skill, /\/home\/ubuntu\/material-libraries\/huangque-media/);
  assert.match(materialHelper, /ubuntu@8\.148\.158\.106/);
  assert.match(materialHelper, /BatchMode=yes/);
  assert.match(materialHelper, /ssh-read-only/);
  assert.doesNotMatch(materialHelper, /password\s*=/i);
  assert.doesNotMatch(materialHelper, /129\.204\.166\.13/);
});

test('test-server material library is read-only, contained, and range-capable', async t => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'huangque-media-'));
  await mkdir(join(fixtureRoot, 'health'), { recursive: true });
  await writeFile(join(fixtureRoot, 'health', 'proof.mp4'), Buffer.from('0123456789'));
  await writeFile(join(fixtureRoot, 'health', 'cover.jpg'), Buffer.from('image'));
  await writeFile(join(fixtureRoot, 'ignore.txt'), 'not media');
  const port = await freePort();
  const child = spawn(process.execPath, [fileURLToPath(new URL('../server.mjs', import.meta.url))], {
    env: { ...process.env, PORT: String(port), MATERIAL_LIBRARY_ROOT: fixtureRoot, MATERIAL_API_URL: '' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(async () => {
    child.kill();
    await rm(fixtureRoot, { recursive: true, force: true });
  });
  await waitForHealth(port, child);

  const catalogResponse = await fetch(`http://127.0.0.1:${port}/api/assets`);
  assert.equal(catalogResponse.status, 200);
  const catalog = await catalogResponse.json();
  assert.equal(catalog.mode, 'server-library');
  assert.equal(catalog.items.length, 2);
  const videoItem = catalog.items.find(item => item.library_path === 'health/proof.mp4');
  const imageItem = catalog.items.find(item => item.library_path === 'health/cover.jpg');
  assert.ok(videoItem.video_url);
  assert.ok(imageItem.image_url);
  assert.equal(JSON.stringify(catalog).includes(fixtureRoot), false);

  const mediaResponse = await fetch(`http://127.0.0.1:${port}${videoItem.video_url}`, {
    headers: { range: 'bytes=2-5' }
  });
  assert.equal(mediaResponse.status, 206);
  assert.equal(await mediaResponse.text(), '2345');
  assert.equal(mediaResponse.headers.get('content-range'), 'bytes 2-5/10');

  const traversal = await fetch(`http://127.0.0.1:${port}/api/library-media?path=${encodeURIComponent('../secret.mp4')}`);
  assert.equal(traversal.status, 400);
});

async function freePort() {
  return new Promise((resolvePort, reject) => {
    const socket = createServer();
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', () => {
      const address = socket.address();
      socket.close(() => resolvePort(address.port));
    });
  });
}

async function waitForHealth(port, child) {
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk.toString(); });
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`server exited with ${child.exitCode}: ${stderr}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolveWait => setTimeout(resolveWait, 50));
  }
  throw new Error('server did not become healthy');
}
