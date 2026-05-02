module.exports = {
  apps: [{
    name: 'auth-service',
    script: 'dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 4001,
      LOG_LEVEL: 'info',
    },
    node_args: '--max-old-space-size=768',
    max_memory_restart: '1G',
    wait_ready: true,
    listen_timeout: 30000,
    kill_timeout: 30000,
    autorestart: true,
    watch: false,
    merge_logs: true,
    error_file: '/var/log/dos-platform/auth-service-error.log',
    out_file: '/var/log/dos-platform/auth-service-out.log',
  }],
};
