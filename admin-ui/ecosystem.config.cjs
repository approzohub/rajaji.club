module.exports = {
  apps: [
    {
      name: 'admin-dashboard',
      script: 'node_modules/.bin/serve',
      args: 'dist -p 3000 --single',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
}; 