const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');


if (!fs.existsSync('node_modules')) {
    console.log('[+] Installing packages.');
    try {
        execSync('npm install', { stdio: 'inherit' });
        console.log('[+] Packages installed successfully.');
    } catch (error) {
        console.error('[!] Failed to install packages.');
        console.error(error);
        process.exit(1);
    }
} else {
    console.log('[+] Packages already installed');
}

console.log('[+] Starting Bot');
spawn('node', ['devrock.js'], { stdio: 'inherit' });