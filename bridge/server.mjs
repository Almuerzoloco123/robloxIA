// @ts-check
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 34873;
const HOST = '127.0.0.1';

/**
 * @typedef {Object} Command
 * @property {string} id
 * @property {string} action
 * @property {Record<string, any>} args
 * @property {number} timestamp
 */

/**
 * @typedef {Object} ExecutionReport
 * @property {string} commandId
 * @property {'SUCCESS' | 'ERROR'} status
 * @property {Record<string, any>} [details]
 * @property {string} [error]
 * @property {{ memoryMb?: number, fps?: number, primitives?: number }} [telemetry]
 * @property {number} timestamp
 */

/** @type {Command[]} */
const commandQueue = [];

/** @type {ExecutionReport[]} */
const executionHistory = [];

/** @type {Array<(cmd: Command | { action: 'NOOP' }) => void>} */
const waitingPollers = [];

/** @type {{ connected: boolean, lastSeen: number | null, telemetry: Record<string, any> }} */
const studioState = {
  connected: false,
  lastSeen: null,
  telemetry: {}
};

/**
 * Send JSON response with appropriate headers
 * @param {http.ServerResponse} res
 * @param {number} statusCode
 * @param {any} data
 */
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

/**
 * Parse incoming JSON body
 * @param {http.IncomingMessage} req
 * @returns {Promise<any>}
 */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) { // 5MB guard
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || HOST}`);

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  try {
    // 1. Health and Status
    if (req.method === 'GET' && url.pathname === '/api/status') {
      const isAlive = studioState.lastSeen ? (Date.now() - studioState.lastSeen < 15000) : false;
      return sendJson(res, 200, {
        success: true,
        bridge: 'running',
        port: PORT,
        studioConnected: isAlive,
        queueLength: commandQueue.length,
        waitingPollers: waitingPollers.length,
        studioState
      });
    }

    // 2. Poll command for Studio (Long-Polling)
    if (req.method === 'GET' && url.pathname === '/api/poll') {
      studioState.connected = true;
      studioState.lastSeen = Date.now();

      if (commandQueue.length > 0) {
        const nextCmd = commandQueue.shift();
        return sendJson(res, 200, nextCmd);
      }

      // Long polling: wait up to 4.5 seconds for a command
      const timer = setTimeout(() => {
        const idx = waitingPollers.indexOf(fulfill);
        if (idx !== -1) waitingPollers.splice(idx, 1);
        sendJson(res, 200, { action: 'NOOP', timestamp: Date.now() });
      }, 4500);

      /** @param {any} cmd */
      function fulfill(cmd) {
        clearTimeout(timer);
        sendJson(res, 200, cmd);
      }

      req.on('close', () => {
        clearTimeout(timer);
        const idx = waitingPollers.indexOf(fulfill);
        if (idx !== -1) waitingPollers.splice(idx, 1);
      });

      waitingPollers.push(fulfill);
      return;
    }

    // 3. Enqueue command from Agent CLI
    if (req.method === 'POST' && url.pathname === '/api/command') {
      const payload = await parseJsonBody(req);
      if (!payload.action) {
        return sendJson(res, 400, { success: false, error: 'Missing required field: action' });
      }

      const cmd = {
        id: payload.id || `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        action: payload.action,
        args: payload.args || {},
        timestamp: Date.now()
      };

      if (waitingPollers.length > 0) {
        const poller = waitingPollers.shift();
        poller?.(cmd);
      } else {
        commandQueue.push(cmd);
      }

      return sendJson(res, 201, {
        success: true,
        enqueued: cmd,
        pendingQueueLength: commandQueue.length
      });
    }

    // 4. Report command result from Studio
    if (req.method === 'POST' && url.pathname === '/api/report') {
      const report = await parseJsonBody(req);
      studioState.connected = true;
      studioState.lastSeen = Date.now();
      if (report.telemetry) {
        studioState.telemetry = report.telemetry;
      }

      const entry = {
        commandId: report.commandId || 'unknown',
        status: report.status || 'SUCCESS',
        details: report.details || {},
        error: report.error || null,
        telemetry: report.telemetry || {},
        timestamp: Date.now()
      };

      executionHistory.unshift(entry);
      if (executionHistory.length > 100) executionHistory.pop();

      return sendJson(res, 200, { success: true, recorded: entry });
    }

    // 5. Trigger Viewport Capture
    if (req.method === 'POST' && url.pathname === '/api/capture') {
      const captureScript = path.join(__dirname, 'screen_capture.py');
      const pyProcess = spawn('python', [captureScript], { cwd: __dirname });

      let output = '';
      let error = '';
      pyProcess.stdout.on('data', d => { output += d.toString(); });
      pyProcess.stderr.on('data', d => { error += d.toString(); });

      let responded = false;
      const respond = (status, data) => {
        if (responded) return;
        responded = true;
        sendJson(res, status, data);
      };

      pyProcess.on('error', err => {
        respond(500, {
          success: false,
          error: 'Failed to launch screen capture worker process',
          details: err.message
        });
      });

      pyProcess.on('close', code => {
        if (code === 0) {
          respond(200, {
            success: true,
            message: 'Capture complete',
            file: path.resolve(__dirname, '..', 'viewport_latest.png'),
            log: output.trim()
          });
        } else {
          respond(500, {
            success: false,
            error: 'Screen capture worker failed',
            details: error || output
          });
        }
      });
      return;
    }

    // 6. Execution History
    if (req.method === 'GET' && url.pathname === '/api/history') {
      return sendJson(res, 200, {
        success: true,
        count: executionHistory.length,
        history: executionHistory
      });
    }

    return sendJson(res, 404, { success: false, error: 'Endpoint not found' });
  } catch (err) {
    return sendJson(res, 500, { success: false, error: String(err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[RAASE 2.0 Bridge] Running at http://${HOST}:${PORT}`);
  console.log(`[RAASE 2.0 Bridge] Studio poll endpoint: http://${HOST}:${PORT}/api/poll`);
});
