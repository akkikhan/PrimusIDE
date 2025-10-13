#!/usr/bin/env node
/**
 * Simple static server for artifacts dashboard.
 * Serves files from artifacts/ with basic security (path traversal guard) and
 * defaults to tasks-status-board.html at root.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../artifacts');
const port = process.env.PORT || 8080;

function contentType(file){
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.md')) return 'text/markdown; charset=utf-8';
  if (file.endsWith('.csv')) return 'text/csv; charset=utf-8';
  if (file.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

const server = http.createServer((req,res)=>{
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let filePath = path.join(root, urlPath === '/' ? 'tasks-status-board.html' : urlPath);
  if (!filePath.startsWith(root)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  fs.stat(filePath,(err,stat)=>{
    if (err || !stat.isFile()) {
      res.writeHead(404); return res.end('Not found');
    }
    res.writeHead(200,{ 'Content-Type': contentType(filePath) });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(port,()=>{
  console.log(`[serveArtifacts] Serving artifacts from ${root}`);
  console.log(`[serveArtifacts] Open http://localhost:${port}/ in your browser.`);
});
