#!/usr/bin/env node

// Set timezone before any other imports
process.env.TZ = 'Asia/Kolkata';

// Import and start the server
require('./dist/server.js');
