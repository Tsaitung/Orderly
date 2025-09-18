import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import { loggerMiddleware, logger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://orderly-prod.run.app', 'https://orderly-staging.run.app']
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(loggerMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Service proxy configurations
const services = {
  user: process.env.USER_SERVICE_URL || 'http://user-service:8001',
  order: process.env.ORDER_SERVICE_URL || 'http://order-service:8002',
  product: process.env.PRODUCT_SERVICE_URL || 'http://product-service:8003',
  acceptance: process.env.ACCEPTANCE_SERVICE_URL || 'http://acceptance-service:8004',
  billing: process.env.BILLING_SERVICE_URL || 'http://billing-service:8005',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8006',
  analytics: process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:8007',
};

// Authentication middleware for protected routes
app.use('/api/users/protected', authMiddleware);
app.use('/api/orders', authMiddleware);
app.use('/api/products/admin', authMiddleware);
app.use('/api/acceptance', authMiddleware);
app.use('/api/billing', authMiddleware);
app.use('/api/analytics', authMiddleware);

// Proxy middleware for microservices
app.use('/api/users', createProxyMiddleware({
  target: services.user,
  changeOrigin: true,
  pathRewrite: {
    '^/api/users': '',
  },
  onError: (err, req, res) => {
    logger.error('User service proxy error:', err);
    res.status(503).json({ error: 'User service unavailable' });
  },
}));

app.use('/api/orders', createProxyMiddleware({
  target: services.order,
  changeOrigin: true,
  pathRewrite: {
    '^/api/orders': '',
  },
  onError: (err, req, res) => {
    logger.error('Order service proxy error:', err);
    res.status(503).json({ error: 'Order service unavailable' });
  },
}));

app.use('/api/products', createProxyMiddleware({
  target: services.product,
  changeOrigin: true,
  pathRewrite: {
    '^/api/products': '',
  },
  onError: (err, req, res) => {
    logger.error('Product service proxy error:', err);
    res.status(503).json({ error: 'Product service unavailable' });
  },
}));

app.use('/api/acceptance', createProxyMiddleware({
  target: services.acceptance,
  changeOrigin: true,
  pathRewrite: {
    '^/api/acceptance': '',
  },
  onError: (err, req, res) => {
    logger.error('Acceptance service proxy error:', err);
    res.status(503).json({ error: 'Acceptance service unavailable' });
  },
}));

app.use('/api/billing', createProxyMiddleware({
  target: services.billing,
  changeOrigin: true,
  pathRewrite: {
    '^/api/billing': '',
  },
  onError: (err, req, res) => {
    logger.error('Billing service proxy error:', err);
    res.status(503).json({ error: 'Billing service unavailable' });
  },
}));

app.use('/api/notifications', createProxyMiddleware({
  target: services.notification,
  changeOrigin: true,
  pathRewrite: {
    '^/api/notifications': '',
  },
  onError: (err, req, res) => {
    logger.error('Notification service proxy error:', err);
    res.status(503).json({ error: 'Notification service unavailable' });
  },
}));

app.use('/api/analytics', createProxyMiddleware({
  target: services.analytics,
  changeOrigin: true,
  pathRewrite: {
    '^/api/analytics': '',
  },
  onError: (err, req, res) => {
    logger.error('Analytics service proxy error:', err);
    res.status(503).json({ error: 'Analytics service unavailable' });
  },
}));

// Fallback route for undefined endpoints
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  
  // Log service configurations
  console.log('📡 Service endpoints:');
  Object.entries(services).forEach(([name, url]) => {
    console.log(`  ${name}: ${url}`);
  });
});

export default app;