// @ts-check
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 34873;
const HOST = '127.0.0.1';

// C1: Secure Random Bearer Token (Persistent across restarts)
const TOKEN_FILE = process.env.ROBLOXIA_TOKEN_PATH || path.join(__dirname, '.bridge_token');
let resolvedToken = process.env.ROBLOXIA_BRIDGE_TOKEN?.trim();

// 1. If not provided in env, read from existing token file to persist token across restarts
if (!resolvedToken && fs.existsSync(TOKEN_FILE)) {
  try {
    const existing = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    if (existing && existing.length >= 16) {
      resolvedToken = existing;
    }
  } catch {
    // ignore read error and generate new token
  }
}

// 2. Only generate a new cryptographically secure token if none exists
if (!resolvedToken) {
  resolvedToken = crypto.randomBytes(32).toString('hex');
}

const BRIDGE_TOKEN = resolvedToken;

// 3. Persist to disk unless disabled (e.g. during test runs)
if (process.env.ROBLOXIA_NO_WRITE_TOKEN_FILE !== '1') {
  try {
    let currentOnDisk = '';
    if (fs.existsSync(TOKEN_FILE)) {
      currentOnDisk = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    }
    if (currentOnDisk !== BRIDGE_TOKEN) {
      fs.writeFileSync(TOKEN_FILE, BRIDGE_TOKEN, { encoding: 'utf8', mode: 0o600 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Bridge] Warning: Could not write token file:', msg);
  }
}

/**
 * Timing-safe authentication check
 * @param {http.IncomingMessage} req
 * @returns {boolean}
 */
function authenticate(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string') return false;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return false;
  const clientToken = parts[1].trim();
  if (clientToken.length !== BRIDGE_TOKEN.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(clientToken), Buffer.from(BRIDGE_TOKEN));
  } catch {
    return false;
  }
}

/**
 * Dynamic CORS headers restricting to local origin
 * @param {http.IncomingMessage} [req]
 * @returns {Record<string, string>}
 */
function getCorsHeaders(req) {
  const origin = (req && req.headers['origin']) ? String(req.headers['origin']) : '';
  const isAllowed = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin);
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Access-Control-Allow-Origin': isAllowed ? origin : `http://${HOST}:${PORT}`,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Idempotency-Key',
    'Vary': 'Origin'
  };
}

/**
 * @typedef {Object} Command
 * @property {string} id
 * @property {string} action
 * @property {Record<string, any>} args
 * @property {number} timestamp
 * @property {string} [idempotencyKey]
 * @property {string} [reportNonce]
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

/** @type {Map<string, { cmd: Command, timestamp: number, reportNonce?: string }>} */
const dispatchedCommands = new Map();

/** @type {Map<string, { cmd: Command, report?: ExecutionReport, inFlight?: Promise<any>, timestamp: number }>} */
const idempotencyCache = new Map();

/** @type {{ connected: boolean, lastSeen: number | null, telemetry: Record<string, any> }} */
const studioState = {
  connected: false,
  lastSeen: null,
  telemetry: {}
};

// Circuit Breaker for Screen Captures: prevents endless vision agent looping
const MAX_CONSECUTIVE_CAPTURES = 2;
let consecutiveCapturesCount = 0;

function cleanupCaches() {
  const now = Date.now();
  const TEN_MINUTES = 10 * 60 * 1000;
  for (const [key, entry] of idempotencyCache.entries()) {
    if (now - entry.timestamp > TEN_MINUTES) {
      idempotencyCache.delete(key);
    }
  }
  for (const [id, entry] of dispatchedCommands.entries()) {
    if (now - entry.timestamp > 3600000) {
      dispatchedCommands.delete(id);
    }
  }
}

/**
 * Evaluates whether a reported execution produced an actual scene mutation delta.
 * Only real mutations reset the consecutive capture circuit breaker.
 * @param {Command | undefined} cmd
 * @param {ExecutionReport} report
 * @returns {boolean}
 */
