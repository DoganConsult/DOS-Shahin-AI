// DOS Platform — Observability Stack (PM2 ecosystem)
// Managed separately from application services to avoid conflicts.
const path = require('path');
const fs = require('fs');

const REPO_ROOT = path.resolve(__dirname, '..');
const envDir = path.join(REPO_ROOT, 'platform', 'config-center', 'env');

function parseEnvFile(filePath) {
  const env = {};
  try {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
    }
  } catch {}
  return env;
}

const obsEnv = parseEnvFile(path.join(envDir, 'observability.env'));

const GRAFANA_ADMIN_PASSWORD = obsEnv.GRAFANA_ADMIN_PASSWORD;
if (!GRAFANA_ADMIN_PASSWORD) {
  throw new Error(
    'Required variable GRAFANA_ADMIN_PASSWORD is not set in platform/config-center/env/observability.env'
  );
}

module.exports = {
  apps: [
    {
      name: 'clickhouse',
      script: '/usr/bin/clickhouse-server',
      args: `--config-file=${REPO_ROOT}/cores/preprocessed_configs/config.xml`,
      cwd: REPO_ROOT,
      interpreter: 'none',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
    {
      name: 'loki',
      script: `${REPO_ROOT}/bin/loki`,
      args: `-config.file=${REPO_ROOT}/ops/monitoring/loki.yml`,
      interpreter: 'none',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
    {
      name: 'jaeger',
      script: `${REPO_ROOT}/bin/jaeger-all-in-one`,
      args: '--collector.otlp.enabled',
      interpreter: 'none',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        SPAN_STORAGE_TYPE: 'badger',
        BADGER_EPHEMERAL: 'false',
        BADGER_DIRECTORY_VALUE: `${REPO_ROOT}/data/jaeger/data`,
        BADGER_DIRECTORY_KEY: `${REPO_ROOT}/data/jaeger/key`,
      },
    },
    {
      name: 'alertmanager',
      script: `${REPO_ROOT}/bin/alertmanager`,
      args: `--config.file=${REPO_ROOT}/ops/monitoring/alertmanager.yml --storage.path=${REPO_ROOT}/data/alertmanager`,
      interpreter: 'none',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
    {
      name: 'prometheus',
      script: `${REPO_ROOT}/bin/prometheus`,
      args: `--config.file=${REPO_ROOT}/ops/monitoring/prometheus.yml --storage.tsdb.path=${REPO_ROOT}/data/prometheus --storage.tsdb.retention.time=30d --web.enable-lifecycle --web.enable-admin-api`,
      interpreter: 'none',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
    {
      name: 'grafana',
      script: `${REPO_ROOT}/grafana-server/bin/grafana`,
      args: [
        'server',
        `--homepath=${REPO_ROOT}/grafana-server`,
        `--config=${REPO_ROOT}/grafana-server/conf/defaults.ini`,
        'cfg:server.http_port=3001',
        `cfg:paths.data=${REPO_ROOT}/data/grafana`,
        `cfg:paths.provisioning=${REPO_ROOT}/ops/monitoring/grafana/provisioning`,
        'cfg:security.admin_user=admin',
        `cfg:security.admin_password=${GRAFANA_ADMIN_PASSWORD}`,
        'cfg:users.allow_sign_up=false',
      ].join(' '),
      interpreter: 'none',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
