/// <reference path="./types/express.d.ts" />
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import { requestLoggingMiddleware, errorLoggingMiddleware } from './middleware/logging';
import { tracingMiddleware, createServiceCall, createTracingRoutes, addTraceTag } from './middleware/tracing';
import { prometheusMiddleware, createPrometheusEndpoint, businessMetrics, getMetricsSummary } from './middleware/prometheus-simple';
import { initializeSimpleAPM, simpleAPMMiddleware, getSimpleAPM, simpleAPMMetrics } from './middleware/apm-simple';
import { businessMetricsMiddleware, businessMetricsHelper } from './middleware/business-metrics';
import { errorHandler } from './middleware/errorHandler';
import { 
  authMiddleware, 
  requireRole, 
  requirePermission,
  optionalAuth 
} from './middleware/auth-simple';
import { 
  simpleRateLimit,
  circuitBreaker,
  rateLimiterHealthCheck,
  correlationMiddleware, 
  requestContextMiddleware,
  serviceCallTracer,
  metricsMiddleware,
  securityHeadersMiddleware
} from './middleware/simple-middleware';
import { initializeRedis } from './config/redis';
import { 
  apiCache, 
  sessionCache, 
  cacheInvalidation, 
  clearCache,
  cacheHealthCheck 
} from './middleware/cache';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Essential middleware - order is important
app.use(helmet()); // Security headers
app.use(compression()); // Response compression

// Request correlation and context (must be early in pipeline)
app.use(correlationMiddleware);
app.use(requestContextMiddleware);

// Security headers
app.use(securityHeadersMiddleware);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://orderly-prod.run.app', 
        'https://orderly-staging.run.app',
        'https://api.orderly.com'
      ]
    : [
        'http://localhost:3000', 
        'http://localhost:3001',
        'http://127.0.0.1:3000'
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-API-Key',
    'X-Correlation-ID',
    'X-Trace-ID',
    'X-Span-ID'
  ],
  exposedHeaders: [
    'X-Correlation-ID',
    'X-Trace-ID',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
  ]
}));

// Rate limiting
app.use(simpleRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize Redis for caching
initializeRedis().catch(error => {
  console.error('Failed to initialize Redis cache', { error: error instanceof Error ? error.message : error });
});

// Initialize Simple APM monitoring
const apm = initializeSimpleAPM();
console.log('🔍 Simple APM monitoring initialized');

// Cache middleware
app.use(sessionCache());
app.use(clearCache());
app.use(cacheInvalidation());
app.use('/api/products', apiCache({ ttl: 30 * 60 })); // 30 minutes for products
app.use('/api/notifications', apiCache({ ttl: 5 * 60 })); // 5 minutes for notifications

// Distributed tracing middleware
app.use(tracingMiddleware('api-gateway'));

// Simple APM monitoring middleware
app.use(simpleAPMMiddleware('api-gateway'));

// Business metrics middleware
app.use(businessMetricsMiddleware());

// Prometheus metrics middleware
app.use(prometheusMiddleware('api-gateway'));

// Structured logging middleware
app.use(requestLoggingMiddleware('api-gateway'));

// Metrics middleware
app.use(metricsMiddleware);

// Tracing API endpoints
app.use('/api/tracing', createTracingRoutes());

// Prometheus metrics endpoint
app.get('/metrics', createPrometheusEndpoint());

// Simple APM monitoring endpoints
app.get('/apm/status', (req, res) => {
  const apmInstance = getSimpleAPM();
  if (!apmInstance) {
    return res.status(503).json({ 
      error: 'Simple APM not initialized',
      timestamp: new Date().toISOString(),
    });
  }

  return res.json({
    ...apmInstance.getStatus(),
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId,
  });
});

app.get('/apm/health', (req, res) => {
  const apmInstance = getSimpleAPM();
  const status = apmInstance ? 'healthy' : 'unhealthy';
  const statusCode = apmInstance ? 200 : 503;

  return res.status(statusCode).json({
    status,
    apm: apmInstance?.getStatus() || null,
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId,
  });
});

// Business metrics endpoints
app.get('/metrics/business', (req, res) => {
  return res.json({
    ...businessMetricsHelper.getSummary(),
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId,
  });
});

app.get('/metrics/business/health', (req, res) => {
  const summary = businessMetricsHelper.getSummary();
  const isHealthy = summary.system.avgResponseTime < 1000 && summary.orders.total > 0;

  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    business: summary,
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId,
  });
});

