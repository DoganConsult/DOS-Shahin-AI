module.exports = {
  apps: [{
    name: 'workflow-service',
    script: 'dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 4004,
      LOG_LEVEL: 'info',
      RLS_ENABLED: 'true',
    },
    node_args: '--max-old-space-size=768',
    max_memory_restart: '1G',
    wait_ready: true,
    listen_timeout: 30000,
    kill_timeout: 30000,
    autorestart: true,
    watch: false,
    merge_logs: true,
    error_file: '/var/log/dos-platform/workflow-service-error.log',
    out_file: '/var/log/dos-platform/workflow-service-out.log',
  }],
};
