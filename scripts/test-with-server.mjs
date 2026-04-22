/**
 * Runs persist + UI + cloud tests with a local static server on a free port
 * (no manual `python3 -m http.server 8765`).
 *
 * If TEST_BASE is already set, skips starting a server and uses that URL.
 */
import net from 'net';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function getFreePort(host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, host, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : null;
      server.close((err) => {
        if (err) reject(err);
        else if (port == null) reject(new Error('no port from ephemeral listener'));
        else resolve(port);
      });
    });
  });
}

async function waitForOk(url, { timeoutMs = 30000, intervalMs = 80 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastErr;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`server did not respond at ${url}: ${lastErr?.message || lastErr}`);
}

let srv = null;
let base = String(process.env.TEST_BASE || '').trim();

try {
  if (!base) {
    const port = await getFreePort();
    base = `http://127.0.0.1:${port}/`;
    srv = spawn('python3', ['-m', 'http.server', String(port)], {
      cwd: root,
      stdio: 'ignore',
    });
    srv.on('error', (err) => {
      console.error('Failed to start python3 http.server:', err.message);
    });
    await waitForOk(base);
    console.log(`test server: ${base}`);
  }

  const env = { ...process.env, TEST_BASE: base };
  const steps = [
    ['node', ['scripts/test-persistence.mjs']],
    ['node', ['scripts/test-ui.mjs']],
    ['node', ['scripts/test-cloud-roundtrip.mjs']],
  ];
  for (const [cmd, args] of steps) {
    const r = spawnSync(cmd, args, { cwd: root, env, stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
} finally {
  if (srv) {
    try {
      srv.kill('SIGTERM');
    } catch (_) {}
  }
}