function evaluateSceneMutationDelta(cmd, report) {
  if (!cmd || report.status !== 'SUCCESS') return false;
  const { action } = cmd;
  const details = report.details || {};

  if (action === 'BATCH_SPAWN') {
    const created = Number(details.createdCount) || 0;
    const updated = Number(details.updatedCount) || 0;
    return created > 0 || updated > 0;
  }
  if (action === 'MODIFY_OBJECT') {
    const modified = details.modifiedProperties;
    return Array.isArray(modified) && modified.length > 0;
  }
  if (action === 'DELETE_OBJECT') {
    return details.deleted === true;
  }
  if (action === 'CLEAR_ZONE') {
    const cleared = Number(details.clearedParts) || 0;
    return cleared > 0;
  }
  if (action === 'SPAWN_PART' || action === 'CREATE_ISLAND' || action === 'CSG_OPERATION' || action === 'SET_TERRAIN_VOXELS' || action === 'SET_LIGHTING') {
    return true;
  }
  if (action === 'EXECUTE_LUAU') {
    // Luau code execution cannot self-certify scene mutations. Only verified declarative scene actions reset breaker.
    return false;
  }
  return false;
}

/**
 * Dispatch a command to Studio with optional synchronous waiting for report
 * @param {string} action
 * @param {Record<string, any>} args
 * @param {boolean} shouldWait
 * @param {number} timeoutMs
 * @param {string} [idempotencyKey]
 * @returns {Promise<{ cmd: Command, report?: ExecutionReport }>}
 */
