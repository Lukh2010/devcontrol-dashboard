const http = require('http');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const root = path.join(projectRoot, 'frontend', 'dist');
const backendHost = '127.0.0.1';
const backendPort = Number.parseInt(process.env.DEVCONTROL_BACKEND_PORT || '8000', 10);
const host = '127.0.0.1';
const port = Number.parseInt(process.env.DEVCONTROL_FRONTEND_PORT || '3000', 10);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function proxyApi(req, res) {
  const proxyReq = http.request({
    host: backendHost,
    port: backendPort,
    method: req.method,
    path: req.url,
    headers: {
      ...req.headers,
      host: `${backendHost}:${backendPort}`,
    },
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (error) => {
    res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  });

  req.pipe(proxyReq);
}

function serveStatic(req, res) {
  if (!fs.existsSync(root)) {
    res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('frontend/dist is missing. Run npm run build before using the dist proxy.');
    return;
  }

  const url = new URL(req.url, `http://${host}:${port}`);
  const requested = decodeURIComponent(url.pathname);
  const normalized = path.normalize(requested).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(root, normalized);
  const relativePath = path.relative(root, filePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(root, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'content-type': mimeTypes[ext] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    proxyApi(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(port, host, () => {
  console.log(`DevControl frontend dist proxy listening on http://${host}:${port}`);
});

module.exports = server;
