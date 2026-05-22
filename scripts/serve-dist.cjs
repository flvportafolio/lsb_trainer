const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'dist');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 5173);

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.wasm', 'application/wasm'],
]);

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${host}:${port}`);
  const safePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '');
  const requestedFile = path.normalize(path.join(root, safePath));
  const isReadableFile =
    requestedFile.startsWith(root) &&
    fs.existsSync(requestedFile) &&
    fs.statSync(requestedFile).isFile();
  const filePath = isReadableFile
    ? requestedFile
    : path.join(root, 'index.html');

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('No se pudo leer el archivo solicitado.');
      return;
    }

    response.writeHead(200, {
      'content-type': mimeTypes.get(path.extname(filePath)) || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    response.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`LSB trainer listo en http://${host}:${port}/`);
});
