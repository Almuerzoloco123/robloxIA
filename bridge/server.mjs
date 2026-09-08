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

/** @type {Map<string, (report: ExecutionReport) => void>} */
const reportWaiters = new Map();

/** @type {{ connected: boolean, lastSeen: number | null, telemetry: Record<string, any> }} */
const studioState = {
  connected: false,
  lastSeen: null,
  telemetry: {}
};

// Circuit Breaker for Screen Captures: prevents endless vision agent looping
const MAX_CONSECUTIVE_CAPTURES = 2;
let consecutiveCapturesCount = 0;

// Actions that mutate the 3D scene (resetting the capture circuit breaker)
const MUTATING_ACTIONS = new Set([
  'BATCH_SPAWN',
  'MODIFY_OBJECT',
  'DELETE_OBJECT',
  'CLEAR_ZONE',
  'SET_TERRAIN_VOXELS',
  'SET_LIGHTING',
  'EXECUTE_LUAU',
  'SPAWN_PART',
  'CREATE_ISLAND',
  'CSG_OPERATION'
]);

/**
 * Dispatch a command to Studio with optional synchronous waiting for report
 * @param {string} action
 * @param {Record<string, any>} args
 * @param {boolean} shouldWait
 * @param {number} timeoutMs
 * @returns {Promise<{ cmd: Command, report?: ExecutionReport }>}
 */