// Demo endpoints for testing business metrics
app.post('/demo/order', (req, res) => {
  const orderId = `order-${Date.now()}`;
  
  // Record demo order
  businessMetricsHelper.recordOrder({
    orderId,
    restaurantId: req.body.restaurantId || 'restaurant-demo',
    supplierId: req.body.supplierId || 'supplier-demo',
    orderValue: req.body.total || Math.floor(Math.random() * 5000) + 500,
    itemCount: req.body.items?.length || Math.floor(Math.random() * 10) + 1,
    orderType: req.body.type || 'standard',
    status: 'created',
    createdAt: Date.now(),
  });

  // Simulate payment
  setTimeout(() => {
    businessMetricsHelper.recordPayment(
      `txn-${Date.now()}`,
      orderId,
      req.body.total || Math.floor(Math.random() * 5000) + 500,
      'credit_card',
      'completed'
    );
  }, 1000);

  return res.json({
    success: true,
    orderId,
    message: 'Demo order created and metrics recorded',
    timestamp: new Date().toISOString(),
  });
});

app.post('/demo/delivery', (req, res) => {
  const supplierId = req.body.supplierId || 'supplier-demo';
  const restaurantId = req.body.restaurantId || 'restaurant-demo';
  const deliveryTime = req.body.deliveryTime || Math.floor(Math.random() * 120) + 30; // 30-150 minutes
  const onTime = deliveryTime <= 90; // Consider on-time if <= 90 minutes

  businessMetricsHelper.recordDelivery(supplierId, restaurantId, deliveryTime * 60 * 1000, onTime);

  return res.json({
    success: true,
    deliveryTime,
    onTime,
    message: 'Demo delivery recorded',
    timestamp: new Date().toISOString(),
  });
});

// Enhanced health check endpoints
app.get('/health', async (req, res) => {
  const apmInstance = getSimpleAPM();
  const businessSummary = businessMetricsHelper.getSummary();
  
  const healthStatus = {
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    correlationId: req.correlationId,
    traceId: req.tracing?.traceId,
    spanId: req.tracing?.spanId,
    metrics: getMetricsSummary(),
    apm: apmInstance?.getStatus() || { status: 'not_initialized' },
    business: businessSummary,
  };

  return res.json(healthStatus);
});

// Detailed health check with dependencies
app.get('/health/detailed', async (req, res) => {
  const healthChecks = {
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
    version: process.env.APP_VERSION || '1.0.0',
    correlationId: req.correlationId,
    status: 'healthy',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    
    // System metrics
    system: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
    },

    // Dependencies health
    dependencies: {
      rateLimiter: {
        name: 'Redis Rate Limiter',
        status: await rateLimiterHealthCheck() ? 'healthy' : 'unhealthy',
        lastCheck: new Date().toISOString(),
      },
      cache: await cacheHealthCheck(),
    },

    // Service endpoints
    services: Object.entries(services).reduce((acc, [name, url]) => {
      acc[name] = {
        url,
        status: 'unknown', // Would be checked in real implementation
        lastCheck: new Date().toISOString(),
      };
      return acc;
    }, {} as any),
  };

  // Determine overall health status
  const rateLimiterHealthy = await rateLimiterHealthCheck();
  const cacheHealth = await cacheHealthCheck();
  
  if (!rateLimiterHealthy || cacheHealth.status !== 'healthy') {
    healthChecks.status = 'degraded';
  }

  const statusCode = healthChecks.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthChecks);
});

// Readiness probe (Kubernetes)
app.get('/ready', async (req, res) => {
  try {
    // Check critical dependencies
    const rateLimiterReady = await rateLimiterHealthCheck();
    
    if (rateLimiterReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        reason: 'Rate limiter unavailable',
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
    });
  }
});

// Liveness probe (Kubernetes)
app.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId,
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

// Public routes (no authentication required)
app.use('/api/products/public', optionalAuth);
app.use('/api/users/register', optionalAuth);
app.use('/api/users/login', optionalAuth);

// Protected routes with authentication
app.use('/api/users/profile', authMiddleware);
app.use('/api/users/settings', authMiddleware);
app.use('/api/orders', authMiddleware, requirePermission(['orders:read', 'orders:create']));
app.use('/api/products/admin', authMiddleware, requireRole(['admin', 'supplier']));
app.use('/api/acceptance', authMiddleware, requirePermission(['acceptance:read', 'acceptance:create']));
app.use('/api/billing', authMiddleware, requirePermission(['billing:read', 'billing:create']));
app.use('/api/notifications', authMiddleware);

