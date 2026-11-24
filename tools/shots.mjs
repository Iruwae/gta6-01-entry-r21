// SOLMAR BAY — screenshot tool. Serves the game, opens each scene in
// the headless Chromium shell over CDP, waits for the world to settle,
// and saves a 1280x720 JPEG per manifest entry. Fails loudly if the
// game reports an error or never becomes ready, so a bad build can
// never ship silent screenshots.
//
// Usage: node tools/shots.mjs   (run from the repository root)

import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHELL = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell';
const PORT = 8904;
const DEBUG_PORT = 9223;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (e) { /* not up yet */ }
    await sleep(300);
  }
  throw new Error(`timed out waiting for ${label} at ${url}`);
}

async function cdp(method, params = {}) {
  const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/${method}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`CDP ${method} failed: ${res.status}`);
  return res.json();
}

function connectWs(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    const events = [];
    ws.onopen = () => resolve({ ws, send, events });
    ws.onerror = (e) => reject(new Error(`websocket error: ${e.message || 'unknown'}`));
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      } else if (msg.method) {
        events.push(msg);
      }
    };
    function send(method, params = {}) {
      return new Promise((res) => {
        const mid = ++id;
        pending.set(mid, res);
        ws.send(JSON.stringify({ id: mid, method, params }));
      });
    }
  });
}

async function shootOne(entry) {
  const url = `http://127.0.0.1:${PORT}/?scene=${entry.scene}&seed=20261124`;
  const target = await cdp('new', { url: 'about:blank' });
  const { ws, send, events } = await connectWs(target.webSocketDebuggerUrl);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.__errors = []; window.addEventListener("error", (e) => window.__errors.push(String(e.message)));',
  });
  await send('Page.navigate', { url });
  await sleep(entry.waitMs || 6000);
  const evalRes = await send('Runtime.evaluate', {
    expression: '({ ready: !!window.__solmar, errors: window.__errors || [], money: window.__solmar ? window.__solmar.state.money : null })',
    returnByValue: true,
  });
  const info = evalRes.result?.result?.value || {};
  if (!info.ready) throw new Error(`${entry.file}: game never became ready (${JSON.stringify(info)})`);
  if (info.errors && info.errors.length > 0) throw new Error(`${entry.file}: page errors: ${info.errors.join(' | ')}`);
  let quality = 82;
  let shot;
  for (let attempt = 0; attempt < 3; attempt++) {
    shot = await send('Page.captureScreenshot', { format: 'jpeg', quality });
    const buf = Buffer.from(shot.result.data, 'base64');
    if (buf.length <= 262144 || attempt === 2) {
      await writeFile(join(root, 'screenshots', entry.file), buf);
      console.log(`${entry.file}: ${(buf.length / 1024).toFixed(1)} KiB (quality ${quality})`);
      break;
    }
    quality -= 14;
  }
  ws.close();
  return info;
}

async function main() {
  const manifest = JSON.parse(await readFile(join(root, 'shots.json'), 'utf8'));
  const server = spawn('node', ['serve.ts'], { cwd: root, stdio: 'ignore' });
  const browser = spawn(SHELL, [
    '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    `--remote-debugging-port=${DEBUG_PORT}`, '--window-size=1280,720', 'about:blank',
  ], { stdio: 'ignore' });
  try {
    await waitFor(`http://127.0.0.1:${PORT}/`, 15000, 'game server');
    await waitFor(`http://127.0.0.1:${DEBUG_PORT}/json/version`, 20000, 'headless shell');
    for (const entry of manifest) {
      await shootOne(entry);
    }
    console.log(`done: ${manifest.length} screenshots in screenshots/`);
  } finally {
    browser.kill('SIGKILL');
    server.kill('SIGKILL');
  }
}

main().catch((err) => {
  console.error('shots failed:', err.message);
  process.exit(1);
});
