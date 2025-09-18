import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Validation error
  if (err.name === 'ValidationError') {
    const message = 'Validation Error';
    error = { ...error, message, statusCode: 400 };
  }

  // File upload error
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = { ...error, message, statusCode: 413 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    service: 'acceptance-service',
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method,
  });
};