export const SERVICES = {
  USER_SERVICE: {
    url: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    prefix: '/api/users'
  },
  ORDER_SERVICE: {
    url: process.env.ORDER_SERVICE_URL || 'http://localhost:3002', 
    prefix: '/api/orders'
  },
  PRODUCT_SERVICE: {
    url: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3003',
    prefix: '/api/products'
  },
  ACCEPTANCE_SERVICE: {
    url: process.env.ACCEPTANCE_SERVICE_URL || 'http://localhost:3004',
    prefix: '/api/acceptance'
  },
  BILLING_SERVICE: {
    url: process.env.BILLING_SERVICE_URL || 'http://localhost:3005',
    prefix: '/api/billing'
  },
  NOTIFICATION_SERVICE: {
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
    prefix: '/api/notifications'
  }
} as const;

export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
export const PORT = process.env.PORT || 3000;