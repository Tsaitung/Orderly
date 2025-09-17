import { createProxyMiddleware } from 'http-proxy-middleware';
import { SERVICES } from '../config/services';

export const createServiceProxy = (serviceName: keyof typeof SERVICES) => {
  const service = SERVICES[serviceName];
  
  return createProxyMiddleware({
    target: service.url,
    changeOrigin: true,
    pathRewrite: {
      [`^${service.prefix}`]: ''
    },
    onError: (err, req, res) => {
      console.error(`Proxy error for ${serviceName}:`, err);
      res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable'
      });
    },
    onProxyReq: (proxyReq, req, res) => {
      // Forward user info from auth middleware
      if ((req as any).user) {
        proxyReq.setHeader('X-User-ID', (req as any).user.id);
        proxyReq.setHeader('X-User-Role', (req as any).user.role);
        proxyReq.setHeader('X-Organization-ID', (req as any).user.organizationId);
      }
    }
  });
};