function dispatchCommand(action, args = {}, shouldWait = false, timeoutMs = 15000, idempotencyKey = undefined) {
  cleanupCaches();

  const id = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const reportNonce = crypto.randomBytes(16).toString('hex');
  const cmd = { id, action, args, timestamp: Date.now(), idempotencyKey, reportNonce };

  dispatchedCommands.set(id, { cmd, timestamp: Date.now(), reportNonce });

  if (waitingPollers.length > 0) {
    const poller = waitingPollers.shift();
    poller?.(cmd);
  } else {
    if (commandQueue.length >= 200) {
      const err = new Error('Command queue is full (max 200 items). Studio may be offline, paused, or overwhelmed.');
      // @ts-ignore
      err.statusCode = 503;
      throw err;
    }
    commandQueue.push(cmd);
  }

  if (!shouldWait) {
    return Promise.resolve({ cmd });
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      reportWaiters.delete(id);
      const timeoutReport = {
        commandId: id,
        status: /** @type {'ERROR'} */ ('ERROR'),
        error: `Timed out waiting for Studio response after ${timeoutMs}ms`,
        timestamp: Date.now()
      };
      resolve({ cmd, report: timeoutReport });
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
 * @param {http.IncomingMessage} [req]
 */
function sendJson(res, statusCode, data, req = undefined) {
  res.writeHead(statusCode, getCorsHeaders(req));
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
        try {
          req.destroy();
        } catch {}
        const err = new Error('Payload too large (>25MB)');
        // @ts-ignore
        err.statusCode = 413;
        reject(err);
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        const parseErr = new Error('Invalid JSON');
        // @ts-ignore
        parseErr.statusCode = 400;
        reject(parseErr);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || HOST}`);

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, getCorsHeaders(req));
    return res.end();
  }

  try {
    // 1. Health and Status (Public read-only)
    if (req.method === 'GET' && url.pathname === '/api/status') {
      const isAlive = studioState.lastSeen ? (Date.now() - studioState.lastSeen < 15000) : false;
      return sendJson(res, 200, {
        success: true,
        bridge: 'running',
        port: PORT,
        studioConnected: isAlive,
        queueLength: commandQueue.length,
        waitingPollers: waitingPollers.length,
        authRequired: true,
        captureCircuitBreaker: {
          consecutiveCaptures: consecutiveCapturesCount,
          maxConsecutive: MAX_CONSECUTIVE_CAPTURES
        },
        studioState
      }, req);
    }

    // 2. Poll command for Studio (Long-Polling, Protected by Bearer Token)
    if (req.method === 'GET' && url.pathname === '/api/poll') {
      if (!authenticate(req)) {
        return sendJson(res, 401, {
          success: false,
          error: 'UNAUTHORIZED: Valid Bearer token required in Authorization header to poll commands.'
        }, req);
      }

      studioState.connected = true;
      studioState.lastSeen = Date.now();

      if (commandQueue.length > 0) {
        const nextCmd = commandQueue.shift();
        return sendJson(res, 200, nextCmd, req);
      }

      // Long polling: wait up to 4.5 seconds for a command
      const timer = setTimeout(() => {
        const idx = waitingPollers.indexOf(fulfill);
        if (idx !== -1) waitingPollers.splice(idx, 1);
        sendJson(res, 200, { action: 'NOOP', timestamp: Date.now() }, req);
      }, 4500);

      /** @param {any} cmd */
      function fulfill(cmd) {
        clearTimeout(timer);
        sendJson(res, 200, cmd, req);
      }

      req.on('close', () => {
        clearTimeout(timer);
        const idx = waitingPollers.indexOf(fulfill);
        if (idx !== -1) waitingPollers.splice(idx, 1);
      });

      waitingPollers.push(fulfill);
      return;
    }

    // 3. Enqueue command from Agent CLI (Protected by Bearer Token + Idempotency)
    if (req.method === 'POST' && url.pathname === '/api/command') {
      if (!authenticate(req)) {
        return sendJson(res, 401, {
          success: false,
          error: 'UNAUTHORIZED: Valid Bearer token required in Authorization header.'
        }, req);
      }

      const payload = await parseJsonBody(req);
      if (!payload.action) {
        return sendJson(res, 400, { success: false, error: 'Missing required field: action' }, req);
      }

      const idempotencyKey = req.headers['x-idempotency-key'] || payload.idempotencyKey;
      if (idempotencyKey && typeof idempotencyKey === 'string') {
        cleanupCaches();
        const cached = idempotencyCache.get(idempotencyKey);
        if (cached) {
          if (cached.report) {
            return sendJson(res, cached.report.status === 'SUCCESS' ? 200 : 500, {
              success: cached.report.status === 'SUCCESS',
              commandId: cached.cmd.id,
              report: cached.report,
              idempotentReplay: true
            }, req);
          }
          if (cached.inFlight) {
            const result = await cached.inFlight;
            return sendJson(res, result.report?.status === 'SUCCESS' ? 200 : 500, {
              success: result.report?.status === 'SUCCESS',
              commandId: result.cmd.id,
              report: result.report || null,
              idempotentReplay: true
            }, req);
          }
        }
      }

      const shouldWait = payload.wait === true || url.searchParams.get('wait') === 'true';
      const timeoutMs = typeof payload.timeoutMs === 'number' ? payload.timeoutMs : 15000;

      const dispatchPromise = dispatchCommand(payload.action, payload.args || {}, shouldWait, timeoutMs, idempotencyKey);

      if (idempotencyKey && typeof idempotencyKey === 'string') {
        idempotencyCache.set(idempotencyKey, {
          cmd: { id: '', action: payload.action, args: payload.args, timestamp: Date.now() },
          inFlight: dispatchPromise,
          timestamp: Date.now()
        });
      }

      const { cmd, report } = await dispatchPromise;

      if (idempotencyKey && typeof idempotencyKey === 'string') {
        idempotencyCache.set(idempotencyKey, {
          cmd,
          report,
          timestamp: Date.now()
        });
      }

      if (shouldWait) {
        return sendJson(res, report?.status === 'SUCCESS' ? 200 : 500, {
          success: report?.status === 'SUCCESS',
          commandId: cmd.id,
          report: report || null
        }, req);
      }

      const { reportNonce: _nonce, ...safeCmd } = cmd;
      return sendJson(res, 201, {
        success: true,
        enqueued: safeCmd,
        pendingQueueLength: commandQueue.length
      }, req);
    }

    // 3b. Specialized Scene Graph RPC Endpoints (All Protected by Bearer Token)
    if (req.method === 'POST' && url.pathname === '/api/scene-graph/query') {
      if (!authenticate(req)) {
        return sendJson(res, 401, { success: false, error: 'UNAUTHORIZED: Valid Bearer token required.' }, req);
      }
      const payload = await parseJsonBody(req);
      const { report } = await dispatchCommand('GET_SCENE_GRAPH', payload, true, 20000);
      return sendJson(res, report?.status === 'SUCCESS' ? 200 : 500, {
        success: report?.status === 'SUCCESS',
        result: report?.details || {},
        error: report?.error || null,
        telemetry: report?.telemetry || {}
      }, req);
    }

    if (req.method === 'POST' && url.pathname === '/api/scene-graph/inspect') {
      if (!authenticate(req)) {
        return sendJson(res, 401, { success: false, error: 'UNAUTHORIZED: Valid Bearer token required.' }, req);
      }
      const payload = await parseJsonBody(req);
      const { report } = await dispatchCommand('INSPECT_OBJECT', payload, true, 10000);
      return sendJson(res, report?.status === 'SUCCESS' ? 200 : 500, {
        success: report?.status === 'SUCCESS',
        result: report?.details || {},
        error: report?.error || null
      }, req);
    }

    if (req.method === 'POST' && url.pathname === '/api/scene-graph/modify') {
      if (!authenticate(req)) {
        return sendJson(res, 401, { success: false, error: 'UNAUTHORIZED: Valid Bearer token required.' }, req);
      }
      const payload = await parseJsonBody(req);
      const { report } = await dispatchCommand('MODIFY_OBJECT', payload, true, 12000);
      return sendJson(res, report?.status === 'SUCCESS' ? 200 : 500, {
        success: report?.status === 'SUCCESS',
        result: report?.details || {},
        error: report?.error || null
      }, req);
    }

    if (req.method === 'POST' && url.pathname === '/api/scene-graph/delete') {
      if (!authenticate(req)) {
        return sendJson(res, 401, { success: false, error: 'UNAUTHORIZED: Valid Bearer token required.' }, req);
      }
      const payload = await parseJsonBody(req);
      const { report } = await dispatchCommand('DELETE_OBJECT', payload, true, 10000);
      return sendJson(res, report?.status === 'SUCCESS' ? 200 : 500, {
        success: report?.status === 'SUCCESS',
        result: report?.details || {},
        error: report?.error || null
      }, req);
    }

    if (req.method === 'POST' && url.pathname === '/api/scene-graph/clear-zone') {
      if (!authenticate(req)) {
        return sendJson(res, 401, { success: false, error: 'UNAUTHORIZED: Valid Bearer token required.' }, req);
      }
      const payload = await parseJsonBody(req);
      const { report } = await dispatchCommand('CLEAR_ZONE', payload, true, 15000);
      return sendJson(res, report?.status === 'SUCCESS' ? 200 : 500, {
        success: report?.status === 'SUCCESS',
        result: report?.details || {},
        error: report?.error || null
      }, req);
    }

    // 3c. Batch Command Dispatch (BATCH_SPAWN) (Protected by Bearer Token + Idempotency)
    if (req.method === 'POST' && url.pathname === '/api/command/batch') {
      if (!authenticate(req)) {
        return sendJson(res, 401, { success: false, error: 'UNAUTHORIZED: Valid Bearer token required.' }, req);
      }
      const payload = await parseJsonBody(req);
      const shouldWait = payload.wait !== false;
      const idempotencyKey = req.headers['x-idempotency-key'] || payload.idempotencyKey;

      if (idempotencyKey && typeof idempotencyKey === 'string') {
        cleanupCaches();
        const cached = idempotencyCache.get(idempotencyKey);
        if (cached) {
          if (cached.report) {
            return sendJson(res, cached.report.status === 'SUCCESS' ? 200 : 500, {
              success: cached.report.status === 'SUCCESS',
              commandId: cached.cmd.id,
              result: cached.report.details || {},
              error: cached.report.error || null,
              idempotentReplay: true
            }, req);
          }
          if (cached.inFlight) {
            const result = await cached.inFlight;
            return sendJson(res, result.report?.status === 'SUCCESS' ? 200 : 500, {
              success: result.report?.status === 'SUCCESS',
              commandId: result.cmd.id,
              result: result.report?.details || {},
              error: result.report?.error || null,
              idempotentReplay: true
            }, req);
          }
        }
      }

      const dispatchPromise = dispatchCommand('BATCH_SPAWN', payload, shouldWait, 30000, idempotencyKey);

      if (idempotencyKey && typeof idempotencyKey === 'string') {
        idempotencyCache.set(idempotencyKey, {
          cmd: { id: '', action: 'BATCH_SPAWN', args: payload, timestamp: Date.now() },
          inFlight: dispatchPromise,
          timestamp: Date.now()
        });
      }

      const { cmd, report } = await dispatchPromise;

      if (idempotencyKey && typeof idempotencyKey === 'string') {
        idempotencyCache.set(idempotencyKey, {
          cmd,
          report,
          timestamp: Date.now()
        });
      }

      if (shouldWait) {
        return sendJson(res, report?.status === 'SUCCESS' ? 200 : 500, {
          success: report?.status === 'SUCCESS',
          commandId: cmd.id,
          result: report?.details || {},
          error: report?.error || null
        }, req);
      }

      const { reportNonce: _nonce, ...safeCmd } = cmd;
      return sendJson(res, 202, {
        success: true,
        enqueued: safeCmd,
        pendingQueueLength: commandQueue.length
      }, req);
    }

    // 4. Report command result from Studio (C4: Protected by Bearer Token, Validates commandId, Fail-closed)
    if (req.method === 'POST' && url.pathname === '/api/report') {
      if (!authenticate(req)) {
        return sendJson(res, 401, {
          success: false,
          error: 'UNAUTHORIZED: Valid Bearer token required to report execution results.'
        }, req);
      }

      const report = await parseJsonBody(req);
      if (!report.commandId || typeof report.commandId !== 'string' || !dispatchedCommands.has(report.commandId)) {
        return sendJson(res, 400, {
          success: false,
          error: 'BAD_REQUEST: Missing, invalid, or unrecognized commandId. Orphan reports are rejected.'
        }, req);
      }

      const dispatched = dispatchedCommands.get(report.commandId);
      if (dispatched && dispatched.reportNonce && report.reportNonce !== dispatched.reportNonce) {
        return sendJson(res, 403, {
          success: false,
          error: 'FORBIDDEN: Invalid or missing reportNonce. Only the authorized Studio runner can report execution results.'
        }, req);
      }

      studioState.connected = true;
      studioState.lastSeen = Date.now();
      if (report.telemetry) {
        studioState.telemetry = report.telemetry;
      }

      // Fail-closed: Only explicit 'SUCCESS' is SUCCESS; anything else or missing defaults to 'ERROR'
      const sanitizedStatus = (report.status === 'SUCCESS') ? 'SUCCESS' : 'ERROR';

      /** @type {ExecutionReport} */
      const entry = {
        commandId: report.commandId,
        status: sanitizedStatus,
        details: (report.details && typeof report.details === 'object') ? report.details : {},
        error: report.error ? String(report.error) : (sanitizedStatus === 'ERROR' ? 'Execution failed or status was not SUCCESS' : undefined),
        telemetry: report.telemetry || {},
        timestamp: Date.now()
      };

      // Circuit Breaker Evaluation: Only real scene mutations reset the counter
      if (evaluateSceneMutationDelta(dispatched?.cmd, entry)) {
        if (consecutiveCapturesCount > 0) {
          console.log(`[CircuitBreaker] Confirmed scene mutation from '${dispatched?.cmd?.action}' (${entry.commandId}). Resetting consecutive captures from ${consecutiveCapturesCount} to 0.`);
        }
        consecutiveCapturesCount = 0;
      }

      // Update idempotency cache if associated
      if (dispatched?.cmd?.idempotencyKey) {
        idempotencyCache.set(dispatched.cmd.idempotencyKey, {
          cmd: dispatched.cmd,
          report: entry,
          timestamp: Date.now()
        });
      }

      // Fulfill any waiting synchronous promises
      if (reportWaiters.has(entry.commandId)) {
        const waiter = reportWaiters.get(entry.commandId);
        waiter?.(entry);
      }

      executionHistory.unshift(entry);
      if (executionHistory.length > 100) executionHistory.pop();

      return sendJson(res, 200, { success: true, recorded: entry }, req);
    }

    // 5. Trigger Viewport Capture (Protected by Bearer Token & Circuit Breaker)
    if (req.method === 'POST' && url.pathname === '/api/capture') {
      if (!authenticate(req)) {
        return sendJson(res, 401, { success: false, error: 'UNAUTHORIZED: Valid Bearer token required.' }, req);
      }

      const allowDebugForce = process.env.ROBLOXIA_DEBUG_ALLOW_FORCE_CAPTURE === 'true';
      const requestedForce = url.searchParams.get('force') === 'true';
      if (requestedForce && !allowDebugForce) {
        console.warn('[CIRCUIT BREAKER] ?force=true rejected: Debug bypass is disabled in production. Export ROBLOXIA_DEBUG_ALLOW_FORCE_CAPTURE=true to enable.');
      }
      const isForce = requestedForce && allowDebugForce;

      if (!isForce && consecutiveCapturesCount >= MAX_CONSECUTIVE_CAPTURES) {
        console.warn(`[CIRCUIT BREAKER] Capture blocked: ${consecutiveCapturesCount} consecutive captures without verified scene mutations.`);
        return sendJson(res, 429, {
          success: false,
          circuitBreaker: true,
          error: `CIRCUIT_BREAKER_TRIGGERED: Maximum consecutive captures (${MAX_CONSECUTIVE_CAPTURES}) reached without verified scene mutations. You MUST execute an actual modifying command before capturing again.`,
          consecutiveCaptures: consecutiveCapturesCount,
          solution: 'Execute a modifying command that mutates the scene (e.g. BATCH_SPAWN, MODIFY_OBJECT, DELETE_OBJECT, CLEAR_ZONE). Automated reset is not permitted.'
        }, req);
      }

      consecutiveCapturesCount++;
      console.log(`[ScreenCapture] Executing capture (#${consecutiveCapturesCount}/${MAX_CONSECUTIVE_CAPTURES})...`);

      const captureScript = path.join(__dirname, 'screen_capture.py');
      let responded = false;
      /** @type {import('node:child_process').ChildProcess | null} */
      let activeProc = null;

      const timer = setTimeout(() => {
        if (responded) return;
        console.warn('[ScreenCapture] Worker timed out after 10s. Terminating process.');
        try { activeProc?.kill(); } catch {}
        try { req.destroy(); } catch {}
        respond(504, {
          success: false,
          error: 'Screen capture worker timed out after 10000ms'
        });
      }, 10000);

      /**
       * @param {number} status
       * @param {any} data
       */
      const respond = (status, data) => {
        if (responded) return;
        responded = true;
        clearTimeout(timer);
        sendJson(res, status, data, req);
      };

      req.on('close', () => {
        if (!responded) {
          try { activeProc?.kill(); } catch {}
        }
      });

      /**
       * @param {string} cmd
       * @param {string[]} args
       * @param {boolean} [isFallback]
       */
      function launchWorker(cmd, args, isFallback = false) {
        let output = '';
        let error = '';
        /** @type {import('node:child_process').ChildProcess | undefined} */
        let proc;
        try {
          proc = spawn(cmd, args, { cwd: __dirname });
          activeProc = proc;
        } catch (spawnErr) {
          const spawnMsg = spawnErr instanceof Error ? spawnErr.message : String(spawnErr);
          if (!isFallback && process.platform === 'win32') {
            console.log('[ScreenCapture] "python" failed to spawn, attempting fallback to "py -3"...');
            return launchWorker('py', ['-3', captureScript], true);
          }
          return respond(500, {
            success: false,
            error: 'Failed to launch screen capture worker process',
            details: spawnMsg
          });
        }

        proc.stdout?.on('data', d => { output += d.toString(); });
        proc.stderr?.on('data', d => { error += d.toString(); });

        proc.on('error', err => {
          if (!isFallback && process.platform === 'win32') {
            console.log('[ScreenCapture] "python" error event, attempting fallback to "py -3"...');
            return launchWorker('py', ['-3', captureScript], true);
          }
          respond(500, {
            success: false,
            error: 'Failed to launch screen capture worker process',
            details: err.message
          });
        });

        proc.on('close', code => {
          if (responded) return;
          const combined = output + error;
          if (code !== 0 && !isFallback && process.platform === 'win32' && (combined.includes('Python was not found') || combined.includes('Microsoft Store') || code === 9009)) {
            console.log('[ScreenCapture] Detected Windows Python Store stub, falling back to "py -3"...');
            return launchWorker('py', ['-3', captureScript], true);
          }

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
      }

      launchWorker('python', [captureScript], false);
      return;
    }

    // 5b. Reset Viewport Capture Circuit Breaker (Protected by Bearer Token + Manual Confirmation)
    if (req.method === 'POST' && url.pathname === '/api/capture/reset') {
      if (!authenticate(req)) {
        return sendJson(res, 401, { success: false, error: 'UNAUTHORIZED: Valid Bearer token required.' }, req);
      }
      const isManual = req.headers['x-manual-reset'] === 'true' || url.searchParams.get('manual') === 'true';
      if (!isManual) {
        return sendJson(res, 403, {
          success: false,
          error: 'FORBIDDEN: Automated capture reset blocked. Manual confirmation required (pass header X-Manual-Reset: true or query ?manual=true).'
        }, req);
      }
      consecutiveCapturesCount = 0;
      console.log('[CircuitBreaker] Counter manually reset to 0 with explicit confirmation');
      return sendJson(res, 200, {
        success: true,
        message: 'Capture circuit breaker counter reset to 0'
      }, req);
    }

    // 6. Execution History (Protected by Bearer Token)
    if (req.method === 'GET' && url.pathname === '/api/history') {
      if (!authenticate(req)) {
        return sendJson(res, 401, { success: false, error: 'UNAUTHORIZED: Valid Bearer token required.' }, req);
      }
      return sendJson(res, 200, {
        success: true,
        count: executionHistory.length,
        history: executionHistory
      }, req);
    }

    return sendJson(res, 404, { success: false, error: 'Endpoint not found' }, req);
  } catch (err) {
    if (res.headersSent || res.writableEnded) return;
    const errObj = /** @type {any} */ (err);
    const statusCode = (errObj && typeof errObj === 'object' && typeof errObj.statusCode === 'number') ? errObj.statusCode : 500;
    return sendJson(res, statusCode, { success: false, error: errObj?.message || String(err) }, req);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`================================================================`);
  console.log(`[RAASE 2.1 Bridge] Running at http://${HOST}:${PORT}`);
  console.log(`[RAASE 2.1 Security] Active Bearer Token:`);
  console.log(`🔑 ${BRIDGE_TOKEN}`);
  console.log(`[RAASE 2.1 Security] Export: ROBLOXIA_BRIDGE_TOKEN=${BRIDGE_TOKEN}`);
  console.log(`================================================================`);
});
