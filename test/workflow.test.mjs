import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');

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
