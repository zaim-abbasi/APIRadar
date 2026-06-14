module.exports = {
  apps: [
    {
      name: 'api-radar-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      kill_timeout: 3000,
      wait_ready: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        MONGODB_URI: 'mongodb://localhost:27017/apiradar'
      }
    }
  ]
};
