import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import http from 'http';
import cron from 'node-cron';
import { loggerMiddleware } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import dashboardRoutes from './routes/dashboardRoutes';
import systemRoutes from './routes/systemRoutes';
import userRoutes from './routes/userRoutes';
import logger from './middleware/logger';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8008;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://orderly-prod.run.app', 'https://orderly-staging.run.app']
    : ['http://localhost:3000'],
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(loggerMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'admin-service',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    features: {
      dashboard: true,
      systemMonitoring: true,
      userManagement: true,
      realTimeUpdates: true,
      scheduling: true
    }
  });
});

// API routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/users', userRoutes);

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server });

// Store connected clients
const clients = new Set<any>();

wss.on('connection', (ws) => {
  logger.info('WebSocket client connected');
  clients.add(ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      logger.info('WebSocket message received', { data });
      
      // Handle different message types
      switch (data.type) {
        case 'subscribe':
          ws.send(JSON.stringify({
            type: 'subscription_confirmed',
            channel: data.channel,
            timestamp: new Date().toISOString()
          }));
          break;
        default:
          logger.warn('Unknown WebSocket message type', { type: data.type });
      }
    } catch (error) {
      logger.error('Error parsing WebSocket message', { error: (error as Error).message });
    }
  });

  ws.on('close', () => {
    logger.info('WebSocket client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error', { error: error.message });
    clients.delete(ws);
  });

  // Send initial connection success message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to Admin Service WebSocket',
    timestamp: new Date().toISOString()
  }));
});

// Broadcast function for real-time updates
export const broadcastUpdate = (channel: string, data: any) => {
  const message = JSON.stringify({
    type: 'update',
    channel,
    data,
    timestamp: new Date().toISOString()
  });

  clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
};

// Scheduled tasks for real-time data simulation
cron.schedule('*/30 * * * * *', () => {
  // Broadcast dashboard updates every 30 seconds
  const dashboardUpdate = {
    activeUsers: 890 + Math.floor(Math.random() * 20 - 10),
    apiLatency: 120 + Math.floor(Math.random() * 40 - 20),
    reconciliationQueue: Math.max(0, 25 + Math.floor(Math.random() * 10 - 5))
  };
  
  broadcastUpdate('dashboard', dashboardUpdate);
});

cron.schedule('*/15 * * * * *', () => {
  // Broadcast system health updates every 15 seconds
  const healthUpdate = {
    services: [
      {
        name: 'API Gateway',
        responseTime: 95 + Math.floor(Math.random() * 20 - 10),
        cpu: Math.max(0, Math.min(100, 25 + Math.floor(Math.random() * 10 - 5)))
      },
      {
        name: 'Product Service',
        responseTime: 298 + Math.floor(Math.random() * 40 - 20),
        cpu: Math.max(0, Math.min(100, 78 + Math.floor(Math.random() * 15 - 7)))
      }
    ]
  };
  
  broadcastUpdate('system_health', healthUpdate);
});

// Test endpoint for Hello World demo
app.get('/test', (req, res) => {
  res.json({
    message: 'Hello from Admin Service! 🛡️',
    service: 'admin-service',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    features: {
      dashboard: 'Real-time business metrics',
      monitoring: 'System health and service status',
      users: 'Comprehensive user management',
      websocket: 'Live data updates',
      security: 'Admin authentication & authorization'
    }
  });
});

// Admin info endpoint
app.get('/admin/info', (req, res) => {
  res.json({
    service: 'admin-service',
    description: 'Platform Management and Monitoring Service',
    version: '1.0.0',
    endpoints: {
      dashboard: '/api/dashboard/*',
      system: '/api/system/*',
      users: '/api/users/*',
      websocket: 'ws://localhost:8008'
    },
    capabilities: [
      'Real-time dashboard metrics',
      'System health monitoring',
      'User management and analytics',
      'Live WebSocket updates',
      'Scheduled data processing',
      'Admin authentication'
    ],
    timestamp: new Date().toISOString()
  });
});

// Fallback route for undefined endpoints
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    service: 'admin-service',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /health',
      'GET /test',
      'GET /admin/info',
      'GET /api/dashboard/data',
      'GET /api/system/health',
      'GET /api/users'
    ]
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  console.log(`🛡️  Admin Service running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`);
  console.log(`📊 Admin info: http://localhost:${PORT}/admin/info`);
  console.log(`🌐 WebSocket: ws://localhost:${PORT}`);
  
  logger.info('Admin Service started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    features: ['Dashboard', 'System Monitoring', 'User Management', 'WebSocket', 'Scheduling']
  });
});

export default app;