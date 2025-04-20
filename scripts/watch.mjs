import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '../src');
const buildCommand = 'npm';

const buildArgs = ['run', 'build'];

let buildTimeout;
let isBuilding = false;

function runBuild() {
    if (isBuilding) {
        console.log('Build already in progress, skipping...');
        return;
    }
    isBuilding = true;
    console.log('Change detected, running build...');
    const startTime = performance.now();
    const buildProcess = spawn(buildCommand, buildArgs, { stdio: 'inherit', shell: true });

    buildProcess.on('close', (code) => {
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        if (code === 0) {
            console.log(`Build completed successfully in ${duration}s.`);
        } else {
            console.error(`Build failed with code ${code} after ${duration}s.`);
        }
        isBuilding = false;
    });

    buildProcess.on('error', (err) => {
        console.error('Failed to start build process:', err);
        isBuilding = false;
    });
}

console.log('Performing initial build...');
runBuild();

console.log(`Watching for changes in ${srcDir}...`);
fs.watch(srcDir, { recursive: true }, (eventType, filename) => {
    if (filename) {
        clearTimeout(buildTimeout);
        buildTimeout = setTimeout(runBuild, 200);
    }
});