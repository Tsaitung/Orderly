import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

// Configure Winston logger
const transports: winston.transport[] = [];

// Always add console transport for Cloud Run (logs go to Google Cloud Logging)
transports.push(new winston.transports.Console({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production' 
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
  )
}));

// Only add file transports in development (Cloud Run is stateless)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.File({ filename: '/app/logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: '/app/logs/combined.log' })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'admin-service' },
  transports,
});

// Express middleware for logging requests
export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      contentLength: res.get('Content-Length'),
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      duration: `${duration}ms`,
    };

    if (res.statusCode >= 400) {
      logger.error('HTTP Request Error', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};

export default logger;