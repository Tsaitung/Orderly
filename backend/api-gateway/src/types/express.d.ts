// Extend Express Request interface with custom properties
declare namespace Express {
  interface Request {
    correlationId: string;
    user?: {
      id: string;
      email: string;
      role: string;
      subscription: string;
      permissions: string[];
      companyId?: string;
      sessionId: string;
    };
    session?: {
      id: string;
      userId: string;
      createdAt: Date;
      expiresAt: Date;
    };
    context?: {
      correlationId: string;
      method: string;
      url: string;
      userAgent?: string;
      ip: string;
      userId?: string;
      sessionId?: string;
      apiKey?: string;
      startTime: number;
      timestamp: string;
      targetService?: string;
      serviceCallId?: string;
      tracing?: {
        traceId: string;
        spanId: string;
        parentSpanId: string;
      };
    };
  }
}