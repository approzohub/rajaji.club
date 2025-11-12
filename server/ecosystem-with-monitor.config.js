module.exports = {
  apps: [
    {
      name: 'playwin-backend',
      script: './start-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
        BIDDING_DURATION: 25,
        BREAK_DURATION: 5,
        GAME_CREATION_INTERVAL: 30,
        TESTING_MODE: false,
        TZ: 'Asia/Kolkata'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        BIDDING_DURATION: 25,
        BREAK_DURATION: 5,
        GAME_CREATION_INTERVAL: 30,
        TESTING_MODE: false,
        TZ: 'Asia/Kolkata'
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 4000,
        BIDDING_DURATION: 25,
        BREAK_DURATION: 5,
        GAME_CREATION_INTERVAL: 30,
        TESTING_MODE: false,
        TZ: 'Asia/Kolkata'
      },
      
      // Enhanced restart configuration
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 15,
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      log_type: 'json',
      merge_logs: true,
      
      // Process management
      autorestart: true,
      cron_restart: '0 2 * * *', // Daily restart at 2 AM
      kill_timeout: 5000,
      listen_timeout: 8000,
      shutdown_with_message: true,
      
      // Node.js optimizations
      node_args: '--max-old-space-size=1024 --unhandled-rejections=strict',
      
      // Environment
      env_file: '.env',
      
      // Health monitoring
      health_check_grace_period: 3000,
      monitoring: true,
      stop_exit_codes: [0]
    },
    {
      name: 'playwin-monitor',
      script: './monitor-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        SERVER_URL: 'http://localhost:4000'
      },
      env_production: {
        NODE_ENV: 'production',
        SERVER_URL: 'http://localhost:4000'
      },
      
      // Monitor-specific settings
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      
      // Logging
      log_file: './logs/monitor.log',
      out_file: './logs/monitor-out.log',
      error_file: './logs/monitor-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Process management
      kill_timeout: 3000,
      shutdown_with_message: true,
      
      // Environment
      env_file: '.env'
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/playwin-backend.git',
      path: '/var/www/playwin-backend',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem-with-monitor.config.js --env production',
      'pre-setup': ''
    }
  }
};
