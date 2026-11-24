/**
 * ExamEase - Automatic Backend Health & Startup Manager
 * Ensures that the Python Flask backend is running on port 5000 before Expo/Metro starts.
 */
const http = require('http');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const PORT = 5000;
const HEALTH_URL = `http://127.0.0.1:${PORT}/api/health`;

// 1. Detect active LAN IPv4 Address
function getActiveLanIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      const family = typeof iface.family === 'string' ? iface.family : (iface.family === 4 ? 'IPv4' : 'IPv6');
      if (family === 'IPv4' && !iface.internal) {
        const addr = iface.address;
        const isCommonLan = addr.startsWith('192.168.') || addr.startsWith('10.') || addr.startsWith('172.');
        candidates.push({ name, addr, isCommonLan });
      }
    }
  }

  // Prefer Wi-Fi or Ethernet LAN over virtual switches
  const preferred = candidates.find(c => c.name.toLowerCase().includes('wi-fi') || c.name.toLowerCase().includes('wireless')) ||
                    candidates.find(c => c.name.toLowerCase().includes('ethernet')) ||
                    candidates.find(c => c.isCommonLan) ||
                    candidates[0];

  return preferred ? preferred.addr : '127.0.0.1';
}

// 2. Save active network configuration
function saveNetworkConfig(lanIp) {
  try {
    const configDir = path.resolve(__dirname, '..', 'src', 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    const configPath = path.join(configDir, 'network-config.json');
    const data = {
      hostLanIp: lanIp,
      port: PORT,
      apiBaseUrl: `http://${lanIp}:${PORT}/api`,
      localhostUrl: `http://localhost:${PORT}/api`,
      emulatorUrl: `http://10.0.2.2:${PORT}/api`,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('[ExamEase] Warning: Could not write network-config.json:', err.message);
  }
}

// 3. Ping backend health check
function checkHealth(timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, { timeout: timeoutMs }, (res) => {
      if (res.statusCode === 200) {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            resolve(parsed.status === 'healthy' || res.statusCode === 200);
          } catch {
            resolve(res.statusCode === 200);
          }
        });
      } else {
        resolve(false);
      }
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.on('error', () => {
      resolve(false);
    });
  });
}

// 4. Locate Python executable on Windows / cross-platform
function findPython() {
  const candidates = [
    'python',
    'py',
    'C:\\Program Files\\Python314\\python.exe',
    'C:\\Program Files\\Python313\\python.exe',
    'C:\\Program Files\\Python312\\python.exe',
    'C:\\Program Files\\Python311\\python.exe',
  ];

  for (const p of candidates) {
    try {
      execSync(`"${p}" --version`, { stdio: 'ignore' });
      return p;
    } catch {}
  }
  return 'python';
}

// 5. Main launcher function
async function ensureBackend() {
  const lanIp = getActiveLanIp();
  saveNetworkConfig(lanIp);

  const isAlreadyRunning = await checkHealth(1200);
  if (isAlreadyRunning) {
    console.log(`\x1b[32m✔ [ExamEase] Flask Backend is ALREADY RUNNING on port ${PORT} (LAN: ${lanIp})\x1b[0m`);
    return true;
  }

  console.log(`\x1b[33m⚡ [ExamEase] Flask Backend is offline. Starting automatically...\x1b[0m`);

  const backendDir = path.resolve(__dirname, '..', '..', 'backend');
  const runPyPath = path.join(backendDir, 'run.py');

  if (!fs.existsSync(runPyPath)) {
    console.error(`\x1b[31m✖ [ExamEase] Error: backend/run.py not found at ${runPyPath}\x1b[0m`);
    return false;
  }

  const pythonExe = findPython();
  console.log(`   Using Python: ${pythonExe}`);
  console.log(`   Backend Directory: ${backendDir}`);

  // Spawn Python backend
  if (process.platform === 'win32') {
    // On Windows, use start command so it runs independently in its own process
    const child = spawn('cmd.exe', ['/c', 'start', 'ExamEase Backend (Port 5000)', pythonExe, 'run.py'], {
      cwd: backendDir,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  } else {
    const child = spawn(pythonExe, ['run.py'], {
      cwd: backendDir,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  }

  // Poll until healthy (up to 10 seconds)
  const maxAttempts = 25;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise(r => setTimeout(r, 400));
    const healthy = await checkHealth(800);
    if (healthy) {
      console.log(`\x1b[32m✔ [ExamEase] Flask Backend started successfully!\x1b[0m`);
      console.log(`   API Endpoint: http://localhost:${PORT}/api`);
      console.log(`   Mobile LAN:   http://${lanIp}:${PORT}/api`);
      console.log(`   Android Emu:  http://10.0.2.2:${PORT}/api`);
      return true;
    }
  }

  console.warn(`\x1b[33m⚠ [ExamEase] Backend starting took longer than expected. Continuing startup...\x1b[0m`);
  return false;
}

if (require.main === module) {
  ensureBackend()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[ExamEase] EnsureBackend error:', err);
      process.exit(0);
    });
}

module.exports = { ensureBackend, getActiveLanIp, checkHealth };
