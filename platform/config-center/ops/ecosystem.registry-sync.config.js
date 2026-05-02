const path = require('path');
const fs = require('fs');
const repoRoot = path.join(__dirname, '..');
const pm2LogDir = process.env.DOS_PM2_LOG_ROOT || path.join(repoRoot, 'logs', 'pm2');
try { fs.mkdirSync(pm2LogDir, { recursive: true }); } catch {}

function parseEnvFile(filePath) {
  const env = {};
  try {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq > 0) env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
    }
  } catch {}
  return env;
}

const shared = parseEnvFile(path.join(__dirname, 'env', '.env.shared'));
const authEnv = parseEnvFile(path.join(__dirname, 'env', 'auth-service.env'));
const mergedEnv = { ...shared, ...authEnv, NODE_ENV: shared.NODE_ENV || 'production' };

module.exports = {
  apps: [
    {
      name: 'registry-sync',
      script: path.join(repoRoot, 'scripts', 'sync-registry-to-keycloak.mjs'),
      args: ['--interval', '5000', '--batch', '50'],
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      wait_ready: false,
      listen_timeout: 10000,
      kill_timeout: 15000,
      max_memory_restart: '512M',
      error_file: path.join(pm2LogDir, 'registry-sync-error.log'),
      out_file: path.join(pm2LogDir, 'registry-sync-out.log'),
      merge_logs: true,
      env: mergedEnv,
    },
    {
      name: 'keycloak-event-bridge',
      script: path.join(repoRoot, 'scripts', 'bridge-keycloak-events.mjs'),
      args: ['--interval', '5000'],
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      wait_ready: false,
      listen_timeout: 10000,
      kill_timeout: 15000,
      max_memory_restart: '256M',
      error_file: path.join(pm2LogDir, 'keycloak-event-bridge-error.log'),
      out_file: path.join(pm2LogDir, 'keycloak-event-bridge-out.log'),
      merge_logs: true,
      env: mergedEnv,
    },
  ],
};
