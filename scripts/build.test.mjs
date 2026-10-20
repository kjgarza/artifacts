import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BUILD = fileURLToPath(new URL('./build.mjs', import.meta.url));
const run = (root) => execFileSync('node', [BUILD, root], { encoding: 'utf8' });
const page = (title) => `<!doctype html><html><head><title>${title}</title></head><body><h1>${title}</h1></body></html>`;

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'artifacts-'));
  await mkdir(join(root, 'inbox'));
  return root;
}

test('ingests inbox html into a slug dir with sidecar merged', async () => {
  const root = await fixture();
  await writeFile(join(root, 'inbox', 'Task Control.html'), page('Task Control'));
  await writeFile(join(root, 'inbox', 'Task Control.json'), JSON.stringify({ tags: ['Tasks'], kind: 'dashboard', created: '2026-10-19' }));
  run(root);
  assert.equal(await readFile(join(root, 'task-control', 'index.html'), 'utf8'), page('Task Control'));
  const [item] = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
  assert.deepEqual([item.slug, item.tags, item.kind, item.created], ['task-control', ['tasks'], 'dashboard', '2026-10-19']);
  assert.deepEqual(await readdir(join(root, 'inbox')), []);
});

test('is idempotent and keeps existing slugs; collisions get a suffix', async () => {
  const root = await fixture();
  await writeFile(join(root, 'inbox', 'a.html'), page('Same'));
  run(root);
  const before = await readFile(join(root, 'index.html'), 'utf8');
  assert.match(run(root), /unchanged/);
  await writeFile(join(root, 'inbox', 'b.html'), page('Same'));
  run(root);
  assert.ok((await readdir(root)).includes('same') && (await readdir(root)).includes('same-2'));
  assert.notEqual(await readFile(join(root, 'index.html'), 'utf8'), before);
});

test('fails on invalid sidecar JSON', async () => {
  const root = await fixture();
  await writeFile(join(root, 'inbox', 'a.html'), page('A'));
  await writeFile(join(root, 'inbox', 'a.json'), '{nope');
  assert.throws(() => run(root), /invalid JSON/);
});
