import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const root = resolve('public');
const dataDir = process.env.DATA_DIR || '/data';
const visitorFile = resolve(dataDir, 'visitors.json');
const mime = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml'
};
const allowedServices = new Set([
  'POS & sales management', 'Inventory & reporting', 'Custom automation',
  'Business website', "Let's explore the possibilities"
]);
const rateLimits = new Map();
let visitorCount = 0;
let counterQueue = Promise.resolve();

try {
  const saved = JSON.parse(await readFile(visitorFile, 'utf8'));
  if (Number.isSafeInteger(saved.visitors) && saved.visitors >= 0) {
    visitorCount = saved.visitors;
  }
} catch (error) {
  if (error.code !== 'ENOENT') console.error('Visitor state unavailable:', error.message);
}

function json(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(JSON.stringify(body));
}

function visitorCookiePresent(req) {
  return /(?:^|;\s*)ezm_visitor=[a-f0-9]{32}(?:;|$)/.test(req.headers.cookie || '');
}

function isCrawler(req) {
  return /bot|crawl|spider|headless|lighthouse|preview|facebookexternalhit|curl|wget|python|monitor|uptime/i
    .test(req.headers['user-agent'] || '');
}

async function saveVisitorCount() {
  await mkdir(dataDir, { recursive: true });
  const tempFile = visitorFile + '.' + process.pid + '.' + randomBytes(4).toString('hex') + '.tmp';
  await writeFile(tempFile, JSON.stringify({
    visitors: visitorCount,
    updatedAt: new Date().toISOString()
  }), { mode: 0o600 });
  await rename(tempFile, visitorFile);
}

function registerVisitor() {
  const run = counterQueue.then(async () => {
    visitorCount++;
    try {
      await saveVisitorCount();
    } catch (error) {
      console.error('Visitor count could not be persisted:', error.message);
    }
    return visitorCount;
  });
  counterQueue = run.then(() => undefined, () => undefined);
  return run;
}

function rateLimited(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown')
    .split(',')[0].trim().slice(0, 120);
  const now = Date.now();
  if (rateLimits.size > 1000) {
    for (const [key, entry] of rateLimits) {
      if (entry.until < now) rateLimits.delete(key);
    }
  }
  const current = rateLimits.get(ip);
  if (!current || current.until < now) {
    rateLimits.set(ip, { count: 1, until: now + 15 * 60 * 1000 });
    return false;
  }
  current.count++;
  return current.count > 4;
}

async function readJsonBody(req, maxBytes = 8192) {
  const parts = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      const error = new Error('Request too large');
      error.status = 413;
      throw error;
    }
    parts.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(parts).toString('utf8'));
  } catch {
    const error = new Error('Invalid JSON');
    error.status = 400;
    throw error;
  }
}

function clean(value, max) {
  return typeof value === 'string' ? value.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, max) : '';
}

async function handleContact(req, res) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) {
    return json(res, 415, { ok: false, message: 'Unsupported submission format.' });
  }
  if (req.headers.origin) {
    try {
      if (new URL(req.headers.origin).host !== req.headers.host) {
        return json(res, 403, { ok: false, message: 'Submission was blocked.' });
      }
    } catch {
      return json(res, 403, { ok: false, message: 'Submission was blocked.' });
    }
  }
  if (rateLimited(req)) {
    return json(res, 429, { ok: false, message: 'Too many submissions. Please try again later.' });
  }
  let fields;
  try {
    fields = await readJsonBody(req);
  } catch (error) {
    return json(res, error.status || 400, { ok: false, message: 'Please check your submission and try again.' });
  }
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    return json(res, 400, { ok: false, message: 'Please complete the contact form.' });
  }
  if (clean(fields.website, 200)) {
    return json(res, 200, { ok: true }); // Spam honeypot; no email is sent.
  }
  const name = clean(fields.name, 100);
  const business = clean(fields.business, 150);
  const email = clean(fields.email, 180);
  const service = clean(fields.service, 80);
  const message = clean(fields.message || '', 2000);
  if (!name || !business || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !allowedServices.has(service)) {
    return json(res, 400, { ok: false, message: 'Please provide your name, business, a valid email, and a service.' });
  }
  if (!process.env.RESEND_API_KEY) {
    return json(res, 503, { ok: false, message: 'Direct email delivery is not active yet.' });
  }
  const to = process.env.CONTACT_TO || 'inquiries@ezermatesystems.com';
  const from = process.env.CONTACT_FROM || 'EzerMate Systems <notifications@ezermatesystems.com>';
  const text = [
    'New EzerMate Systems website inquiry', '',
    'Name: ' + name, 'Email: ' + email, 'Business: ' + business,
    'Service: ' + service, '', 'Message:', message || '(No additional message)',
    '', 'Sent through ezermatesystems.com'
  ].join('\n');
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from, to: [to], reply_to: [email],
        subject: 'New EzerMate inquiry: ' + business,
        text
      }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      console.error('Email provider rejected an inquiry:', response.status);
      return json(res, 502, {
        ok: false,
        message: 'The email service could not send your inquiry. Please try again later.'
      });
    }
    return json(res, 200, { ok: true });
  } catch (error) {
    console.error('Email provider unavailable:', error.message);
    return json(res, 502, {
      ok: false,
      message: 'The email service is temporarily unavailable. Please try again.'
    });
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  let path;
  try {
    path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return json(res, 400, { ok: false, message: 'Bad request' });
  }
  if (path === '/health' && (req.method === 'GET' || req.method === 'HEAD')) {
    return json(res, 200, { status: 'ok' });
  }
  if (path === '/api/visitors' && req.method === 'GET') {
    if (!visitorCookiePresent(req) && !isCrawler(req)) {
      const count = await registerVisitor();
      return json(res, 200, { visitors: count }, {
        'Set-Cookie': 'ezm_visitor=' + randomBytes(16).toString('hex') +
          '; Path=/; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly'
      });
    }
    return json(res, 200, { visitors: visitorCount });
  }
  if (path === '/api/contact' && req.method === 'POST') {
    return handleContact(req, res);
  }
  if (path.startsWith('/api/')) {
    return json(res, 404, { ok: false, message: 'Not found' });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end('Method not allowed');
  }
  const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
  if (!file.startsWith(root + '/')) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  try {
    const data = await readFile(file);
    const ext = extname(file);
    res.writeHead(200, {
      'Content-Type': mime[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache, must-revalidate' : 'public, max-age=300'
    });
    return res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Page not found');
  }
});
server.listen(Number(process.env.PORT) || 3000, '0.0.0.0');
