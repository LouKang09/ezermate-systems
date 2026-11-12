import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve('public');
const mime = { '.png':'image/png', '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.txt':'text/plain; charset=utf-8', '.xml':'application/xml' };
http.createServer(async (req,res) => {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405,{'Allow':'GET, HEAD'}); return res.end('Method not allowed');}
  let path;
  try { path = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch {res.writeHead(400);return res.end('Bad request');}
  if(path === '/health') {res.writeHead(200,{'Content-Type':'application/json'});return res.end(req.method==='HEAD'?undefined:'{"status":"ok"}');}
  const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
  if(!file.startsWith(root + '/')){res.writeHead(403);return res.end('Forbidden');}
  try {const data = await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':extname(file)==='.html'?'no-cache, must-revalidate':'public, max-age=300'});res.end(req.method==='HEAD'?undefined:data);} catch {res.writeHead(404,{'Content-Type':'text/plain'});res.end('Page not found');}
}).listen(Number(process.env.PORT)||3000,'0.0.0.0');
