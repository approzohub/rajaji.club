import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/users.routes';
import walletRoutes from './routes/wallet.routes';
import withdrawalRoutes from './routes/withdrawal.routes';
import gamesRoutes from './routes/games.routes';
import bidsRoutes from './routes/bids.routes';
import notificationsRoutes from './routes/notifications.routes';
import cmsRoutes from './routes/cms.routes';
import bannersRoutes from './routes/banners.routes';
import dashboardRoutes from './routes/dashboard.routes';
import commissionRoutes from './routes/commission.routes';
import paymentRoutes from './routes/payment.routes';
import appSettingsRoutes from './routes/app-settings.routes';
import imagesRoutes from './routes/images.routes';
import gameRulesRoutes from './routes/game-rules.routes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

// Load environment variables
dotenv.config();

const app = express();

app.use(express.json());
app.use(cors({
  origin: [
    process.env.DASHBOARD_URL || "",
    process.env.RAJAJI_CLIENT_URL || "",
    process.env.RAJAJI_CLIENT_URL1 || "",
    "https://rajaji-three.vercel.app",
    "https://rajaji.club",
    "https://admin.rajaji.club",
    "http://localhost:5001",
    "http://localhost:3000"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));
// Temporarily disable helmet for CORS testing
// app.use(helmet({
//   crossOriginResourcePolicy: { policy: "cross-origin" },
//   crossOriginEmbedderPolicy: false
// }));



app.get('/', (_req, res) => res.json({ status: 'ok' }));

// Health check endpoint for PM2 monitoring
app.get('/health', (_req, res) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid,
    environment: process.env.NODE_ENV,
    timezone: process.env.TZ
  };
  
  res.status(200).json(healthCheck);
});

// Detailed health check for monitoring
app.get('/health/detailed', async (_req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
      environment: process.env.NODE_ENV,
      timezone: process.env.TZ,
      database: {
        status: dbStatus,
        readyState: mongoose.connection.readyState
      },
      gameAutomation: {
        status: 'active', // This would be checked from game automation
        lastCheck: new Date().toISOString()
      }
    };
    
    res.status(200).json(healthCheck);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/bids', bidsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/banners', bannersRoutes);
app.use('/api/wallet', withdrawalRoutes);
app.use('/api/admin', dashboardRoutes);
app.use('/api/commission', commissionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/app-settings', appSettingsRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/game-rules', gameRulesRoutes);

// Serve uploaded images statically
app.use('/uploads', express.static('uploads'));

app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Global error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🚨 Global Error Handler:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Log critical errors that might require server restart
  if (err.code === 'ECONNREFUSED' || 
      err.code === 'ENOTFOUND' || 
      err.code === 'ETIMEDOUT' ||
      err.message.includes('MongoDB') ||
      err.message.includes('database') ||
      err.message.includes('connection')) {
    console.error('🚨 CRITICAL ERROR - Database/Connection Issue:', err);
  }

  // Don't send error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal Server Error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('🚨 Unhandled Promise Rejection:', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    timestamp: new Date().toISOString()
  });
  
  // Log critical unhandled rejections
  if (reason?.message?.includes('MongoDB') || 
      reason?.message?.includes('database') ||
      reason?.message?.includes('connection')) {
    console.error('🚨 CRITICAL UNHANDLED REJECTION - Database Issue:', reason);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('🚨 Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Log critical uncaught exceptions
  if (error.message.includes('MongoDB') || 
      error.message.includes('database') ||
      error.message.includes('connection')) {
    console.error('🚨 CRITICAL UNCAUGHT EXCEPTION - Database Issue:', error);
  }
  
  // Graceful shutdown
  process.exit(1);
});

export default app; 