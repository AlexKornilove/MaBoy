const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data', 'collection.json');

let saveQueue = Promise.resolve();

const server = http.createServer(async (req, res) => {
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // ===== СТАТИЧЕСКИЕ ФАЙЛЫ =====
  if (req.method === 'GET') {
    let filePath = req.url === '/'
      ? 'index.html'
      : req.url.slice(1);

    filePath = path.normalize(path.join(__dirname, filePath));
    if (!filePath.startsWith(__dirname)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const ext = path.extname(filePath);
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp'
    };

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
      } else {
        res.writeHead(200, {
          'Content-Type': mime[ext] || 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache'
        });
        res.end(content);
      }
    });
    return;
  }

  // ===== СОХРАНЕНИЕ JSON =====
  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      // Add save operation to the sequential queue
      saveQueue = saveQueue.then(async () => {
        try {
          // Validate JSON before saving
          JSON.parse(body);

          const dataDir = path.dirname(DATA_FILE);
          if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
          }

          const tempFile = DATA_FILE + '.tmp';

          return new Promise((resolveQueue) => {
            // Step 1: Write to temporary file
            fs.writeFile(tempFile, body, 'utf8', (writeErr) => {
              if (writeErr) {
                console.error('Ошибка записи во временный файл:', writeErr);
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Save error: ' + writeErr.message);
                return resolveQueue();
              }

              // Step 2: Atomic rename (with retries for Windows locks)
              const tryRename = (retryCount = 0) => {
                fs.rename(tempFile, DATA_FILE, (renameErr) => {
                  if (renameErr) {
                    if (renameErr.code === 'EPERM' && retryCount < 10) {
                      console.warn(`Конфликт доступа (EPERM) при переименовании, попытка ${retryCount + 1}...`);
                      setTimeout(() => tryRename(retryCount + 1), 200);
                      return;
                    }

                    // Fallback to copy + unlink if rename repeatedly fails
                    console.warn('Rename не удался, пробуем copy + unlink fallback...');
                    fs.copyFile(tempFile, DATA_FILE, (copyErr) => {
                      if (copyErr) {
                        console.error('Критическая ошибка сохранения (copyFile):', copyErr);
                        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                        res.end('Copy error: ' + copyErr.message);
                      } else {
                        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                        res.end('OK');
                        fs.unlink(tempFile, () => { });
                      }
                      resolveQueue();
                    });
                  } else {
                    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('OK');
                    resolveQueue();
                  }
                });
              };
              tryRename();
            });
          });
        } catch (e) {
          console.error('Invalid JSON received:', e.message);
          res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Invalid JSON: ' + e.message);
        }
      });
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});