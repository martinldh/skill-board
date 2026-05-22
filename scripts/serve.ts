#!/usr/bin/env bun
import { existsSync, readFileSync, appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dir, '..', 'data');
const LOCAL_LOG = join(DATA_DIR, 'usage-log.jsonl');
const PORT = parseInt(process.env.PORT || '4173');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/api/use' && req.method === 'POST') {
      try {
        const skill = url.searchParams.get('skill');
        if (!skill) return new Response('Missing skill', { status: 400 });
        const entry = JSON.stringify({ skill, ts: new Date().toISOString() }) + '\n';
        appendFileSync(LOCAL_LOG, entry);
        return new Response('ok', { status: 200 });
      } catch { return new Response('Error', { status: 500 }); }
    }

    const path = url.pathname === '/' ? '/dashboard.html' : url.pathname;
    const filePath = join(DATA_DIR, path);

    if (!filePath.startsWith(DATA_DIR)) {
      return new Response('Forbidden', { status: 403 });
    }

    if (!existsSync(filePath)) {
      return new Response('Not Found', { status: 404 });
    }

    const ext = filePath.substring(filePath.lastIndexOf('.'));
    const contentType = MIME[ext] || 'application/octet-stream';
    const content = readFileSync(filePath);

    return new Response(content, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
});

const url = `http://localhost:${PORT}`;
console.log(`📡 Serve: ${url}`);
console.log('Press Ctrl+C to stop');
