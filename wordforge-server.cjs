'use strict';

// Local-only launcher for the upstream, self-contained WordForge HTML release.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const host = '127.0.0.1';
const port = 8765;
const root = __dirname;
const htmlPath = path.join(root, 'wordforge.html');
const pidPath = path.join(root, '.wordforge-server.pid');
const html = fs.readFileSync(htmlPath);
const sha256 = crypto.createHash('sha256').update(html).digest('hex');

const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = new URL(req.url, `http://${host}:${port}`).pathname; }
  catch { res.writeHead(400).end(); return; }
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return;
  }
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (pathname === '/__wordforge/health') {
    const body = JSON.stringify({ app: 'wordforge-local', pid: process.pid, sha256 });
    res.writeHead(200, { ...headers, 'Content-Type': 'application/json; charset=utf-8' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } else if (['/', '/index.html', '/wordforge.html'].includes(pathname)) {
    res.writeHead(200, { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': html.length });
    res.end(req.method === 'HEAD' ? undefined : html);
  } else if (pathname === '/favicon.ico') {
    res.writeHead(204).end();
  } else {
    res.writeHead(404, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
});

function cleanPid() {
  try {
    if (fs.readFileSync(pidPath, 'utf8').trim() === String(process.pid)) fs.unlinkSync(pidPath);
  } catch {}
}
server.on('error', err => { console.error(err.message); process.exitCode = 1; });
server.listen(port, host, () => {
  fs.writeFileSync(pidPath, String(process.pid));
  console.log(`WordForge ready: http://${host}:${port}/`);
  console.log(`HTML SHA-256: ${sha256}`);
});
process.on('exit', cleanPid);
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => { server.close(); cleanPid(); });
}
