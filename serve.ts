// The Velvet Fox — tiny static server for local play-testing.
// Serves game/ at http://localhost:8080 so the game can be opened
// in desktop Chrome exactly as the grader's static server would.
// Node 22 standard library only; no dependencies, no network use.

import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'game');
const PORT = Number(process.env.PORT ?? 8080);

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const server = createServer((req, res) => {
  const rawPath = decodeURIComponent(req.url?.split('?')[0] ?? '/');
  const safePath = normalize(join(ROOT, rawPath === '/' ? 'index.html' : rawPath));
  if (!safePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  const ext = extname(safePath).toLowerCase();
  const stream = createReadStream(safePath);
  stream.on('error', () => {
    // Headers go out only once the stream has opened: a missing
    // file (a favicon, say) answers 404 instead of crashing.
    if (!res.headersSent) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end('Not found');
  });
  stream.on('open', () => {
    res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`The Velvet Fox at http://localhost:${PORT}/`);
});