// Admin-only routes
app.use('/api/analytics', authMiddleware, requireRole('admin'));
app.use('/api/admin', authMiddleware, requireRole('admin'));

// Proxy middleware for microservices with circuit breakers and enhanced error handling
app.use('/api/users', 
  circuitBreaker('user-service'),
  serviceCallTracer('user-service'),
  createProxyMiddleware({
    target: services.user,
    changeOrigin: true,
    timeout: 30000, // 30 second timeout
    pathRewrite: {
      '^/api/users': '',
    },
    onProxyReq: (proxyReq, req) => {
      // Forward correlation headers
      if (req.correlationId) {
        proxyReq.setHeader('X-Correlation-ID', req.correlationId);
      }
      // Forward tracing headers
      if (req.tracing) {
        proxyReq.setHeader('X-Trace-ID', req.tracing.traceId);
        proxyReq.setHeader('X-Span-ID', req.tracing.spanId);
        if (req.tracing.parentSpanId) {
          proxyReq.setHeader('X-Parent-Span-ID', req.tracing.parentSpanId);
        }
      }
      // Forward user context
      if (req.user) {
        proxyReq.setHeader('X-User-ID', req.user.id);
        proxyReq.setHeader('X-User-Role', req.user.role);
        proxyReq.setHeader('X-User-Permissions', JSON.stringify(req.user.permissions));
      }
    },
    onError: (err, req, res) => {
      if (req.logger) {
        req.logger.error('User service proxy error', req, err, {
          correlationId: req.correlationId,
          path: req.path,
          method: req.method,
        });
      }
      
      if (!res.headersSent) {
        res.status(503).json({ 
          error: 'User service temporarily unavailable',
          correlationId: req.correlationId,
          retryAfter: 30
        });
      }
    },
  })
);

app.use('/api/orders', createProxyMiddleware({
  target: services.order,
  changeOrigin: true,
  pathRewrite: {
    '^/api/orders': '',
  },
  onError: (err, req, res) => {
    if (req.logger) {
      req.logger.error('Order service proxy error', req, err);
    }
    if (!res.headersSent) {
      res.status(503).json({ error: 'Order service unavailable' });
    }
  },
}));

app.use('/api/products', createProxyMiddleware({
  target: services.product,
  changeOrigin: true,
  pathRewrite: {
    '^/api/products': '',
  },
  onError: (err, req, res) => {
    if (req.logger) {
      req.logger.error('Product service proxy error', req, err);
    }
    if (!res.headersSent) {
      res.status(503).json({ error: 'Product service unavailable' });
    }
  },
}));

app.use('/api/acceptance', createProxyMiddleware({
  target: services.acceptance,
  changeOrigin: true,
  pathRewrite: {
    '^/api/acceptance': '',
  },
  onError: (err, req, res) => {
    if (req.logger) {
      req.logger.error('Acceptance service proxy error', req, err);
    }
    if (!res.headersSent) {
      res.status(503).json({ error: 'Acceptance service unavailable' });
    }
  },
}));

app.use('/api/billing', createProxyMiddleware({
  target: services.billing,
  changeOrigin: true,
  pathRewrite: {
    '^/api/billing': '',
  },
  onError: (err, req, res) => {
    if (req.logger) {
      req.logger.error('Billing service proxy error', req, err);
    }
    if (!res.headersSent) {
      res.status(503).json({ error: 'Billing service unavailable' });
    }
  },
}));

app.use('/api/notifications', createProxyMiddleware({
  target: services.notification,
  changeOrigin: true,
  pathRewrite: {
    '^/api/notifications': '',
  },
  onError: (err, req, res) => {
    if (req.logger) {
      req.logger.error('Notification service proxy error', req, err);
    }
    if (!res.headersSent) {
      res.status(503).json({ error: 'Notification service unavailable' });
    }
  },
}));

app.use('/api/analytics', createProxyMiddleware({
  target: services.analytics,
  changeOrigin: true,
  pathRewrite: {
    '^/api/analytics': '',
  },
  onError: (err, req, res) => {
    if (req.logger) {
      req.logger.error('Analytics service proxy error', req, err);
    }
    if (!res.headersSent) {
      res.status(503).json({ error: 'Analytics service unavailable' });
    }
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

// Error logging middleware
app.use(errorLoggingMiddleware('api-gateway'));

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