#!/bin/bash

# PlayWin Backend Startup Script with Auto-Restart Monitoring
# This script starts the server with PM2 and includes health monitoring

echo "🚀 Starting PlayWin Backend with Auto-Restart Monitoring..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Installing PM2..."
    npm install -g pm2
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Stop any existing PM2 processes
echo "🛑 Stopping existing PM2 processes..."
pm2 stop all
pm2 delete all

# Start the server with monitoring
echo "🎮 Starting server with PM2 monitoring..."
pm2 start ecosystem-with-monitor.config.js --env production

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Setup PM2 startup script (run this once)
echo "⚙️  Setting up PM2 startup script..."
pm2 startup

# Show status
echo "📊 PM2 Status:"
pm2 status

# Show logs
echo "📋 Recent logs:"
pm2 logs --lines 20

echo "✅ PlayWin Backend started with monitoring!"
echo "🔍 Monitor health at: http://localhost:4000/health"
echo "📊 Detailed health at: http://localhost:4000/health/detailed"
echo "📋 View logs with: pm2 logs"
echo "🔄 Restart with: pm2 restart all"
echo "🛑 Stop with: pm2 stop all"
