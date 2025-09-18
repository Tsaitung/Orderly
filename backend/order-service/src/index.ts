import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { loggerMiddleware, logger } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import orderRoutes from './routes/orderRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8002;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://orderly-prod.run.app',
        'https://orderly-staging.run.app',
        'https://api.orderly.com',
        process.env.API_GATEWAY_URL || 'http://localhost:8000'
      ]
    : [
        'http://localhost:3000',
        'http://localhost:8000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8000'
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-API-Key',
    'X-Correlation-ID',
    'X-User-ID',
    'X-User-Role',
    'X-User-Permissions'
  ],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 2000, // Limit each IP
  message: {
    error: 'Too many requests from this IP',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(loggerMiddleware);

// Health check endpoint (before routes)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'order-service',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    correlationId: req.headers['x-correlation-id'],
  });
});

// Readiness probe (Kubernetes)
app.get('/ready', (req, res) => {
  // Add any dependency checks here (database, external services, etc.)
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    correlationId: req.headers['x-correlation-id'],
  });
});

// Liveness probe (Kubernetes)
app.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    correlationId: req.headers['x-correlation-id'],
  });
});

// API routes
app.use('/api/orders', orderRoutes);

// Fallback for all other routes under /api/orders
app.use('/api/orders/*', notFoundHandler);

// 404 handler for other routes
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Order Service running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
  });
  
  console.log(`🚀 Order Service running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 API Documentation: http://localhost:${PORT}/api/orders`);
});

export default app;