function dispatchCommand(action, args = {}, shouldWait = false, timeoutMs = 15000) {
  // If this command mutates the scene, reset capture circuit breaker
  if (MUTATING_ACTIONS.has(action)) {
    if (consecutiveCapturesCount > 0) {
      console.log(`[CircuitBreaker] Scene mutating action '${action}' detected. Resetting consecutive capture count from ${consecutiveCapturesCount} to 0.`);
    }
    consecutiveCapturesCount = 0;
  }

  const id = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cmd = { id, action, args, timestamp: Date.now() };

  if (waitingPollers.length > 0) {
    const poller = waitingPollers.shift();
    poller?.(cmd);
  } else {
    commandQueue.push(cmd);
  }

  if (!shouldWait) {
    return Promise.resolve({ cmd });
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      reportWaiters.delete(id);
      resolve({
        cmd,
        report: {
          commandId: id,
          status: 'ERROR',
          error: `Timed out waiting for Studio response after ${timeoutMs}ms`,
          timestamp: Date.now()
        }
      });
    }, timeoutMs);

    reportWaiters.set(id, (report) => {
      clearTimeout(timer);
      reportWaiters.delete(id);
      resolve({ cmd, report });
    });
  });
}

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
      if (body.length > 25 * 1024 * 1024) { // 25MB guard for large scene graphs & batches
        reject(new Error('Payload too large (>25MB)'));
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
        captureCircuitBreaker: {
          consecutiveCaptures: consecutiveCapturesCount,
          maxConsecutive: MAX_CONSECUTIVE_CAPTURES
        },
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

    // 3. Enqueue command from Agent CLI (supports synchronous wait)
    if (req.method === 'POST' && url.pathname === '/api/command') {
      const payload = await parseJsonBody(req);
      if (!payload.action) {
        return sendJson(res, 400, { success: false, error: 'Missing required field: action' });
      }

      const shouldWait = payload.wait === true || url.searchParams.get('wait') === 'true';
      const timeoutMs = typeof payload.timeoutMs === 'number' ? payload.timeoutMs : 15000;
      const { cmd, report } = await dispatchCommand(payload.action, payload.args || {}, shouldWait, timeoutMs);

      if (shouldWait) {
        return sendJson(res, report?.status === 'SUCCESS' ? 200 : 500, {
          success: report?.status === 'SUCCESS',
          commandId: cmd.id,
          report: report || null
        });
      }

      return sendJson(res, 201, {
        success: true,
        enqueued: cmd,
        pendingQueueLength: commandQueue.length
      });
    }

    // 3b. Specialized Scene Graph RPC Endpoints
    if (req.method === 'POST' && url.pathname === '/api/scene-graph/query') {
      const payload = await parseJsonBody(req);
      const { report } = await dispatchCommand('GET_SCENE_GRAPH', payload, true, 20000);
      return sendJson(res, report?.status === 'SUCCESS' ? 200 : 500, {
        success: report?.status === 'SUCCESS',
        result: report?.details || {},
        error: report?.error || null,
        telemetry: report?.telemetry || {}
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/scene-graph/inspect') {
      const payload = await parseJsonBody(req);
      const { report } = await dispatchCommand('INSPECT_OBJECT', payload, true, 10000);
      return sendJson(res, report?.status === 'SUCCESS' ? 200 : 500, {
        success: report?.status === 'SUCCESS',
        result: report?.details || {},
        error: report?.error || null
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/scene-graph/modify') {
      const payload = await parseJsonBody(req);
      const { report } = await dispatchCommand('MODIFY_OBJECT', payload, true, 12000);
      return sendJson(res, report?.status === 'SUCCESS' ? 200 : 500, {
        success: report?.status === 'SUCCESS',
        result: report?.details || {},
        error: report?.error || null
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/scene-graph/delete') {
      const payload = await parseJsonBody(req);
      const { report } = await dispatchCommand('DELETE_OBJECT', payload, true, 10000);
      return sendJson(res, report?.status === 'SUCCESS' ? 200 : 500, {
        success: report?.status === 'SUCCESS',
        result: report?.details || {},
        error: report?.error || null
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/scene-graph/clear-zone') {
      const payload = await parseJsonBody(req);
      const { report } = await dispatchCommand('CLEAR_ZONE', payload, true, 15000);
      return sendJson(res, report?.status === 'SUCCESS' ? 200 : 500, {
        success: report?.status === 'SUCCESS',
        result: report?.details || {},
        error: report?.error || null
      });
    }

    // 3c. Batch Command Dispatch (BATCH_SPAWN)
    if (req.method === 'POST' && url.pathname === '/api/command/batch') {
      const payload = await parseJsonBody(req);
      const shouldWait = payload.wait !== false;
      const { cmd, report } = await dispatchCommand('BATCH_SPAWN', payload, shouldWait, 30000);

      if (shouldWait) {
        return sendJson(res, report?.status === 'SUCCESS' ? 200 : 500, {
          success: report?.status === 'SUCCESS',
          commandId: cmd.id,
          result: report?.details || {},
          error: report?.error || null
        });
      }

      return sendJson(res, 202, {
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

      // Fulfill any waiting synchronous promises
      if (entry.commandId && reportWaiters.has(entry.commandId)) {
        const waiter = reportWaiters.get(entry.commandId);
        waiter?.(entry);
      }

      executionHistory.unshift(entry);
      if (executionHistory.length > 100) executionHistory.pop();

      return sendJson(res, 200, { success: true, recorded: entry });
    }

    // 5. Trigger Viewport Capture (guarded by Circuit Breaker)
    if (req.method === 'POST' && url.pathname === '/api/capture') {
      const isForce = url.searchParams.get('force') === 'true';

      if (!isForce && consecutiveCapturesCount >= MAX_CONSECUTIVE_CAPTURES) {
        console.warn(`[CIRCUIT BREAKER] Capture blocked: ${consecutiveCapturesCount} consecutive captures without scene mutations.`);
        return sendJson(res, 429, {
          success: false,
          circuitBreaker: true,
          error: `CIRCUIT_BREAKER_TRIGGERED: Maximum consecutive captures (${MAX_CONSECUTIVE_CAPTURES}) reached without scene mutations. You MUST perform a scene mutation (or finish the audit and report to user) before capturing again.`,
          consecutiveCaptures: consecutiveCapturesCount,
          solution: 'Execute a modifying command (e.g. /api/scene-graph/modify, /api/command/batch, /api/command with BATCH_SPAWN/SET_TERRAIN_VOXELS/EXECUTE_LUAU) or call POST /api/capture/reset to reset.'
        });
      }

      consecutiveCapturesCount++;
      console.log(`[ScreenCapture] Executing capture (#${consecutiveCapturesCount}/${MAX_CONSECUTIVE_CAPTURES})...`);

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
            consecutiveCaptures: consecutiveCapturesCount,
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

    // 5b. Reset Viewport Capture Circuit Breaker
    if (req.method === 'POST' && url.pathname === '/api/capture/reset') {
      consecutiveCapturesCount = 0;
      console.log('[CircuitBreaker] Counter manually reset to 0');
      return sendJson(res, 200, {
        success: true,
        message: 'Capture circuit breaker counter reset to 0'
      });
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
