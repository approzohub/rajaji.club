#!/usr/bin/env node

/**
 * Server Health Monitor Script
 * Monitors server health and triggers PM2 restart if needed
 */

const http = require('http');
const { exec } = require('child_process');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const MAX_FAILURES = 3; // Restart after 3 consecutive failures
const RESTART_DELAY = 5000; // 5 seconds delay before restart

let failureCount = 0;
let isRestarting = false;

console.log(`🔍 Starting server health monitor for ${SERVER_URL}`);
console.log(`⏰ Health check interval: ${HEALTH_CHECK_INTERVAL / 1000} seconds`);
console.log(`🚨 Max failures before restart: ${MAX_FAILURES}`);

/**
 * Check server health
 */
async function checkServerHealth() {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const req = http.get(`${SERVER_URL}/health`, (res) => {
      const responseTime = Date.now() - startTime;
      
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const healthData = JSON.parse(data);
            resolve({
              success: true,
              statusCode: res.statusCode,
              responseTime,
              data: healthData
            });
          } catch (error) {
            resolve({
              success: false,
              error: 'Invalid JSON response',
              statusCode: res.statusCode,
              responseTime
            });
          }
        });
      } else {
        resolve({
          success: false,
          error: `HTTP ${res.statusCode}`,
          statusCode: res.statusCode,
          responseTime
        });
      }
    });

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      resolve({
        success: false,
        error: error.message,
        responseTime
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      const responseTime = Date.now() - startTime;
      resolve({
        success: false,
        error: 'Request timeout',
        responseTime
      });
    });
  });
}

/**
 * Restart server using PM2
 */
async function restartServer() {
  if (isRestarting) {
    console.log('⏳ Server restart already in progress...');
    return;
  }

  isRestarting = true;
  console.log('🔄 Restarting server with PM2...');

  return new Promise((resolve) => {
    exec('pm2 restart playwin-backend', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Failed to restart server:', error.message);
        console.error('stderr:', stderr);
      } else {
        console.log('✅ Server restarted successfully');
        console.log('stdout:', stdout);
      }
      
      isRestarting = false;
      failureCount = 0; // Reset failure count after restart
      resolve();
    });
  });
}

/**
 * Main monitoring loop
 */
async function monitorLoop() {
  try {
    const healthCheck = await checkServerHealth();
    const timestamp = new Date().toISOString();
    
    if (healthCheck.success) {
      if (failureCount > 0) {
        console.log(`✅ Server recovered after ${failureCount} failures`);
        failureCount = 0;
      }
      
      console.log(`✅ Health check passed - ${healthCheck.responseTime}ms - ${timestamp}`);
      
      // Log memory usage if available
      if (healthCheck.data && healthCheck.data.memory) {
        const memMB = Math.round(healthCheck.data.memory.heapUsed / 1024 / 1024);
        console.log(`📊 Memory usage: ${memMB}MB`);
      }
    } else {
      failureCount++;
      console.error(`❌ Health check failed (${failureCount}/${MAX_FAILURES}): ${healthCheck.error} - ${timestamp}`);
      
      if (failureCount >= MAX_FAILURES) {
        console.error(`🚨 Server has failed ${MAX_FAILURES} consecutive health checks!`);
        console.log(`⏳ Waiting ${RESTART_DELAY / 1000} seconds before restart...`);
        
        setTimeout(async () => {
          await restartServer();
        }, RESTART_DELAY);
      }
    }
  } catch (error) {
    console.error('❌ Monitor loop error:', error.message);
    failureCount++;
  }
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down health monitor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down health monitor...');
  process.exit(0);
});

// Start monitoring
console.log('🚀 Health monitor started');
setInterval(monitorLoop, HEALTH_CHECK_INTERVAL);

// Initial health check
monitorLoop();
