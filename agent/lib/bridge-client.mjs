// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BRIDGE_URL = process.env.RAASE_BRIDGE_URL || 'http://127.0.0.1:34873';

/**
 * Retrieve the active Bridge Bearer token from environment or disk
 * @returns {string}
 */
export function getBridgeToken() {
  if (process.env.ROBLOXIA_BRIDGE_TOKEN && process.env.ROBLOXIA_BRIDGE_TOKEN.trim()) {
    return process.env.ROBLOXIA_BRIDGE_TOKEN.trim();
  }
  const tokenFilePath = path.resolve(__dirname, '..', '..', 'bridge', '.bridge_token');
  if (fs.existsSync(tokenFilePath)) {
    try {
      return fs.readFileSync(tokenFilePath, 'utf8').trim();
    } catch {
      // ignore
    }
  }
  return '';
}

/**
 * Send a command to the bridge
 * @param {string} action
 * @param {Record<string, any>} [args]
 * @param {boolean} [shouldWait=true]
 * @param {number} [timeoutMs=15000]
 * @returns {Promise<any>}
 */
export async function sendCommand(action, args = {}, shouldWait = true, timeoutMs = 15000) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getBridgeToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BRIDGE_URL}/api/command`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, args, wait: shouldWait, timeoutMs })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  const data = await res.json();
  if (shouldWait && data.report && data.report.status === 'ERROR') {
    throw new Error(`Studio Error: ${data.report.error}`);
  }
  return data;
}

/**
 * Inspect an object via RPC
 * @param {string} targetPath
 * @returns {Promise<any>}
 */
export async function inspectObject(targetPath) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getBridgeToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BRIDGE_URL}/api/scene-graph/inspect`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ targetPath })
  });
  if (!res.ok) {
    return null;
  }
  return res.json();
}

/**
 * Query scene graph via RPC
 * @param {string} [rootPath='workspace']
 * @param {number} [maxDepth=2]
 * @returns {Promise<any>}
 */
export async function querySceneGraph(rootPath = 'workspace', maxDepth = 2) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getBridgeToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BRIDGE_URL}/api/scene-graph/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ rootPath, maxDepth })
  });
  if (!res.ok) {
    return null;
  }
  return res.json();
}
