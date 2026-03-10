import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import {
  createFrontendSession,
  getFrontendSnapshot,
  performFrontendAction,
  type FrontendAction
} from './runtime.js';

const PORT = Number(process.env.TERMINAL_QUEST_FRONTEND_PORT ?? '4310');
const STATIC_ROOT = path.join(process.cwd(), 'frontend');
const session = createFrontendSession();

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

function getContentType(filePath: string): string {
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  return 'text/html; charset=utf-8';
}

function safeStaticPath(requestPath: string): string {
  const normalized = requestPath === '/' ? '/index.html' : requestPath;
  const resolvedPath = path.normalize(normalized).replace(/^(\.\.[/\\])+/, '');
  return path.join(STATIC_ROOT, resolvedPath);
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function handleApi(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
  const url = new URL(request.url ?? '/', 'http://localhost');

  if (request.method === 'GET' && url.pathname === '/api/state') {
    sendJson(response, 200, getFrontendSnapshot(session));
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/api/action') {
    try {
      const raw = await readBody(request);
      const action = JSON.parse(raw) as FrontendAction;
      const snapshot = performFrontendAction(session, action);
      sendJson(response, 200, snapshot);
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : '잘못된 요청입니다.'
      });
    }
    return true;
  }

  return false;
}

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (await handleApi(request, response)) {
    return;
  }

  const filePath = safeStaticPath(new URL(request.url ?? '/', 'http://localhost').pathname);
  const fallbackPath = path.join(STATIC_ROOT, 'index.html');
  const targetPath = existsSync(filePath) ? filePath : fallbackPath;

  try {
    const content = readFileSync(targetPath);
    response.writeHead(200, {
      'Content-Type': getContentType(targetPath),
      'Cache-Control': targetPath.endsWith('.html') ? 'no-store' : 'public, max-age=60'
    });
    response.end(content);
  } catch (error) {
    sendJson(response, 500, {
      message: error instanceof Error ? error.message : '정적 파일을 불러오지 못했습니다.'
    });
  }
}

createServer((request, response) => {
  void handleRequest(request, response);
}).listen(PORT, () => {
  console.log(`[frontend] Terminal Quest web app running at http://localhost:${PORT}`);
});
