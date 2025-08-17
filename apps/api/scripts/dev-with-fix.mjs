#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');

let isFixing = false;

async function runFixExtensions() {
  if (isFixing) return;
  isFixing = true;
  
  try {
    console.log('[dev-fix] Running fix-extensions...');
    const { spawn } = await import('node:child_process');
    const fixProcess = spawn('node', ['scripts/fix-extensions.mjs'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'pipe'
    });
    
    fixProcess.on('close', (code) => {
      if (code === 0) {
        console.log('[dev-fix] Extensions fixed!');
      } else {
        console.error('[dev-fix] Fix-extensions failed with code:', code);
      }
    });
  } catch (err) {
    console.error('[dev-fix] Error running fix-extensions:', err);
  } finally {
    isFixing = false;
  }
}

// Start NestJS in watch mode
const nestProcess = spawn('nest', ['start', '--watch'], {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..')
});

// Watch for changes in dist directory
const watcher = watch(distDir, { recursive: true }, (eventType, filename) => {
  if (filename && filename.endsWith('.js')) {
    console.log(`[dev-fix] Detected change in ${filename}`);
    setTimeout(runFixExtensions, 100); // Small delay to ensure file is written
  }
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n[dev-fix] Shutting down...');
  watcher.close();
  nestProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  watcher.close();
  nestProcess.kill();
  process.exit(0);
});

nestProcess.on('exit', (code) => {
  watcher.close();
  process.exit(code);
});

console.log('[dev-fix] NestJS development server started with auto-fix extensions');
