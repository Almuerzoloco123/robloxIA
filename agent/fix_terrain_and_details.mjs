#!/usr/bin/env node
// @ts-check
import fs from 'node:fs';
import path from 'node:path';

const BRIDGE_URL = process.env.RAASE_BRIDGE_URL || 'http://127.0.0.1:34873';

async function sendCommand(action, args = {}, shouldWait = true) {
  const res = await fetch(`${BRIDGE_URL}/api/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, args, wait: shouldWait })
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

async function fixTerrain() {
  console.log('🧹 Clearing obstructive terrain rock blocks with Air...');
  // Clear obstructive rocks
  await sendCommand('SET_TERRAIN_VOXELS', {
    shape: 'Block',
    material: 'Air',
    position: [0, 20, -100],
    size: [300, 60, 100]
  });
  await sendCommand('SET_TERRAIN_VOXELS', {
    shape: 'Block',
    material: 'Air',
    position: [-95, 20, -40],
    size: [140, 60, 140]
  });
  await sendCommand('SET_TERRAIN_VOXELS', {
    shape: 'Block',
    material: 'Air',
    position: [95, 20, -40],
    size: [140, 60, 140]
  });

  console.log('🌱 Smoothing flat grass plain...');
  // Flat clear grass ground
  await sendCommand('SET_TERRAIN_VOXELS', {
    shape: 'Block',
    material: 'Grass',
    position: [0, -4, 0],
    size: [260, 8, 260]
  });

  console.log('🏔️ Creating majestic distant mountain backdrop at Z = -140...');
  // Distant majestic mountain wall well behind the castle
  await sendCommand('SET_TERRAIN_VOXELS', {
    shape: 'Block',
    material: 'Rock',
    position: [0, 16, -135],
    size: [280, 40, 45]
  });
}

fixTerrain().catch(console.error);
