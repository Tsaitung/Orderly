import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

// Extend Request interface to include correlation ID
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

/**
 * Correlation ID middleware
 * Ensures every request has a unique correlation ID for distributed tracing
 */
export const correlationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check if correlation ID is already provided in headers
  let correlationId = req.headers['x-correlation-id'] as string;
  
  // If not provided, generate a new one
  if (!correlationId) {
    correlationId = uuidv4();
  }

  // Attach correlation ID to request object
  req.correlationId = correlationId;

  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', correlationId);

  // Add to logger context for all subsequent log messages
  res.locals.correlationId = correlationId;

  // Continue to next middleware
  next();
};

/**
 * Request context middleware
 * Enriches request with additional context information for logging and monitoring
 */
export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Attach request context
  const requestContext = {
    correlationId: req.correlationId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    sessionId: req.session?.id,
    apiKey: req.headers['x-api-key'] ? 'present' : 'absent',
    startTime,
    timestamp: new Date().toISOString(),
  };

  // Attach context to request for later use
  req.context = requestContext;

  // Log request start
  logger.info('Request started', {
    ...requestContext,
    headers: {
      'content-type': req.get('Content-Type'),
      'accept': req.get('Accept'),
      'origin': req.get('Origin'),
      'referer': req.get('Referer'),
    },
  });

  // Track response
  const originalSend = res.send;
  res.send = function(data: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Log request completion
    logger.info('Request completed', {
      ...requestContext,
      statusCode: res.statusCode,
      duration,
      responseSize: Buffer.byteLength(data || ''),
    });

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Request ID generator for unique request identification
 */
export const generateRequestId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 9);
  return `req_${timestamp}_${randomPart}`;
};

/**
 * Service call tracer for tracking inter-service communication
 */
export const serviceCallTracer = (serviceName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Add service call information to request context
    req.context = {
      ...req.context,
      targetService: serviceName,
      serviceCallId: generateRequestId(),
    };

    logger.info(`Proxying request to ${serviceName}`, {
      correlationId: req.correlationId,
      targetService: serviceName,
      method: req.method,
      path: req.path,
      userId: req.user?.id,
    });

    // Track proxy response
    const originalWrite = res.write;
    const originalEnd = res.end;
    let responseBody = '';

    res.write = function(chunk: any, ...args: any[]) {
      if (chunk) {
        responseBody += chunk.toString();
      }
      return originalWrite.apply(this, [chunk, ...args]);
    };

    res.end = function(chunk: any, ...args: any[]) {
      if (chunk) {
        responseBody += chunk.toString();
      }

      // Log service response
      logger.info(`Received response from ${serviceName}`, {
        correlationId: req.correlationId,
        targetService: serviceName,
        statusCode: res.statusCode,
        responseSize: Buffer.byteLength(responseBody),
        duration: Date.now() - req.context.startTime,
      });

      return originalEnd.apply(this, [chunk, ...args]);
    };

    next();
  };
};

/**
 * Error correlation middleware
 * Ensures errors are properly correlated and tracked
 */
export const errorCorrelationMiddleware = (error: Error, req: Request, res: Response, next: NextFunction) => {
  // Add correlation information to error
  const enrichedError = {
    ...error,
    correlationId: req.correlationId,
    requestId: req.context?.serviceCallId,
    userId: req.user?.id,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  };

  // Log error with correlation info
  logger.error('Request error occurred', {
    error: error.message,
    stack: error.stack,
    correlationId: req.correlationId,
    requestContext: req.context,
  });

  // Pass enriched error to error handler
  next(enrichedError);
};

/**
 * Distributed tracing headers
 * Adds tracing headers for OpenTelemetry compatibility
 */
export const tracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Generate trace ID if not present
  let traceId = req.headers['x-trace-id'] as string;
  if (!traceId) {
    traceId = uuidv4().replace(/-/g, '');
  }

  // Generate span ID for this request
  const spanId = Math.random().toString(16).substring(2, 18);

  // Add tracing headers
  req.headers['x-trace-id'] = traceId;
  req.headers['x-span-id'] = spanId;
  req.headers['x-parent-span-id'] = req.headers['x-span-id'] as string || '0';

  // Add to response headers
  res.setHeader('X-Trace-ID', traceId);
  res.setHeader('X-Span-ID', spanId);

  // Attach to request context
  req.context = {
    ...req.context,
    tracing: {
      traceId,
      spanId,
      parentSpanId: req.headers['x-parent-span-id'] as string,
    },
  };

  next();
};

/**
 * Request metrics collection
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6; // Convert to milliseconds

    // Collect metrics (would typically send to monitoring system)
    const metrics = {
      method: req.method,
      route: req.route?.path || req.path,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
      userId: req.user?.id,
    };

    // Log metrics for now (would send to monitoring system like Prometheus)
    logger.info('Request metrics', metrics);

    // Here you would typically send metrics to your monitoring system:
    // prometheus.recordHttpRequest(metrics);
    // datadog.increment('api.requests', 1, [`status:${res.statusCode}`, `method:${req.method}`]);
  });

  next();
};