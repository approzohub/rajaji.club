module.exports = {
  apps: [
    {
      name: 'PlayInWin',
      script: 'npm',
      args: 'start',
      cwd: '/home/1471034.cloudwaysapps.com/yaeydqfjnw/public_html', // <-- root of Next.js project
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      
      // Restart policy
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Monitoring
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.next'],
      
      // Performance
      max_memory_restart: '1G',
      
      // Error handling
      autorestart: true,
      exp_backoff_restart_delay: 100
    }
  ]
};
