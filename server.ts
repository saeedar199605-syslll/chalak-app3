/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'app_state.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error('Failed to create data directory:', e);
  }
}

let memoryState: Record<string, any> = {};
let appVersion = Date.now();

if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    memoryState = JSON.parse(raw);
    if (memoryState._version) {
      appVersion = Number(memoryState._version);
    }
  } catch (e) {
    console.error('Failed to parse database state file:', e);
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), runtime: 'node-express', version: appVersion });
});

app.get('/api/state', (req, res) => {
  if (req.query.version_only === 'true') {
    return res.json({ version: appVersion, updatedAt: new Date(appVersion).toISOString() });
  }
  res.json(memoryState);
});

app.post('/api/state', (req, res) => {
  try {
    appVersion = Date.now();
    const incoming = req.body || {};
    
    // Anti-wipe protection: Preserve existing evaluations if incoming has empty evaluations
    if (Array.isArray(memoryState['pe_evaluations']) && memoryState['pe_evaluations'].length > 0) {
      const incomingEvals = Array.isArray(incoming['pe_evaluations']) ? incoming['pe_evaluations'] : [];
      if (incomingEvals.length === 0) {
        incoming['pe_evaluations'] = memoryState['pe_evaluations'];
      } else {
        const evalMap = new Map();
        for (const ev of memoryState['pe_evaluations']) {
          evalMap.set(`${ev.empId || ev.id}_${ev.period || ''}`, ev);
        }
        for (const ev of incomingEvals) {
          evalMap.set(`${ev.empId || ev.id}_${ev.period || ''}`, ev);
        }
        incoming['pe_evaluations'] = Array.from(evalMap.values());
      }
    }

    if (Array.isArray(memoryState['pe_employees']) && memoryState['pe_employees'].length > 0) {
      const incomingEmps = Array.isArray(incoming['pe_employees']) ? incoming['pe_employees'] : [];
      if (incomingEmps.length === 0) {
        incoming['pe_employees'] = memoryState['pe_employees'];
      }
    }

    memoryState = { ...memoryState, ...incoming, _version: appVersion, _updatedAt: new Date().toISOString() };
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryState, null, 2), 'utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({ success: true, version: appVersion });
  } catch (err: any) {
    console.error('State save error:', err);
    res.status(500).json({ error: 'Failed to persist state' });
  }
});

async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express custom server listening on port http://0.0.0.0:${PORT}`);
  });
}

setupServer();
