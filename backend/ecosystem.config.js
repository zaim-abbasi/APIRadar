module.exports = {
  apps: [
    {
      name: 'api-radar-backend',
      script: 'dist/server.js',
      cwd: '/home/ubuntu/api-radar/apiradar-code/backend', 
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      kill_timeout: 3000,
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};