module.exports = {
  apps: [
    {
      name: 'playwin-backend',
      script: './start-server.js',
      instances: 1, // Use only 1 instance to prevent race conditions
      exec_mode: 'cluster',
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
      // Logging configuration
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Restart configuration - Enhanced for better error handling
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 15, // Increased for better recovery
      restart_delay: 4000, // Wait 4 seconds before restart
      
      // Watch configuration (for development)
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist', 'uploads'],
      
      // PM2 specific options - Enhanced auto-restart
      autorestart: true,
      cron_restart: '0 2 * * *', // Restart daily at 2 AM
      
      // Advanced restart conditions
      exp_backoff_restart_delay: 100, // Exponential backoff starting at 100ms
      
      // Health monitoring
      health_check_grace_period: 3000, // 3 seconds grace period for health checks
      
      // Process monitoring
      monitoring: true,
      
      // Auto-restart on specific exit codes
      stop_exit_codes: [0], // Only stop on clean exit (code 0)
      
      // Enhanced error handling
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      
      // Log rotation
      log_type: 'json',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Memory and CPU monitoring
      max_memory_restart: '1G',
      min_uptime: '10s',
      
      // Process management
      kill_timeout: 5000,
      listen_timeout: 8000,
      shutdown_with_message: true,
      
      // Node.js specific optimizations
      node_args: '--max-old-space-size=1024 --unhandled-rejections=strict',
      
      // Environment variables
      env_file: '.env',
      
      // Merge logs
      merge_logs: true,
      
      // Kill timeout
      kill_timeout: 5000,
      
      // Listen timeout
      listen_timeout: 8000,
      
      // Graceful shutdown
      shutdown_with_message: true,
      
      // Source map support
      source_map_support: true,
      
      // Node options
      node_args: '--max-old-space-size=1024'
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
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    },
    staging: {
      user: 'deploy',
      host: 'your-staging-server-ip',
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/playwin-backend.git',
      path: '/var/www/playwin-backend-staging',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': ''
    }
  }
}; 