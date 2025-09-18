import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  correlationId?: string;
}

export class ValidationError extends Error {
  statusCode = 400;
  isOperational = true;
  
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  isOperational = true;
  
  constructor(resource: string, id?: string) {
    super(`${resource}${id ? ` with id ${id}` : ''} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  isOperational = true;
  
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  isOperational = true;
  
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  isOperational = true;
  
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const correlationId = req.headers['x-correlation-id'] as string || 'unknown';
  error.correlationId = correlationId;

  // Log error
  logger.error('Error occurred', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
    correlationId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.headers['x-user-id'],
  });

  // Don't leak error details in production for non-operational errors
  const isProduction = process.env.NODE_ENV === 'production';
  const isOperational = error.isOperational ?? false;

  let statusCode = error.statusCode || 500;
  let message = error.message;
  let details: any = undefined;

  if (!isOperational && isProduction) {
    statusCode = 500;
    message = 'Internal server error';
  } else {
    // Include additional details for development or operational errors
    if (!isProduction) {
      details = {
        stack: error.stack,
        name: error.name,
      };
    }
  }

  res.status(statusCode).json({
    error: message,
    statusCode,
    correlationId,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    ...(details && { details }),
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  const correlationId = req.headers['x-correlation-id'] as string || 'unknown';
  
  logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    correlationId,
  });

  res.status(404).json({
    error: 'Route not found',
    statusCode: 404,
    correlationId,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
  });
};