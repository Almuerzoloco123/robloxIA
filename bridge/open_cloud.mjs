// @ts-check
import fs from 'node:fs';
import path from 'node:path';

/**
 * Upload an asset (audio, model, texture) using Roblox Open Cloud API
 * Spec: https://create.roblox.com/docs/cloud/reference/Asset
 *
 * @param {Object} options
 * @param {string} options.filePath Local path to the asset (.glb, .png, .mp3)
 * @param {'Model' | 'Audio' | 'Decal'} options.assetType
 * @param {string} options.displayName Human-readable asset name
 * @param {string} [options.description]
 * @param {string} [options.apiKey] Roblox Open Cloud API key (falls back to ROBLOX_API_KEY env)
 * @param {string} [options.universeId] Optional universe ID
 * @returns {Promise<{ assetId: string, operationId?: string, rbxassetid: string }>}
 */
export async function uploadAssetOpenCloud({
  filePath,
  assetType,
  displayName,
  description = 'Uploaded automatically by RAASE 2.0 / robloxIA',
  apiKey = process.env.ROBLOX_API_KEY,
  universeId = process.env.ROBLOX_UNIVERSE_ID
}) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  if (!apiKey) {
    if (!process.env.ROBLOX_USER_ID) {
      console.warn('[OpenCloud] Warning: ROBLOX_USER_ID is not set in mock mode.');
    }
    console.warn('[OpenCloud] ROBLOX_API_KEY is not set. Returning mock asset ID for local testing.');
    const mockId = `mock_${Date.now()}`;
    return {
      assetId: mockId,
      rbxassetid: `rbxassetid://${mockId}`
    };
  }

  if (!process.env.ROBLOX_USER_ID) {
    throw new Error('ROBLOX_USER_ID environment variable is required when ROBLOX_API_KEY is provided for Open Cloud asset creation.');
  }

  const mimeMap = {
    Model: 'model/gltf-binary',
    Audio: 'audio/mpeg',
    Decal: 'image/png'
  };

  const fileData = fs.readFileSync(filePath);
  const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;

  const requestMetadata = JSON.stringify({
    assetType,
    displayName,
    description,
    creationContext: {
      creator: {
        userId: process.env.ROBLOX_USER_ID
      },
      expectedPrice: 0
    }
  });

  const bodyParts = [
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="request"\r\n`,
    `Content-Type: application/json\r\n\r\n`,
    `${requestMetadata}\r\n`,
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="fileContent"; filename="${path.basename(filePath)}"\r\n`,
    `Content-Type: ${mimeMap[assetType] || 'application/octet-stream'}\r\n\r\n`
  ];

  const preBuffer = Buffer.from(bodyParts.join(''));
  const postBuffer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const fullBody = Buffer.concat([preBuffer, fileData, postBuffer]);

  const response = await fetch('https://apis.roblox.com/assets/v1/assets', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: fullBody
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Open Cloud upload failed (${response.status}): ${errText}`);
  }

  const result = await response.json();
  let assetId = result.response?.assetId;

  // If async operation is returned, poll until done
  if (!assetId && result.path) {
    const opUrl = `https://apis.roblox.com/assets/v1/${result.path}`;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const opRes = await fetch(opUrl, { headers: { 'x-api-key': apiKey } });
      if (opRes.ok) {
        const opData = await opRes.json();
        if (opData.done) {
          if (opData.error) {
            throw new Error(`Open Cloud upload rejected (${opData.error.code}): ${opData.error.message || JSON.stringify(opData.error)}`);
          }
          if (opData.response?.assetId) {
            assetId = opData.response.assetId;
            break;
          }
        }
      }
    }
  }

  if (!assetId && result.response?.assetId) {
    assetId = result.response.assetId;
  }

  if (!assetId) {
    throw new Error(`Open Cloud upload operation timed out or failed to return assetId: ${result.path || 'unknown operation'}`);
  }

  return {
    assetId,
    operationId: result.path,
    rbxassetid: `rbxassetid://${assetId}`
  };
}

// Simple CLI runner
if (process.argv[1] && process.argv[1].endsWith('open_cloud.mjs')) {
  const [,, file, type, name] = process.argv;
  if (!file || !type || !name) {
    console.log('Usage: node open_cloud.mjs <file-path> <Model|Audio|Decal> <display-name>');
    process.exit(0);
  }

  uploadAssetOpenCloud({
    filePath: file,
    assetType: /** @type {any} */ (type),
    displayName: name
  }).then(res => {
    console.log('[OpenCloud] Success:', res);
  }).catch(err => {
    console.error('[OpenCloud] Error:', err.message);
    process.exit(1);
  });
}
